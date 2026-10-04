import base64
import json
import logging

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"

TEXT_SCHEMAS = {
    "brand_name": {
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name"],
    },
    "brand_description": {
        "type": "object",
        "properties": {"description": {"type": "string"}},
        "required": ["description"],
    },
    "item_name": {
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name"],
    },
    "item_description": {
        "type": "object",
        "properties": {"description": {"type": "string"}},
        "required": ["description"],
    },
}


def _gemini_text_request(prompt, schema, image=None):
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = getattr(settings, "GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    endpoint = GEMINI_ENDPOINT.format(model=model)

    parts = [{"text": prompt}]

    if image is not None:
        parts.insert(
            0,
            {
                "inline_data": {
                    "mime_type": image.content_type or "image/jpeg",
                    "data": base64.b64encode(image.read()).decode("ascii"),
                }
            },
        )

    payload = {
        "contents": [{"parts": parts}],
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
        logger.error("Gemini vendor registration generation failed: %s", response.text[:1000])
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


class GenerateVendorRegistrationAIAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        field = str(request.data.get("field") or "").strip().lower()

        if field not in TEXT_SCHEMAS:
            return Response(
                {"detail": "Unsupported vendor registration AI field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            context = json.loads(request.data.get("context") or "{}")
        except json.JSONDecodeError:
            context = {}

        image = request.FILES.get("image")

        if field in {"item_name", "item_description"} and not image:
            return Response(
                {"detail": "An item image is required for AI generation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image and (
            image.size > 10 * 1024 * 1024
            or not (image.content_type or "").startswith("image/")
        ):
            return Response(
                {"detail": "The uploaded item file must be an image no larger than 10 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        context_text = json.dumps(context, ensure_ascii=False)

        if field == "brand_name":
            prompt = (
                "Create a professional, memorable brand name for a marketplace vendor. "
                "Use the supplied company name and workshop location as context. "
                "Prefer a name that can naturally represent the vendor's products. "
                "Do not invent certifications, heritage, ownership, materials, awards, or other facts. "
                "If the company name is already a suitable brand name, it is acceptable to return it. "
                "Return only the brand name.\n\n"
                f"Vendor context:\n{context_text}"
            )
        elif field == "brand_description":
            prompt = (
                "Write a concise, professional brand description for a marketplace vendor. "
                "Use only facts supplied in the context. Mention the workshop location only when it "
                "naturally helps the description. Do not invent claims, certifications, materials, "
                "production methods, history, awards, or geographic claims. "
                "Return only the description.\n\n"
                f"Vendor context:\n{context_text}"
            )
        elif field == "item_name":
            prompt = (
                "Analyze the supplied product image and create a clear, specific marketplace sample item name. "
                "Use the vendor context when helpful. Do not invent unsupported brand names, materials, sizes, "
                "certifications, or specifications. Return only the item name.\n\n"
                f"Vendor context:\n{context_text}"
            )
        else:
            prompt = (
                "Analyze the supplied product image and write a concise, factual marketplace sample item description. "
                "Use the vendor context when helpful. Do not invent materials, sizes, dimensions, certifications, "
                "production methods, or other specifications that cannot reasonably be determined from the image "
                "or supplied context. Return only the description.\n\n"
                f"Vendor context:\n{context_text}"
            )

        try:
            result = _gemini_text_request(
                prompt,
                TEXT_SCHEMAS[field],
                image=image,
            )

            if field in {"brand_name", "item_name"}:
                value = str(result.get("name") or "").strip()
                if not value:
                    raise ValueError("Gemini returned an empty name.")
                return Response({"name": value})

            value = str(result.get("description") or "").strip()
            if not value:
                raise ValueError("Gemini returned an empty description.")
            return Response({"description": value})

        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception:
            logger.exception("Vendor registration AI generation failed.")
            return Response(
                {"detail": "Unable to generate the requested vendor information right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
