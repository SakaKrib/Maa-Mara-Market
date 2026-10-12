"""Authentication tokens are issued by the explicit login endpoints.

Google JWT cookies are created once in google_login_success after django-allauth
has authenticated the account. Signal-driven session token generation was
redundant and could mint a second pair during account linking or updates.
"""
