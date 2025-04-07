from django.shortcuts import render, redirect, HttpResponse, HttpResponseRedirect, reverse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Vendor
from .forms import VendorForm, VendorLoginForm,VendorProfileForm
from django.contrib import messages
from django.utils import timezone
from django.http import HttpResponse

from django.http import HttpResponse
from django.utils import timezone
from vendorDashboard.models import Vendor  # Import your Vendor model
from vendorDashboard.forms import VendorForm  # Import your VendorForm
from django.contrib.auth.hashers import make_password



@login_required
def vendor_registration(request):
    if request.method == 'POST':
        form = VendorForm(request.POST, request.FILES)  # Handle form data and files
        if form.is_valid():
            # Check if the user is already a vendor
            if Vendor.objects.filter(user=request.user).exists():
                messages.error(request, "You are already registered as a vendor.")
                return redirect('vendor:vendor_dashboard')

            # Save the vendor data
            vendor = form.save(commit=False)
            vendor.user = request.user  # Associate the vendor with the logged-in user
            vendor.date_updated = timezone.now()

            # Hash and save the vendor's password
            vendor.password = make_password(form.cleaned_data['password'])  # Hash the vendor password
            vendor.vendor_logo = request.FILES.get('vendor_logo')  # Save the vendor's logo (if any)
            if not vendor.vendor_id:  # Check if vendor_id is unset
                vendor.vendor_id = request.user.id  # Align vendor_id with user's ID
            vendor.save()

            # Redirect to vendor login page
            messages.success(request, "Vendor registration successful. Please log in.")
            return redirect('vendor:vendor_login')
    else:
        form = VendorForm()

    return render(request, 'forms/vendor_forms.html', {'form': form})


# Vendor Login View
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.hashers import check_password
from .models import Vendor
from .forms import VendorLoginForm
import logging

logger = logging.getLogger(__name__)

def vendor_login(request):
    if request.method == 'POST':
        form = VendorLoginForm(request.POST)
        if form.is_valid():
            # Retrieve email and password from the form
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            try:
                # Find the vendor by email
                vendor = Vendor.objects.get(email=email)
                logger.info(f"Vendor found: {vendor.id}")
                print(f"Vendor found: {vendor.id}")
                

                # Check if the provided password matches the vendor's hashed password
                if check_password(password, vendor.password):
                    logger.info("Password verification successful")
                    print("Password verification successful")
                    request.session['vendor_id'] = vendor.id  # Store vendor ID in session
                    messages.success(request, "Login successful! Redirecting to your dashboard.")
                    return redirect('vendor:vendor_dashboard')  # Redirect to the vendor dashboard
                else:
                    logger.warning("Password verification failed")
                    messages.error(request, "Invalid email or password. Please try again.")
                    return redirect('vendor:vendor_login')
            except Vendor.DoesNotExist:
                logger.warning("Vendor not found")
                messages.error(request, "No account found with this email. Please register.")
                return redirect('vendor:vendor_login')
        else:
            messages.error(request, "Please correct the errors in the form.")
    else:
        form = VendorLoginForm()

    return render(request, 'authentication/vendor_login.html', {'form': form})





# view for vendor dashboard


logger = logging.getLogger(__name__)

def vendor_dashboard(request):
    vendor_id = request.session.get('vendor_id')
    if not vendor_id:
        print(vendor_id)
        logger.info("Unauthorized access - vendor_id not found in session")
        messages.error(request, "Your session has expired or you are not logged in. Please log in again.")
        return redirect('vendor:vendor_login')

    try:
        vendor = Vendor.objects.get(id=vendor_id)
        logger.info(f"Vendor accessed dashboard: {vendor.id}")
    except Vendor.DoesNotExist:
        logger.info("Vendor not found for vendor_id")
        messages.error(request, "Vendor account not found.")
        return redirect('vendor:vendor_login')

    return render(request, 'dashboards/vendorDashboard.html', {'vendor': vendor})






# vendor profile vie ad edit
@login_required
def vendor_profile(request):
    try:
        # Check if the user already has a vendor profile
        vendor = Vendor.objects.get(user=request.user)
    except Vendor.DoesNotExist:
        # Redirect to registration if the vendor does not exist
        return HttpResponseRedirect(reverse('vendor:register_vendor'))

    if request.method == 'POST':
        # If form data is being updated
        form = VendorForm(request.POST, request.FILES, instance=vendor)
        if form.is_valid():
            vendor = form.save(commit=False)
            vendor.date_updated = timezone.now()
            vendor.save()
            return HttpResponseRedirect(reverse('vendor:vendor_dashboard'))  # Redirect to dashboard
            
    else:
        # Pre-fill the form with vendor data
        form = VendorForm(instance=vendor)

    return render(request, 'authentication/vendor_profile.html', {'form': form, 'vendor': vendor})













