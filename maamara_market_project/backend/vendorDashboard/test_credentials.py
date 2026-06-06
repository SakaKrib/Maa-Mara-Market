import os
import django
import logging

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project01.settings')
django.setup()

from vendorDashboard.payout.services.payment_processors import generate_security_credential

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    initiator_password = "safaricom123!"  # Replace with your real initiator password
    cert_path = "/home/oopondo/Downloads/SandboxCertificate.pem"

    logger.info(f"Using certificate path: {cert_path}")
    try:
        security_credential = generate_security_credential(initiator_password, cert_path)
        logger.info("Generated SecurityCredential:")
        print(security_credential)
    except Exception as e:
        logger.error(f"Error generating SecurityCredential: {e}")

if __name__ == "__main__":
    main()
