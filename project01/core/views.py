from django.shortcuts import render, redirect,get_object_or_404
from django.contrib.auth.models import User, auth
from django.contrib import messages
from django.contrib.auth import authenticate, login
from shop.views import HomeView
from django.shortcuts import render, redirect
from django.views import View

# backend/views.py
from shop.models import Item , Category # Import the Item model from the items app


def home_view(request):
   

    items = Item.objects.all()  # Fetch all items
    categories = Category.objects.all()  # Fetch all categories
    return render(request, 'index.html', {'items': items, 'categories': categories})  # Pass both items and categories to the template



# Create your views here.

# This is the main html template
def index(request):
    return render(request, "index.html", {})

def static(request):
    return render(request, "static/", {})

# Functions to link anchor text (a) to main html (index.html)
def contact(request):
    return render(request, "contact.html", {})

def about(request):
    return render(request, "about.html", {})

def donate(request):
    return render(request, "donate.html", {})

def community(request):
    return render(request, "community.html", {})

def returnPolicy(request):
    return render(request, "return.html", {})








def register(request):
    if request.method == 'POST':
        firstname = request.POST['First_name']
        lastname = request.POST['Sur_name']
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        password2 = request.POST['password2']

        if password == password2:
            if User.objects.filter(email=email).exists():
                messages.info(request, 'Email already used')
                return redirect('auth:register')
            elif User.objects.filter(username=username).exists():
                messages.info(request, 'Username already exists')
                return redirect('auth:register')
            else:
                user = User.objects.create_user(username=username, email=email, password=password2)
                user.first_name = firstname
                user.last_name = lastname
                user.save()
                messages.success(request, 'Account created successfully. Please complete your profile.')
                return redirect('auth:complete_account')  # Redirect to "Complete Account" page
        else:
            messages.info(request, 'Passwords do not match')
            return redirect('auth:register')
    else:
        return render(request, 'register.html', {})


# Login platform on website

from . models import Profile

def login(request):
    if request.method == "POST":
        username = request.POST['username']
        password = request.POST['password']
        
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Ensure the user has a profile
            Profile.objects.get_or_create(user=user)

            auth.login(request, user)
            # Check if the user's profile is incomplete
            if not user.profile.profile_picture or not user.profile.date_of_birth or not user.profile.location:
                messages.warning(request, 'Please complete your profile to enjoy all features.')
                return redirect('auth:complete_account')  # Redirect to "Complete Account" page
            return redirect('auth:home')
        else:
            messages.info(request, 'Invalid Credentials')
            return redirect('auth:login')
    else:
        return render(request, 'login.html', {})

    
#log out user
from django.contrib.auth import logout
from django.shortcuts import HttpResponse

def logout_view(request):
    if request.method == 'GET':
        logout(request)  # Logs out the user
        print("Logout function called")
        return HttpResponse('/')  # Redirect to homepage after logout



    



#complete account view
def complete_account(request):
    if request.method == 'POST':
        profile = request.user.profile
        profile.picture = request.FILES.get('picture')
        profile.date_of_birth = request.POST.get('date_of_birth')
        profile.location = request.POST.get('location')
        profile.save()
        messages.success(request, 'Profile updated successfully!')
        return redirect('auth:home')
    return render(request, 'complete_account.html', {})

    

    
    
