from django.shortcuts import render, get_object_or_404, redirect
from .models import Category, Item
from django.views.generic import ListView
from vendorDashboard.models import Vendor, PersistentItemData

def static(request):
    return render(request, "static/", {})

# Index view
def list_items(request):
    items = Item.objects.filter(is_sold=False)[:6]
    categories = Category.objects.all()
    return render(request, 'category_list.html', {'categories': categories, 'items': items})

# List view for all categories
def category_list(request):
    categories = Category.objects.all()
    return render(request, 'category_list.html', {'categories': categories})

# Detail view for a single category using slug
def category_detail(request, slug):
    print(slug)  # Debugging step
    category = get_object_or_404(Category, slug=slug)
    items = Item.objects.filter(category=category)
    return render(request, 'category_detail.html', {'category': category, 'items': items})


# List view for all items
def item_list(request):
    items = Item.objects.all()
    categories = Category.objects.all()
    return render(request, 'items/item_list.html', {'items': items, 'categories': categories})

# Detail view for a single item using slug
def item_detail(request, slug):
    item = get_object_or_404(Item, slug=slug)
    related_items = Item.objects.filter(category=item.category, slug=slug)[:10]
    return render(request, 'items/item_detail.html', {'item': item, 'related_items': related_items})

class HomeView(ListView):
    model = Item
    model = Category
    template_name = "index.html"

def checkout(request):
    return render(request, "check_out.html")

def products(request):
    context = {
        'items': Item.objects.all()
    }
    return render(request, "products.html", context)



    #view for creating new item
from django.shortcuts import render, redirect
from .forms import ItemForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required  # Ensure user authentication
import uuid

# create new item

from hashlib import md5  # Import for hashing

def get_image_hash(image_file):
    hasher = md5()  # Generate the hash with MD5; for better security, you can use SHA-256
    for chunk in image_file.chunks():  # Process the image in chunks
        hasher.update(chunk)
    return hasher.hexdigest()

@login_required
def create_item(request):
    from vendorDashboard.models import Vendor
    from vendorDashboard.models import PersistentItemData  # Ensure PersistentItemData is imported

    # Retrieve vendor associated with the user
    vendor = Vendor.objects.filter(user=request.user).first()

    if not vendor:
        messages.error(request, 'No active vendor associated with this user.')
        return redirect('some_error_page')
    
    if request.method == 'POST':
        form = ItemForm(request.POST, request.FILES)
        if form.is_valid():
            item = form.save(commit=False)  # Delay saving to add additional fields
            
            # Generate the image hash and validate uniqueness
            try:
                uploaded_image = item.image
                image_hash = get_image_hash(uploaded_image)
                print("Generated image hash:", image_hash)  # Debug

                if Item.objects.filter(image_hash=image_hash).exists():
                    messages.error(request, 'This image already exists in the system!')
                    return render(request, 'forms/add-new-items.html', {'form': form})

                item.image_hash = image_hash  # Assign the image hash to the item
                print("Image hash assigned to item:", item)  # Debug

            except Exception as e:
                print(f"Error processing image hash: {e}")
                messages.error(request, 'Error processing the uploaded image.')
                return render(request, 'forms/add-new-items.html', {'form': form})

            # Assign additional fields
            item.created_by = request.user  # Assign the creator
            item.save()  # Save the item to the database
            
            # Now associate the item with the vendor
            vendor.item.add(item)
            print(f"Item linked to vendor: {vendor}")  # Debug

            # Create PersistentItemData entry for the item
            try:
                persistent_item = PersistentItemData.objects.create(
                    vendor=vendor,  # Link to the vendor
                    category=item.category,
                    image=item.image,
                    name=item.name,
                    size=item.size,
                    description=item.description,
                    gender_based=item.gender_based,
                    children_size_based_age=item.children_size_based_age,
                    price=item.price,
                    discount_price=getattr(item, 'discount_price', None),  # Handle optional fields
                    in_stock=item.in_stock,
                    created_by=item.created_by,
                    available=item.available,
                    slug=item.slug
                )
                print(f"PersistentItemData created successfully: {persistent_item}")
            except Exception as e:
                print(f"Error creating PersistentItemData: {e}")

            messages.success(request, 'Item created successfully and linked to your vendor!')
            return redirect('shop:item_detail', slug=item.slug)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = ItemForm()
    
    return render(request, 'forms/add-new-items.html', {'form': form})