# Vendor Logout View
def vendor_logout(request):
    logout(request)
    return redirect('login')  # Redirect to login page

# Save Vendor Information
@login_required
def save_vendor_info(request):
    try:
        vendor = Vendor.objects.get(email=request.user.email)
    except Vendor.DoesNotExist:
        return JsonResponse({'error': 'Vendor not found'}, status=404)
    
    if request.method == 'POST':
        form = VendorForm(request.POST, instance=vendor)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': 'Vendor information updated successfully'})
        else:
            return JsonResponse({'error': 'Invalid data provided'}, status=400)
    
    form = VendorForm(instance=vendor)
    return render(request, 'edit_vendor_info.html', {'form': form})






# filter selected payment getway by the vendor
def get_gateway(vendor):
    """
    Select the appropriate payment gateway based on the vendor's payment method.
    """
    payment_method = vendor.payment_method
    if payment_method == 'M-Pesa':
        return 'mpesa'
    elif payment_method == 'PayPal':
        return 'paypal'
    else:
        raise ValueError(f"Unsupported payment method: {payment_method}")
    


    
# process payments

import requests
from django.conf import settings

def process_payment(vendor, amount):
    """
    Process payment using the selected payment gateway.
    """
    gateway_key = get_gateway(vendor)
    gateway = settings.PAYMENT_GATEWAYS[gateway_key]

    if gateway_key == 'mpesa':
        # Process payment via M-Pesa
        return process_mpesa_payment(vendor, amount, gateway)
    elif gateway_key == 'paypal':
        # Process payment via PayPal
        return process_paypal_payment(vendor, amount, gateway)
    else:
        raise ValueError(f"Unsupported payment gateway: {gateway_key}")

def process_mpesa_payment(vendor, amount, gateway):
    """
    Make payment via M-Pesa.
    """
    # Get M-Pesa access token
    auth_response = requests.get(
        gateway['auth_url'],
        auth=(gateway['consumer_key'], gateway['consumer_secret'])
    )
    access_token = auth_response.json().get('access_token')
    
    # Prepare M-Pesa payment data
    payment_data = {
        "InitiatorName": "your_initiator_name",
        "SecurityCredential": gateway['security_credential'],
        "CommandID": "BusinessPayment",
        "Amount": amount,
        "PartyA": gateway['short_code'],
        "PartyB": vendor.phone_number,  # Assuming vendor's phone number is used
        "Remarks": "Payment to vendor",
        "QueueTimeOutURL": gateway['timeout_url'],
        "ResultURL": gateway['result_url'],
        "Occasion": "Vendor payment",
    }

    # Make the request
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.post(gateway['url'], json=payment_data, headers=headers)
    if response.status_code == 200:
        return {'status': 'success', 'response': response.json()}
    else:
        return {'status': 'failed', 'error': response.text}

def process_paypal_payment(vendor, amount, gateway):
    """
    Make payment via PayPal.
    """
    # Get PayPal access token
    auth_response = requests.post(
        gateway['auth_url'],
        auth=(gateway['client_id'], gateway['client_secret']),
        data={'grant_type': 'client_credentials'}
    )
    access_token = auth_response.json().get('access_token')

    # Prepare PayPal payment data
    payment_data = {
        "sender_batch_header": {
            "sender_batch_id": "unique_batch_id_123",
            "email_subject": "You have received a payment!",
        },
        "items": [
            {
                "recipient_type": "EMAIL",
                "amount": {"value": f"{amount}", "currency": "USD"},
                "receiver": vendor.email,  # Assuming vendor's email is used
                "note": "Payment for your services",
                "sender_item_id": "item_1",
            }
        ]
    }

    # Make the request
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    response = requests.post(gateway['url'], json=payment_data, headers=headers)
    if response.status_code in [200, 201]:
        return {'status': 'success', 'response': response.json()}
    else:
        return {'status': 'failed', 'error': response.text}
    


# Make Payment View

