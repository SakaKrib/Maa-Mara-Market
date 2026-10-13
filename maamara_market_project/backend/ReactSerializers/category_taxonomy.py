"""Shared, database-backed resolution for item taxonomy relationships.

Custom categories and subcategories are created here when an item is created,
edited, or approved. The population management command remains responsible for
the predefined taxonomy only.
"""
import html

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Category, Department, Section, SubCategory


SECTION_ALIASES = {
    "general": "inorganic",
    "departmental": "inorganic",
}
CANONICAL_SECTIONS = {"organic", "inorganic"}


def _clean_name(value):
    if isinstance(value, dict):
        value = value.get("name") or value.get("label") or ""
    elif hasattr(value, "name"):
        value = value.name
    return html.unescape(str(value or "")).strip()


def canonical_section_name(value):
    """Normalize legacy section labels to the canonical Organic/Inorganic pair."""
    name = _clean_name(value).lower()
    if not name:
        return None
    name = SECTION_ALIASES.get(name, name)
    if name not in CANONICAL_SECTIONS:
        raise ValidationError({
            "section": "Choose either the Organic or Inorganic section."
        })
    return name


@transaction.atomic
def resolve_item_taxonomy(
    *,
    section_value=None,
    department_value=None,
    category_value=None,
    subcategory_value=None,
    default_section=None,
):
    """Return canonical model relations and create missing category records.

    Departments are predefined and must already exist. Categories are scoped
    to their selected department, and subcategories are scoped to their
    selected category. Empty category/subcategory values remain empty; the
    resolver never invents names for fields the seller did not supply.
    """
    department_name = _clean_name(department_value)
    category_name = _clean_name(category_value)
    subcategory_name = _clean_name(subcategory_value)

    department = None
    if department_name:
        department = Department.objects.select_related("section").filter(
            name__iexact=department_name
        ).first()
        if department is None:
            raise ValidationError({
                "department": (
                    f"Department '{department_name}' does not exist in the "
                    "marketplace taxonomy. Choose an available department."
                )
            })

    if category_name and not department:
        raise ValidationError({
            "department": "Choose a department before adding a category."
        })
    if subcategory_name and not category_name:
        raise ValidationError({
            "subcategory": "Choose or enter a category before adding a subcategory."
        })

    supplied_section = canonical_section_name(section_value) if _clean_name(section_value) else None
    department_section = (
        canonical_section_name(department.section.name)
        if department and department.section_id and department.section
        else None
    )
    fallback = canonical_section_name(default_section) if _clean_name(default_section) else None

    resolved_section_name = supplied_section or department_section or fallback or "inorganic"

    if department:
        if department_section and department_section != resolved_section_name:
            raise ValidationError({
                "department": (
                    f"Department '{department.name}' belongs to the "
                    f"'{department_section}' section, not '{resolved_section_name}'."
                )
            })
        if not department.section_id:
            section_for_department, _ = Section.objects.get_or_create(
                name=resolved_section_name
            )
            department.section = section_for_department
            department.save(update_fields=["section"])

    section, _ = Section.objects.get_or_create(name=resolved_section_name)

    category = None
    if category_name:
        if len(category_name) > 50:
            raise ValidationError({
                "category": "Category names must be 50 characters or fewer."
            })
        category = Category.objects.filter(
            name__iexact=category_name,
            department=department,
        ).first()
        if category is None:
            category, _ = Category.objects.get_or_create(
                name=category_name,
                department=department,
            )

    subcategory = None
    if subcategory_name:
        if len(subcategory_name) > 50:
            raise ValidationError({
                "subcategory": "Subcategory names must be 50 characters or fewer."
            })
        subcategory = SubCategory.objects.filter(
            name__iexact=subcategory_name,
            category=category,
        ).first()
        if subcategory is None:
            subcategory, _ = SubCategory.objects.get_or_create(
                name=subcategory_name,
                category=category,
            )

    return {
        "section": section,
        "department": department,
        "category": category,
        "subcategory": subcategory,
    }
