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


class Migration(migrations.Migration):

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
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("name", "department"),
                name="uniq_category_name_department",
            ),
        ),
    ]