def pay_vendor_view(request, vendor_id):
    vendor = get_object_or_404(Vendor, id=vendor_id)
    amount = request.POST.get('amount')  # Assuming amount is provided in the POST data

    try:
        # Process the payment
        result = process_payment(vendor, amount)
        if result['status'] == 'success':
            return JsonResponse({'success': True, 'details': result['response']})
        else:
            return JsonResponse({'success': False, 'error': result['error']}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)





#view for sale registration
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from shop.models import Item  # app containing your Item model
from vendorDashboard.models import Vendor, SoldItem  # app containing your Vendor model and SoldItem

@csrf_exempt  # Disable CSRF protection for simplicity in testing (use cautiously)
def register_sale(request):
    if request.method == 'POST':
        item_id = request.POST.get('item_id')
        vendor_id = request.POST.get('vendor_id')
        quantity = int(request.POST.get('quantity'))

        # Fetch the Item and Vendor
        item = get_object_or_404(Item, id=item_id)
        vendor = get_object_or_404(Vendor, id=vendor_id)

        # Check if there is enough stock available
        if item.in_stock < quantity:
            return JsonResponse({'error': 'Not enough stock available'}, status=400)

        # Register the sale
        sold_item = SoldItem.objects.create(
            item=item,
            vendor=vendor,
            quantity=quantity
        )

        # Update the stock for the item
        item.in_stock -= quantity
        item.save()

        # Response after successful registration
        return JsonResponse({
            'success': 'Sale registered successfully!',
            'sale_details': {
                'item_name': sold_item.item.name,
                'quantity': sold_item.quantity,
                'sale_price': float(sold_item.sale_price),
                'total_price': float(sold_item.total_price),
                'vendor': sold_item.vendor.company_name
            }
        })

    # Return an error if the request method is not POST
    return JsonResponse({'error': 'Invalid request method'}, status=400)


# send email to vendor if there item is sold

from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.http import JsonResponse



def notify_vendor(request, sold_item_id):
    # Fetch the SoldItem record and related Vendor
    sold_item = get_object_or_404(SoldItem, id=sold_item_id)
    vendor = sold_item.vendor

    # Email content
    subject = f"Order Received: {sold_item.item.name}"
    message = (
        f"Dear {vendor.surname_name} {vendor.first_name},\n\n"
        f"We are excited to inform you that your item has been sold!\n"
        f"Order Details:\n"
        f"Item: {sold_item.item.name}\n"
        f"Quantity Sold: {sold_item.quantity}\n"
        f"Total Price: {sold_item.total_price}\n\n"
        f"Please dispatch the item to our logistics team immediately.\n"
        f"Thank you for being a valued partner.\n\n"
        f"Best regards,\n"
        f"Our Team,"
        f"Maa Mara Market."
    )
    recipient_email = vendor.email

    # Attempt to send the email
    try:
        send_mail(
            subject,
            message,
            DEFAULT_FROM_EMAIL,
            [recipient_email],
            fail_silently=False,  # Raise an error if the email fails
        )
        return JsonResponse({'success': f'Notification sent to {vendor.company_name}.'})
    except Exception as e:
        return JsonResponse({'error': f'Failed to send notification: {str(e)}'}, status=500)
    



# send text messages to the vendor and notify them to dispatch the item to the go-down

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from twilio.rest import Client  # Make sure to install the Twilio library
from project01.settings import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER


def notify_vendor_sms(request, sold_item_id):
    # Fetch the SoldItem record and related Vendor
    sold_item = get_object_or_404(SoldItem, id=sold_item_id)
    vendor = sold_item.vendor

    # Retrieve the vendor's Imali (earnings)
    vendor_imali = sold_item.total_price  # Replace with actual logic if needed

    # SMS content
    message_body = (
        f"Dear {vendor.surname_name} {vendor.first_name},\n"
        f"Your item has been sold!\n"
        f"Order Details:\n"
        f"Item: {sold_item.item.name}\n"
        f"Quantity Sold: {sold_item.quantity}\n"
        f"Total Price: {sold_item.total_price}\n"
        f"Earnings (Imali): {vendor_imali}\n\n"
        f"Please dispatch the item to our logistics team. Thank you!\n"
        f"- Maa Mara Market"
    )

    # Attempt to send the SMS
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=vendor.phone_number  # Ensure the vendor has a valid phone number
        )
        return JsonResponse({'success': f'SMS notification sent to {vendor.phone_number}.', 'sms_sid': message.sid})
    except Exception as e:
        return JsonResponse({'error': f'Failed to send SMS notification: {str(e)}'}, status=500)





