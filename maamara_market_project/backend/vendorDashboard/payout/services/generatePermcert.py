import base64
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from cryptography import x509
import logging

logger = logging.getLogger(__name__)

def generate_security_credential(initiator_password, cert_path):
    """
    Encrypt the initiator password using Safaricom's public key certificate.
    Works with DER (.cer) or PEM formats.
    Returns a Base64 encoded SecurityCredential.
    """
    try:
        with open(cert_path, "rb") as cert_file:
            cert_data = cert_file.read()

        # Load certificate
        try:
            certificate = x509.load_pem_x509_certificate(cert_data)
        except ValueError:
            certificate = x509.load_der_x509_certificate(cert_data)

        public_key = certificate.public_key()

        # Encrypt initiator password using RSA PKCS1v15
        encrypted = public_key.encrypt(
            initiator_password.encode("utf-8"),
            padding.PKCS1v15()
        )

        # Base64 encode
        security_credential = base64.b64encode(encrypted).decode("utf-8")
        return security_credential

    except Exception as e:
        logger.error(f"❌ Failed to generate security credential: {e}")
        raise