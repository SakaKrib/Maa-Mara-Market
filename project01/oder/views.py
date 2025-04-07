from django.shortcuts import render, redirect, get_object_or_404,reverse
from .models import OderItem, Order,BillingAddress
from shop.models import Item
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import CheckOutForm
from django.views import View
from django.core.exceptions import ObjectDoesNotExist
from .models import Order, BillingAddress
from .forms import CheckOutForm
from django.conf import settings
import requests

@login_required
def add_to_cart(request, slug):
    print("add_to_cart view is being called")
    item = get_object_or_404(Item, slug=slug)
    user = request.user

    # Check if the item already exists in the user's cart
    cart_item, created = OderItem.objects.get_or_create(item=item, user=user, status='pending')
    print(f"Cart item created: {created}, {cart_item}")

    # Check if the user already has an active order
    order_qs = Order.objects.filter(user=user, status='pending')
    print(f"Order query set exists: {order_qs.exists()}")

    if order_qs.exists():
        order = order_qs[0]
        # Check if the item is already in the order
        if order.items.filter(item__slug=item.slug).exists():
            # Increase the quantity of the existing cart item
            cart_item.quantity += 1
            cart_item.save()
            print("Item quantity incremented")
            messages.info(request, 'This item quantity was updated')
            return redirect('shop:item_detail', slug=slug)
        else:
            # Add the new item to the order
            order.items.add(cart_item)
            print("Item added to order")
        messages.info(request, 'This item was added in the cart')
        return redirect('shop:item_detail', slug=slug)

    else:
        # Create a new order and add the item to it
        ordered_date = timezone.now()
        order = Order.objects.create(user=user, ordered_date=ordered_date, status='pending')
        order.items.add(cart_item)
        print("New order created and item added")
        messages.info(request, 'New order created')
        

    return redirect('shop:item_detail', slug=slug)


#remove from cart.html view

def remove_from_cart_cart_view(request, slug):
    item = get_object_or_404(Item, slug=slug)
    user = request.user

    # Check if the user already has an active order
    order_qs = Order.objects.filter(user=user, status='pending')
    print(f"Order query set exists: {order_qs.exists()}")

    if order_qs.exists():
        order = order_qs[0]
        # Check if the item is already in the order
        if order.items.filter(item__slug=item.slug).exists():
            # Get the existing cart item
            cart_item = OderItem.objects.filter(item=item, user=user, status='pending')[0]
            # Remove the item from the order
            order.items.remove(cart_item)
            print("Item removed from order")
            messages.info(request, 'This item was removed from the cart')
            return redirect('order:cart_view')
        

        else:
            messages.info(request, 'This item does not exist in the cart')
            return redirect('order:cart_view')
    else:
        messages.info(request, 'You do not have an active order')
        return redirect('order:cart_view')
    


#remove from cart function

def remove_from_cart(request, slug):
    item = get_object_or_404(Item, slug=slug)
    user = request.user

    # Check if the user already has an active order
    order_qs = Order.objects.filter(user=user, status='pending')
    print(f"Order query set exists: {order_qs.exists()}")

    if order_qs.exists():
        order = order_qs[0]
        # Check if the item is already in the order
        if order.items.filter(item__slug=item.slug).exists():
            # Get the existing cart item
            cart_item = OderItem.objects.filter(item=item, user=user, status='pending')[0]
            # Remove the item from the order
            order.items.remove(cart_item)
            print("Item removed from order")
            messages.info(request, 'This item was removed from the cart')
            return redirect('shop:item_detail', slug=slug)
        

        else:
            messages.info(request, 'This item does not exist in the cart')
            return redirect('shop:item_detail', slug=slug)
    else:
        messages.info(request, 'You do not have an active order')
        return redirect('shop:item_detail', slug=slug)
    

    #adding quantity wit + button
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from .models import Item, Order, OderItem

@login_required
def adding_single_item_to_cart(request, slug):
    print("add_to_cart view is being called")
    item = get_object_or_404(Item, slug=slug)
    user = request.user

    cart_item, created = OderItem.objects.get_or_create(item=item, user=user, status='pending')
    print(f"Cart item created: {created}, {cart_item}")

    order_qs = Order.objects.filter(user=user, status='pending')
    print(f"Order query set exists: {order_qs.exists()}")

    if order_qs.exists():
        order = order_qs[0]
        if order.items.filter(item__slug=item.slug).exists():
            cart_item.quantity += 1
            cart_item.save()
            print("Item quantity incremented")
            messages.info(request, 'This item quantity was updated')
        else:
            order.items.add(cart_item)
            print("Item added to order")
            messages.info(request, 'This item was added in the cart')
    else:
        ordered_date = timezone.now()
        order = Order.objects.create(user=user, ordered_date=ordered_date, status='pending')
        order.items.add(cart_item)
        print("New order created and item added")
        messages.info(request, 'New order created')

    # Update and save the total price
    order.total_price = order.get_total_price()
    order.save()

    return redirect('order:cart_view')

