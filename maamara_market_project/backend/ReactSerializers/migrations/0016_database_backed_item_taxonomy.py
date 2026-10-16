from django.db import migrations, models


def normalize_taxonomy_sections(apps, schema_editor):
    """Move legacy section aliases onto the canonical Organic/Inorganic sections."""
    db_alias = schema_editor.connection.alias
    Section = apps.get_model("ReactSerializers", "Section")
    Department = apps.get_model("ReactSerializers", "Department")
    Item = apps.get_model("ReactSerializers", "Item")

    organic, _ = Section.objects.using(db_alias).get_or_create(name="organic")
    inorganic, _ = Section.objects.using(db_alias).get_or_create(name="inorganic")

    # A department has one owning section. Existing section assignments take
    # precedence; unassigned departments are inferred from their existing items
    # and default safely to Inorganic when there is no evidence either way.
    for department in Department.objects.using(db_alias).all().iterator():
        if department.section_id:
            old_section = Section.objects.using(db_alias).filter(
                pk=department.section_id
            ).values_list("name", flat=True).first()
            target_section = organic if str(old_section or "").lower() == "organic" else inorganic
        else:
            current_item_sections = list(
                Item.objects.using(db_alias)
                .filter(department_id=department.pk, section__isnull=False)
                .values_list("section__name", flat=True)
            )
            organic_votes = sum(
                1 for value in current_item_sections
                if str(value or "").strip().lower() == "organic"
            )
            other_votes = len(current_item_sections) - organic_votes
            target_section = organic if organic_votes > other_votes else inorganic

        if department.section_id != target_section.pk:
            Department.objects.using(db_alias).filter(pk=department.pk).update(
                section_id=target_section.pk
            )

    # Item.section must agree with its department's owning section. For legacy
    # items without a department, preserve the Organic label and normalize all
    # old general/departmental labels to Inorganic.
    for item in Item.objects.using(db_alias).all().iterator():
        if item.department_id:
            target_section_id = Department.objects.using(db_alias).filter(
                pk=item.department_id
            ).values_list("section_id", flat=True).first()
        elif item.section_id:
            old_section = Section.objects.using(db_alias).filter(
                pk=item.section_id
            ).values_list("name", flat=True).first()
            target_section_id = (
                organic.pk
                if str(old_section or "").strip().lower() == "organic"
                else inorganic.pk
            )
        else:
            target_section_id = organic.pk if item.is_organic else inorganic.pk

        if target_section_id and item.section_id != target_section_id:
            Item.objects.using(db_alias).filter(pk=item.pk).update(
                section_id=target_section_id
            )

    # All item and department references now use the canonical sections. Remove
    # unused legacy aliases so they cannot appear as duplicate filter sections.
    Section.objects.using(db_alias).exclude(
        name__in=("organic", "inorganic")
    ).delete()


def repair_item_category_links(apps, schema_editor):
    """Repair historical items whose category/subcategory parents disagree."""
    db_alias = schema_editor.connection.alias
    Department = apps.get_model("ReactSerializers", "Department")
    Category = apps.get_model("ReactSerializers", "Category")
    SubCategory = apps.get_model("ReactSerializers", "SubCategory")
    Item = apps.get_model("ReactSerializers", "Item")

    for item in Item.objects.using(db_alias).select_related(
        "department", "category", "subcategory"
    ).iterator():
        department_id = item.department_id
        category = item.category
        subcategory = item.subcategory
        updates = {}

        # Legacy data can contain a subcategory while category is blank.
        if category is None and subcategory is not None:
            category = subcategory.category
            updates["category_id"] = category.pk

        # If the item has a category but no department, infer the department
        # from the actual category relationship rather than leaving a broken tree.
        if category is not None and department_id is None:
            department_id = category.department_id
            updates["department_id"] = department_id

        # Vendor approval previously looked up categories by name only. If an
        # item's selected department disagrees with the stored category parent,
        # preserve the category label by creating/reusing it under the selected
        # department before adding the scoped uniqueness constraint.
        if (
            category is not None
            and department_id is not None
            and category.department_id != department_id
        ):
            corrected_category = Category.objects.using(db_alias).filter(
                name__iexact=category.name,
                department_id=department_id,
            ).first()
            if corrected_category is None:
                corrected_category = Category.objects.using(db_alias).create(
                    name=category.name,
                    department_id=department_id,
                )
            category = corrected_category
            updates["category_id"] = category.pk

        # Keep the item's subcategory label but place it under the resolved
        # category if its historical parent relationship was incorrect.
        if (
            subcategory is not None
            and category is not None
            and subcategory.category_id != category.pk
        ):
            corrected_subcategory = SubCategory.objects.using(db_alias).filter(
                name__iexact=subcategory.name,
                category_id=category.pk,
            ).first()
            if corrected_subcategory is None:
                corrected_subcategory = SubCategory.objects.using(db_alias).create(
                    name=subcategory.name,
                    category_id=category.pk,
                )
            updates["subcategory_id"] = corrected_subcategory.pk

        if updates:
            Item.objects.using(db_alias).filter(pk=item.pk).update(**updates)


class Migration(migrations.Migration):
    # Keep data-repair writes from sharing a transaction with later ALTER TABLE operations.
    atomic = False

    dependencies = [
        ("ReactSerializers", "0015_remove_itemview_unique_item_user_lifetime_view_and_more"),
    ]

    operations = [
        migrations.RunPython(
            normalize_taxonomy_sections,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="section",
            name="name",
            field=models.CharField(
                choices=[("organic", "Organic"), ("inorganic", "Inorganic")],
                max_length=100,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="category",
            name="name",
            field=models.CharField(max_length=50),
        ),
        migrations.RunPython(
            repair_item_category_links,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("name", "department"),
                name="uniq_category_name_department",
            ),
        ),
    ]
