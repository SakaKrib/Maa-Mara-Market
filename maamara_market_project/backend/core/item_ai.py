import base64
import json
import logging

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ReactSerializers.models import Category, Department, SubCategory

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"

FIELD_SCHEMAS = {
    "name": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
        },
        "required": ["name"],
    },
    "classification": {
        "type": "object",
        "properties": {
            "department": {"type": "string"},
            "category": {"type": "string"},
            "subcategory": {"type": "string"},
        },
        "required": ["department", "category", "subcategory"],
    },
    "attribute": {
        "type": "object",
        "properties": {
            "attribute": {"type": "string"},
        },
        "required": ["attribute"],
    },
    "description": {
        "type": "object",
        "properties": {
            "description": {"type": "string"},
        },
        "required": ["description"],
    },
}


def _taxonomy_payload(section=None):
    payload = []

    departments = Department.objects.select_related("section").prefetch_related(
        "categories__subcategories"
    ).order_by("name")

    if section == "organic":
        departments = departments.filter(section__name="organic")
    elif section == "inorganic":
        departments = departments.exclude(section__name="organic")

    for department in departments:
        categories = []
        for category in department.categories.all().order_by("name"):
            categories.append({
                "name": category.name,
                "subcategories": list(
                    category.subcategories.all().order_by("name").values_list("name", flat=True)
                ),
            })

        payload.append({
            "name": department.name,
            "categories": categories,
        })

    return payload


def _matching_name(value, choices):
    normalized = str(value or "").strip().casefold()
    for choice in choices:
        if str(choice).strip().casefold() == normalized:
            return choice
    return None


def _validate_classification(result, taxonomy):
    departments = {item["name"]: item for item in taxonomy}
    department_name = _matching_name(result.get("department"), list(departments))
    if not department_name:
        raise ValueError("Gemini returned a department outside the available taxonomy.")

    department = departments[department_name]
    categories = {item["name"]: item for item in department["categories"]}
    requested_category = str(result.get("category") or "").strip()
    category_name = _matching_name(requested_category, list(categories))

    if category_name:
        category_value = category_name
        category = categories[category_name]
        requested_subcategory = str(result.get("subcategory") or "").strip()
        subcategory_name = _matching_name(
            requested_subcategory,
            category["subcategories"],
        )
        subcategory_value = subcategory_name or requested_subcategory
    else:
        category_value = requested_category
        subcategory_value = str(result.get("subcategory") or "").strip()

    if not category_value or not subcategory_value:
        raise ValueError("Gemini returned an incomplete category hierarchy.")

    return {
        "department": department_name,
        "category": category_value,
        "subcategory": subcategory_value,
        "category_is_custom": not bool(category_name),
        "subcategory_is_custom": (
            not bool(category_name)
            or not bool(_matching_name(
                subcategory_value,
                categories[category_name]["subcategories"],
            ))
        ),
    }


def _gemini_request(image_bytes, mime_type, prompt, schema):
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = getattr(settings, "GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    endpoint = GEMINI_ENDPOINT.format(model=model)

    payload = {
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    }
                },
                {"text": prompt},
            ]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "responseSchema": schema,
        },
    }

    response = requests.post(
        endpoint,
        headers={
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )

    if not response.ok:
        logger.error("Gemini item generation failed: %s", response.text[:1000])
        raise RuntimeError("Gemini request failed.")

    data = response.json()
    text_parts = []

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if part.get("text"):
                text_parts.append(part["text"])

    if not text_parts:
        raise RuntimeError("Gemini returned no generated content.")

    try:
        return json.loads("".join(text_parts))
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned invalid JSON: %s", "".join(text_parts)[:1000])
        raise RuntimeError("Gemini returned an invalid structured response.") from exc


class GenerateItemAIAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        field = str(request.data.get("field") or "").strip().lower()
        image = request.FILES.get("image")

        if field not in FIELD_SCHEMAS:
            return Response(
                {"detail": "Unsupported AI generation field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not image:
            return Response(
                {"detail": "A product image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > 10 * 1024 * 1024:
            return Response(
                {"detail": "The product image must be 10 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mime_type = image.content_type or "image/jpeg"
        if not mime_type.startswith("image/"):
            return Response(
                {"detail": "The uploaded file must be an image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            context = json.loads(request.data.get("context") or "{}")
        except json.JSONDecodeError:
            context = {}

        taxonomy = _taxonomy_payload(str(context.get("section") or "").strip().lower())
        context_text = json.dumps(context, ensure_ascii=False)

        if field == "classification":
            prompt = (
                "Analyze the supplied product image and classify the product for an "
                "e-commerce listing. Select the department, category, and subcategory "
                "ONLY from the supplied taxonomy. Do not invent taxonomy values. "
                "Return the closest valid hierarchy. If no suitable category or subcategory exists in the supplied taxonomy, provide a concise custom value for that level instead of inventing a different existing taxonomy value.\n\n"
                f"Available taxonomy:\n{json.dumps(taxonomy, ensure_ascii=False)}\n\n"
                f"Current form context:\n{context_text}"
            )
        elif field == "attribute":
            allowed_attributes = context.get("allowed_attributes") or []
            prompt = (
                "Analyze the supplied product image and identify the single most "
                "appropriate product attribute for the existing marketplace attribute "
                "field. Do not return color. Prefer one of the supplied predefined "
                "attributes. If none accurately describes the item, return a concise "
                "custom attribute.\n\n"
                f"Allowed attributes:\n{json.dumps(allowed_attributes, ensure_ascii=False)}\n\n"
                f"Current form context:\n{context_text}"
            )
        elif field == "description":
            prompt = (
                "Analyze the supplied product image and write a concise, factual "
                "marketplace product description. Do not invent specifications that "
                "cannot reasonably be determined from the image or supplied context. "
                "Do not mention color unless it is already present in the context. "
                "Return only the description field.\n\n"
                f"Current form context:\n{context_text}"
            )
        else:
            prompt = (
                "Analyze the supplied product image and create a clear, specific "
                "marketplace item name. Use the supplied context when helpful. "
                "Do not add unsupported brand names or specifications. Return only "
                "the item name.\n\n"
                f"Current form context:\n{context_text}"
            )

        try:
            result = _gemini_request(
                image.read(),
                mime_type,
                prompt,
                FIELD_SCHEMAS[field],
            )

            if field == "classification":
                result = _validate_classification(result, taxonomy)

            if field == "attribute":
                result = {
                    "attribute": str(result.get("attribute") or "").strip()
                }
                if not result["attribute"]:
                    raise ValueError("Gemini returned an empty attribute.")

            return Response(result)

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except Exception:
            logger.exception("AI item generation failed.")
            return Response(
                {"detail": "Unable to generate the requested item information right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
