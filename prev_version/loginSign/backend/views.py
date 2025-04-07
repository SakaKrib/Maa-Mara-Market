from django.shortcuts import render, redirect
from django.contrib.auth.models import User, auth
from django.contrib import messages
from django.contrib.auth import authenticate, login
from items.views import HomeView

# backend/views.py
from items.models import Item  # Import the Item model from the items app
from items.models import Category

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
                return redirect('register')
            elif User.objects.filter(username=username).exists():
                messages.info(request, 'Username already exists')
                return redirect('register')
            else:
                user = User.objects.create_user(username=username, email=email, password=password2)
                user.first_name = firstname
                user.last_name = lastname
                user.save()
                return redirect('login')
        else:
            messages.info(request, 'Passwords do not match')
            return redirect('register')
    else:
        return render(request, 'register.html', {})

# Login platform on website



def login(request):
    if request.method == "POST":
        username = request.POST['username']
        password = request.POST['password']

        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth.login(request, user)
            return redirect('home')
        else:
            messages.info(request, 'Invalid Credentials')
            return redirect('login')
    else:
        return render(request, 'login.html', {})
    
    
    
