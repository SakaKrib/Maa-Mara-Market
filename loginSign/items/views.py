from django.shortcuts import render, get_object_or_404, redirect
from .models import Category, Item
from django.views.generic import ListView


def static(request):
    return render(request, "static/", {})


# Index view
def list_items(request):
    items = Item.objects.filter(is_sold=False)[0:6]
    categories = Category.objects.all()
    return render(request, 'category_list.html', {'categories': categories, 'items': items})

# List view for all categories
def category_list(request):
    categories = Category.objects.all()
    return render(request, 'category_list.html', {'categories': categories})

# Detail view for a single category
def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)
    items = Item.objects.filter(category=category)
    return render(request, 'categories/category_detail.html', {'category': category, 'items': items})

# List view for all items
def item_list(request):
    items = Item.objects.all()
    return render(request, 'items/item_list.html', {'items': items})

# Detail view for a single item
def item_detail(request, pk):
    item = get_object_or_404(Item, pk=pk)
   
    return render(request, 'items/item_detail.html', {'item': item})


class HomeView(ListView):
    model = Item
    template_name = "index.html"

def checkout(request):
    return render(request, "check_out.html")    


def products(request):
    context = {
        'items': Item.objects.all()
    }
    return render(request, "products.html", context)









