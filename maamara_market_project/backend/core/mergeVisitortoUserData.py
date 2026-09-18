from order.models import Order, OrderItem, Transaction, Customer, Payment, BillingAddress
from core.models import Profile, Wallet, Voucher, ActivityLog, Notification, Referral


def merge_visitor_data_to_user(user, visitor_id):
    if not visitor_id:
        return

    # Orders & OrderItems
    Order.objects.filter(visitor_id=visitor_id, user__isnull=True).update(user=user, visitor_id=None)
    OrderItem.objects.filter(visitor_id=visitor_id, user__isnull=True).update(user=user, visitor_id=None)

    # Payments
    Payment.objects.filter(visitor_id=visitor_id, user__isnull=True).update(user=user, visitor_id=None)

    # ✅ FIXED: Customers (handle OneToOne constraint safely)
    visitor_customer = Customer.objects.filter(visitor_id=visitor_id, user__isnull=True).first()
    existing_customer = Customer.objects.filter(user=user).first()

    if visitor_customer:
        if existing_customer:
            # User already has a customer → remove visitor customer to avoid conflict
            visitor_customer.delete()
        else:
            # Safe to assign
            visitor_customer.user = user
            visitor_customer.visitor_id = None
            visitor_customer.save()
    else:
        # Ensure user has a customer
        Customer.objects.get_or_create(user=user)

    # BillingAddresses
    BillingAddress.objects.filter(visitor_id=visitor_id, user__isnull=True).update(user=user, visitor_id=None)

    # Profiles
    try:
        visitor_profile = Profile.objects.get(customer__visitor_id=visitor_id)
        visitor_profile.user = user
        visitor_profile.save()
    except Profile.DoesNotExist:
        pass

    # Wallet
    try:
        visitor_wallet = Wallet.objects.get(user__isnull=True, visitor_id=visitor_id)
        visitor_wallet.user = user
        visitor_wallet.save()
    except Wallet.DoesNotExist:
        Wallet.objects.get_or_create(user=user)

    # Referrals
    Referral.objects.filter(referrer__isnull=True, visitor_id=visitor_id).update(referrer=user)

    # Vouchers
    Voucher.objects.filter(user__isnull=True, visitor_id=visitor_id).update(user=user)

    # Activity Logs
    ActivityLog.objects.filter(visitor_id=visitor_id, user__isnull=True).update(user=user, visitor_id=None)

    # Notifications
    Notification.objects.filter(visitor_id=visitor_id, user__isnull=True).update(user=user, visitor_id=None)

    print(f"Merged visitor data for visitor_id: {visitor_id} into user: {user.username}")