@login_required
def remove_single_item_from_cart(request, slug):
    item = get_object_or_404(Item, slug=slug)
    user = request.user

    order_qs = Order.objects.filter(user=user, status='pending')
    print(f"Order query set exists: {order_qs.exists()}")

    if order_qs.exists():
        order = order_qs[0]
        if order.items.filter(item__slug=item.slug).exists():
            cart_item = OderItem.objects.filter(item=item, user=user, status='pending')[0]
            cart_item.quantity -= 1
            if cart_item.quantity <= 0:
                order.items.remove(cart_item)
            else:
                cart_item.save()
            print("Item removed from order or quantity decremented")
            messages.info(request, 'This item quantity was updated')

            # Update and save the total price
            order.total_price = order.get_total_price()
            order.save()

        else:
            messages.info(request, 'This item does not exist in the cart')
    else:
        messages.info(request, 'You do not have an active order')

    return redirect('order:cart_view')

@login_required
def cart_view(request):
    print('willy')
    user = request.user
    order_qs = Order.objects.filter(user=user, status='pending')
    if order_qs.exists():
        order = order_qs[0]
    else:
        order = None
    return render(request, 'cart_detail.html', {'order': order})

#checkout view

class CheckOutView(View):
    def get(self, request, *args, **kwargs):
        order = get_object_or_404(Order, user=request.user, status="pending")
        form = CheckOutForm()
        context = {
            'form': form,
            'order': order
        }
        return render(request, "check_out_form.html", context)
    
    def post(self, request, *args, **kwargs):
        form = CheckOutForm(request.POST or None)
        try:
            order = Order.objects.get(user=request.user, status="pending")
            print(self.request.POST)
            

            if form.is_valid():
                print(form.cleaned_data)
                print('form is valid')
                print(type(order.get_total()))  # This should print the total in your server logs
                street_address = form.cleaned_data.get("street_address")
                appartment_address = form.cleaned_data.get("appartment_address")
                country = form.cleaned_data.get("country")
                city = form.cleaned_data.get("city")
                zip = form.cleaned_data.get("ZIP")
                save_info = form.cleaned_data.get("save_info")
                same_billing_address = form.cleaned_data.get("same_billing_address")
                payment_option = form.cleaned_data.get("payment_option")

                billing_address = BillingAddress(
                    user=request.user,
                    street_address=street_address,
                    appartment_address=appartment_address,
                    country=country,
                    zip=zip
                )
                billing_address.save()
                order.billing_address = billing_address
                order.save()


                import logging

                logger = logging.getLogger(__name__)

                if payment_option == "S":
                    logger.info("Stripe payment selected.")
                    return redirect('order:stripe_payment')
                elif payment_option == "M":
                    logger.info("M-Pesa payment selected.")
                    return redirect('order:mpesa_payment')
                elif payment_option == "P":
                    logger.info("PayPal payment selected.")
                    return redirect('order:paypal_payment', order_id=order.id)
                else:
                    logger.warning("Invalid payment option selected: %s", payment_option)
                    messages.error(request, "Invalid payment option selected.")
                    return redirect('order:checkout')



            return redirect('order:checkout')

            
            messages.warning(request, "Failed checkout")
            return redirect('order:checkout')

        except ObjectDoesNotExist:
            messages.error(request, "You do not have an active order")
            return redirect('order:checkout')


#create payment view

from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
import stripe
from .models import Order, Payment

stripe.api_key = settings.STRIPE_SECRET_KEY



