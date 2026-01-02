import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

def generate_security_credential(initiator_password, cert_path):
    # Load public key from PEM certificate
    with open(cert_path, "rb") as cert_file:
        cert_data = cert_file.read()
    public_key = serialization.load_pem_public_key(cert_data)

    # Encrypt initiator password using RSA + PKCS1v15 padding
    encrypted = public_key.encrypt(
        initiator_password.encode('utf-8'),
        padding.PKCS1v15()
    )

    # Base64 encode the encrypted password
    security_credential = base64.b64encode(encrypted).decode('utf-8')
    return security_credential

# Usage example
cert_path = "/home/oopondo/Downloads/SandboxCertificate.pem"
initiator_password = "Safaricom123!"
security_credential = generate_security_credential(initiator_password, cert_path)
print(security_credential)
