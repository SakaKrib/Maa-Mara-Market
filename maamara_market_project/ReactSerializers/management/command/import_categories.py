from django.core.management.base import BaseCommand
from ReactSerializers.models import Category, Department

departmentMap = {
    "Fashion & Apparel": {
        "categories": ["Men's Clothing", "Women's Clothing", "Kids & Baby Wear", "Shoes", "Accessories"],
        "subcategories": {
            "Men's Clothing": ["T-Shirts", "Jeans", "Suits", "Jackets", "Underwear"],
            "Women's Clothing": ["Dresses", "Tops", "Skirts", "Blouses", "Lingerie"],
            "Kids & Baby Wear": ["Baby Onesies", "Kids T-Shirts"],
            "Shoes": ["Sneakers", "Sandals", "Boots", "Heels"],
            "Accessories": ["Watches", "Bags", "Jewelry", "Belts", "Sunglasses"],
        },
    },
    "Home & Living": {
        "categories": ["Furniture", "Home Decor", "Kitchen & Dining", "Bedding & Bath", "Lighting"],
        "subcategories": {
            "Furniture": ["Sofas", "Tables", "Chairs", "Cabinets"],
            "Home Decor": ["Wall Art", "Vases", "Curtains", "Rugs"],
            "Kitchen & Dining": ["Cookware", "Cutlery", "Dinnerware", "Storage"],
            "Bedding & Bath": ["Bedsheets", "Blankets", "Towels", "Bath Mats"],
            "Lighting": ["Ceiling Lights", "Lamps", "LED Strips", "Outdoor Lights"],
        },
    },
    # Add all other departments here, exactly as in your JS object
    "Beauty & Personal Care": {
        "categories": ["Skincare", "Haircare", "Makeup", "Fragrances"],
        "subcategories": {
            "Skincare": ["Moisturizers", "Cleansers", "Serums", "Sunscreen"],
            "Haircare": ["Shampoo", "Conditioner", "Hair Oils", "Hair Dryers"],
            "Makeup": ["Foundation", "Lipstick", "Mascara", "Eyeshadow"],
            "Fragrances": ["Perfume", "Body Spray", "Cologne"],
            
        },
    },

    "Baby, Kids & Toys": {
        "categories": ["Toys & Games", "Baby Gear", "Kids' Furniture", "Educational"],
        "subcategories": {
            "Toys & Games": ["Action Figures", "Board Games", "Puzzles", "Stuffed Animals"],
            "Kids' Furniture": ["Cribs", "Study Desks", "Toy Storage"],
            "Educational": ["Books", "STEM Kits", "Flashcards"],
        },
    },

    "Automotive": {
        "categories": ["Car Accessories"],
        "subcategories": {
            "Car Accessories": ["Seat Covers", "Floor Mats", "Phone Mounts"],
            
        },
    },

    "Sports & Outdoors": {
        "categories": ["Fitness Equipment", "Outdoor Gear", "Camping & Hiking", "Sportswear"],
        "subcategories": {
            "Fitness Equipment": ["Dumbbells", "Yoga Mats", "Resistance Bands"],
            "Outdoor Gear": ["Tents", "Backpacks", "Water Bottles"],
            "Camping & Hiking": ["Sleeping Bags", "Lanterns", "Hiking Boots"],
            "Sportswear": ["Running Shoes", "Tracksuits", "Jerseys"],
        },
    },

    "Pets": {
        "categories": ["Pet Toys", "Grooming & Care", "Aquariums & Accessories"],
        "subcategories": {
            "Pet Toys": ["Chew Toys", "Balls", "Interactive Toys"],
            "Grooming & Care": ["Shampoo", "Brushes", "Nail Clippers"],
            "Aquariums & Accessories": ["Fish Tanks", "Filters", "Decor"],
        },
    },

    "Seasonal Specials": {
        "categories": ["Holiday Decor", "Back to School", "Gift Bundles"],
        "subcategories": {
            "Holiday Decor": ["Christmas Lights", "Ornaments", "Wreaths"],
            "Back to School": ["Stationery", "Backpacks", "Lunch Boxes"],
            "Gift Bundles": ["Beauty Sets", "Snack Hampers"],
        },
    },
}



class Command(BaseCommand):
    help = 'Import predefined categories and subcategories with departments'

    def handle(self, *args, **kwargs):
        for dept_name, data in departmentMap.items():
            # Get or create Department
            dept_obj, _ = Department.objects.get_or_create(name=dept_name)
            self.stdout.write(self.style.SUCCESS(f'Using Department: {dept_name}'))

            categories = data.get("categories", [])
            subcategories = data.get("subcategories", {})

            # Create main categories linked to department
            for cat_name in categories:
                cat_obj, created = Category.objects.get_or_create(name=cat_name, department=dept_obj)
                if created:
                    self.stdout.write(self.style.SUCCESS(f'Created category: {cat_name}'))
                else:
                    self.stdout.write(f'Category already exists: {cat_name}')

            # Create subcategories also linked to the same department
            for subcat_list in subcategories.values():
                for subcat_name in subcat_list:
                    subcat_obj, created = Category.objects.get_or_create(name=subcat_name, department=dept_obj)
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'Created subcategory: {subcat_name}'))
                    else:
                        self.stdout.write(f'Subcategory already exists: {subcat_name}')