class PaymentView(View):
    def get(self, request, *args, **kwargs):
        try:
            # Retrieve the user's pending order
            order = Order.objects.get(user=request.user, status="pending")
        except Order.DoesNotExist:
            # Handle case where no active order exists
            messages.error(request, "You do not have an active order.")
            return redirect('order:checkout')

        # Pass the order to the template
        context = {
            'order': order,
            'publishable_key': settings.STRIPE_PUBLISHABLE_KEY
        }
        return render(request, "payment.html", context
    )

    def post(self, request, *args, **kwargs):
        try:
            # Retrieve the pending order for the user
            order = Order.objects.get(user=request.user, status="pending")
            token = request.POST.get('stripeToken')
            amount = int(order.get_total() * 100)  # Convert to cents
            

            # Use Stripe to process the payment
            charge = stripe.Charge.create(
                amount=amount,
                currency='KES',  # Ensure this matches Stripe's supported currency codes
                source=token,
            )

            # Create a Payment object
            payment = Payment()
            payment.stripe_charge_id = charge['id']
            payment.user = request.user
            payment.amount = amount
            payment.save()

            # Update the order status and associate the payment
            order.status = 'completed'
            order.payment = payment
            order.save()

            # Payment success message
            messages.success(request, "Your payment was successful!")
            return redirect('order:checkout')

        except stripe.error.CardError as e:
            body = e.json_body
            err = body.get('error', {})
            messages.error(request, f"{err.get('message')}")
            return redirect('order:checkout')

        except stripe.error.RateLimitError:
            messages.error(request, "Too many requests. Please try again.")
            return redirect('order:checkout')

        except stripe.error.InvalidRequestError:
            messages.error(request, "Invalid payment request. Please contact support.")
            return redirect('order:checkout')

        except stripe.error.AuthenticationError:
            messages.error(request, "Payment authentication failed. Please try again.")
            return redirect('order:checkout')

        except stripe.error.APIConnectionError:
            messages.error(request, "Network error. Please check your connection and try again.")
            return redirect('order:checkout')

        except stripe.error.StripeError:
            messages.error(request, "Something went wrong with the payment. You were not charged.")
            return redirect('order:checkout')

        except Exception as e:
            # General error
            messages.error(request, "An unexpected error occurred. Please contact support.")
            return redirect('order:checkout')






#mppesa

from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.conf import settings
from .models import Order, Payment
import base64
from datetime import datetime

class MpesaPaymentView(View):
    def get(self, request, *args, **kwargs):
        try:
            # Retrieve the user's pending order
            order = Order.objects.get(user=request.user, status="pending")
        except Order.DoesNotExist:
            # Handle case where no active order exists
            messages.error(request, "You do not have an active order.")
            return redirect('order:checkout')

        # Pass the order to the template
        context = {
            'order': order,
        }
        return render(request, "mpesa_payment.html", context)

    def post(self, request, *args, **kwargs):
        try:
            # Retrieve the pending order for the user
            order = Order.objects.get(user=request.user, status="pending")
            phone_number = request.POST.get("phone_number")  # User's phone number
            amount = int(order.get_total())  # Payment amount in KES

            # Generate the access token
            access_token = self.get_access_token()
            if not access_token:
                messages.error(request, "Failed to authenticate with M-Pesa. Please try again.")
                return redirect('order:checkout')

            # Generate the password (shortcode + passkey + timestamp)
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            password = base64.b64encode(
                (settings.MPESA_SHORTCODE + settings.MPESA_PASSKEY + timestamp).encode()
            ).decode()

            # Prepare the payload for the STK Push request
            payload = {
                "BusinessShortCode": settings.MPESA_SHORTCODE,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": settings.MPESA_SHORTCODE,
                "PhoneNumber": phone_number,
                "CallBackURL": request.build_absolute_uri("/mpesa/callback/"),
                "AccountReference": "Order-{}".format(order.id),
                "TransactionDesc": "Payment for Order {}".format(order.id),
            }

            # Send the STK Push request
            response = requests.post(
                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"}
            )

            response_data = response.json()
            if response_data.get("ResponseCode") == "0":
                messages.success(request, "M-Pesa payment request sent to your phone!")
                return redirect('order:checkout')
            else:
                messages.error(request, f"M-Pesa payment failed: {response_data.get('errorMessage')}")
                return redirect('order:checkout')

        except Exception as e:
            messages.error(request, "An unexpected error occurred while processing the payment.")
            return redirect('order:checkout')

    def get_access_token(self):
        """Generate an access token from Safaricom API."""
        try:
            auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
            response = requests.get(auth_url, auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET))
            response_data = response.json()
            return response_data.get("access_token")
        except Exception as e:
            return None
        




def paypalPaymentIntegration(request, order_id):
    try:
        order = get_object_or_404(Order, id=order_id)
    except Exception as e:
        print(f"Error fetching order: {e}")  # Debugging output
    return render(request, 'paypal_payment.html', {'order': order})


from django.http import JsonResponse
from .models import Order

def get_order_total(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
        order_total = order.get_total()
        return JsonResponse({'order_total': order_total})
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)