#item list function
@login_required
def item_list(request):
    


    # Retrieve the `item_list` (list of item IDs) from the session
    item_ids = request.session.get('item_list', [])  # Defaults to an empty list if not found
   

    # Fetch the Vendor object based on the logged-in user
    vendor = Vendor.objects.filter(user=request.user).first()
    if not vendor:
        
        return render(request, 'items/vendor-item-list.html', {
            'items': [],
            'vendor': None,
            'error': 'Vendor not found for the logged-in user.'
        })

    # Query the database to get all items matching the IDs in the list
    items = Item.objects.filter(id__in=item_ids)

    # Calculate total price (accounting for discounts if applicable)
    total_price = 0
    for item in items:
        if hasattr(item, 'discount_price') and item.discount_price:  # Check if discount exists
            final_price = (item.price * item.in_stock) * (1 - (item.discount_price / 100))
        else:
            final_price = item.price * item.in_stock
        total_price += final_price
     

     
        

    # Fetch all persistent data to display on the page
    
    

    # Render the template and pass items, vendor, and total_price
    return render(request, 'items/vendor-item-list.html', {
        
        'items': items,
        'vendor': vendor,
        'total_price': total_price
    })


@login_required
def main_dashboard(request):
    # Retrieve `item_list` (list of item IDs) from the session
    item_ids = request.session.get('item_list', [])  # Defaults to an empty list if not found
    print(f"Item IDs from session: {item_ids}")  # Debug: Check item IDs retrieved from session

    # Get the vendor associated with the logged-in user
    vendor = Vendor.objects.filter(user=request.user).first()  # Assumes Vendor is linked to User
    print(f"Vendor found: {vendor}")  # Debug: Check if vendor is retrieved

    # Ensure vendor exists to avoid NoneType issues
    if not vendor:
        print("No vendor found for the logged-in user.")  # Debug: Log if no vendor is found
        return render(request, 'dashboards/main_dashboard.html', {'error': 'Vendor not found'})

    # Fetch items associated with this vendor
    items = Item.objects.filter(id__in=item_ids, vendors=vendor)
    print(f"Items fetched for vendor: {list(items)}")  # Debug: Log the items retrieved

    # Prepare persistent storage for prices and totals (e.g., database or caching layer)
    persistent_data = {}
    total_price = 0
    persistent_total_price = 0  # Initialize total for persistent items

    # Calculate total price for items
    for item in items:
        if hasattr(item, 'discount_price') and item.discount_price:  # Check if discount exists
            final_price = (item.price * item.in_stock) * (1 - (item.discount_price / 100))
        else:
            final_price = item.price * item.in_stock
        total_price += final_price

        # Save individual item prices to persistent data
        persistent_data[item.id] = {
            'name': item.name,
            'original_price': item.price,
            'discount_price': item.discount_price if hasattr(item, 'discount_price') else None,
            'final_price': final_price,
        }
        print(f"Item: {item.name}, Final Price: {final_price}")  # Debug for each item

    print(f"Total price for items: {total_price}")  # Debug total price for items

    # Fetch persistent items and calculate their total price
    persistent_items = PersistentItemData.objects.filter(vendor=vendor)
    for persistent_item in persistent_items:
        if hasattr(persistent_item, 'discount_price') and persistent_item.discount_price:  # Check if discount exists
            persistent_final_price = (persistent_item.price * persistent_item.in_stock) * (1 - (persistent_item.discount_price / 100))
        else:
            persistent_final_price = persistent_item.price * persistent_item.in_stock
        persistent_total_price += persistent_final_price
        print(f"Persistent Item: {persistent_item.name}, Final Price: {persistent_final_price}")  # Debug

    print(f"Total price for persistent items: {persistent_total_price}")  # Debug total price for persistent items

    # Prepare the context for the template
    context = {
        'vendor': vendor,
        'items': items,
        'total_price': total_price,
        'persistent_items': persistent_items,
        'persistent_total_price': persistent_total_price,  # Add persistent total to context
        'item_count': len(items),  # Add item count
        'persistent_item_count': len(persistent_items),  # Add persistent item count
    }
    print(f"Context prepared for template: {context}")  # Debug: Log the context passed to the template

    # Pass the context to the template
    return render(request, 'dashboards/main_dashboard.html', context)


from django.shortcuts import render

def react_app(request):
    return render(request, 'chat.html')  # Name of the template


#django chat user data for customer, admin and vendor api
from django.http import JsonResponse


def user_data(request):
    # Get username or default to 'Guest' if unauthenticated
    username = request.user.username if request.user.is_authenticated else 'Guest'
    
    # Check if the user is an admin/superuser
    is_admin = request.user.is_superuser if request.user.is_authenticated else False
    
    # Retrieve user's profile picture, if it exists
    user_profile_picture = (
        request.user.profile.profile_picture.url 
        if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.profile_picture 
        else None
    )
    
    # Check if the user is a vendor and retrieve vendor details
    vendor = Vendor.objects.filter(user=request.user).first() if request.user.is_authenticated else None
    vendor_username = vendor.username if vendor else 'No Vendor'
    vendor_profile_picture = vendor.profile_picture.url if vendor and vendor.profile_picture else None

    return JsonResponse({
        'username': username,
        'vendor_username': vendor_username,
        'is_admin': is_admin,
        'user_profile_picture': user_profile_picture,
        'vendor_profile_picture': vendor_profile_picture,
        'is_vendor': bool(vendor)  # Explicitly return True/False for vendor status
    })










