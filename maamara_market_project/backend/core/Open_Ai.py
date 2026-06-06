from openai import OpenAI
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings

# client = OpenAI(api_key=settings.OPENAI_API_KEY)
# print(client)

# -------------------------------------------------
# OpenAI client
# -------------------------------------------------

client = OpenAI(api_key=settings.OPENAI_API_KEY)


# -------------------------------------------------
# AI Chat API View
# -------------------------------------------------

class AIChatAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    # -----------------------------
    # ROLE DETECTION
    # -----------------------------

    def get_user_role(self, user):
        if not user:
            return "visitor"

        if user.is_superuser:
            return "admin"

        if hasattr(user, "vendor"):
            return "vendor"

        return "customer"

    # -----------------------------
    # POST REQUEST
    # -----------------------------

    def post(self, request):
        user = None
        role = "visitor"

        # -----------------------------
        # TRY JWT AUTH
        # -----------------------------

        jwt_authenticator = JWTAuthentication()

        try:
            header = jwt_authenticator.get_header(request)

            if header:
                raw_token = jwt_authenticator.get_raw_token(header)

                if raw_token:
                    validated_token = jwt_authenticator.get_validated_token(raw_token)
                    user = jwt_authenticator.get_user(validated_token)
                    role = self.get_user_role(user)

        except (InvalidToken, TokenError, AttributeError):
            user = None

        # -----------------------------
        # VISITOR COOKIE FALLBACK
        # -----------------------------

        if user is None or not user.is_authenticated:
            visitor_token = request.COOKIES.get("visitorAccessToken")

            if visitor_token:
                role = "visitor"
            else:
                return Response(
                    {"error": "Authentication required"},
                    status=401,
                )

        # -----------------------------
        # MESSAGE VALIDATION
        # -----------------------------

        user_message = request.data.get("message", "").strip()

        if not user_message:
            return Response(
                {"error": "No message provided"},
                status=400,
            )

        # -----------------------------
        # PROMPTS
        # -----------------------------

        system_prompt = (
            "You are an AI assistant for an e-commerce website. "
            "Help users discover products, compare items, "
            "answer questions about pricing, delivery, stock, "
            "and guide checkout. "
            "Be concise and friendly."
        )

        user_prompt = f"User role: {role}\nUser says: {user_message}"

        # -----------------------------
        # OPENAI REQUEST
        # -----------------------------

        try:
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=250,
                temperature=0.6,
            )

            ai_reply = response.choices[0].message.content.strip()

        except Exception as e:
            print("🔥 OpenAI API error:", e)

            return Response(
                {
                    "error": "OpenAI request failed",
                    "details": str(e),
                },
                status=500,
            )

        # -----------------------------
        # SUCCESS
        # -----------------------------

        return Response(
            {
                "role": role,
                "reply": ai_reply,
            }
        )