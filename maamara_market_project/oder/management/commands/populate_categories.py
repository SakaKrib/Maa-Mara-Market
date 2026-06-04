from django.core.management.base import BaseCommand
from ReactSerializers.models import Category, Department, SubCategory, Section

departmentMap = {
    "Fashion & Apparel": {
            "categories": [
                "Men's Clothing",
                "Women's Clothing",
                "Kids & Baby Wear",
                "Shoes",
                "Accessories"
            ],
            "subcategories": {
                "Men's Clothing": [
                    "T-Shirts", "Polos", "Dress Shirts", "Sweaters & Sweatshirts",
                    "Hoodies & Pullovers", "Jackets & Coats", "Jeans",
                    "Pants & Chinos", "Shorts", "Suits & Sport Coats",
                    "Activewear", "Underwear & Socks", "Swimwear",
                    "Big & Tall", "Accessories"
                ],
                "Women's Clothing": [
                    "Dresses", "Tops & T-Shirts", "Blouses & Shirts",
                    "Sweaters & Cardigans", "Jackets & Coats", "Jeans",
                    "Pants & Leggings", "Skirts", "Shorts", "Activewear",
                    "Lingerie, Sleep & Lounge", "Suits & Blazers",
                    "Swimwear", "Maternity", "Plus Size", "Accessories"
                ],
                "Kids & Baby Wear": [
                    "Baby Onesies", "Kids T-Shirts", "Baby Gear",
                    "Kids’ Footwear", "Kids Accessories"
                ],
                "Shoes": [
                    "Sneakers", "Sandals", "Boots", "Heels",
                    "Flats", "Loafers", "Running Shoes"
                ],
                "Accessories": [
                    "Watches", "Bags", "Jewelry", "Belts",
                    "Sunglasses", "Scarves", "Hats", "Gloves"
                ],
            },
        },

        "Home & Living": {
            "categories": [
                "Furniture", "Home Decor", "Kitchen & Dining",
                "Bedding & Bath", "Lighting"
            ],
            "subcategories": {
                "Furniture": ["Sofas", "Tables", "Chairs", "Cabinets"],
                "Home Decor": ["Wall Art", "Vases", "Curtains", "Rugs", "Carpets"],
                "Kitchen & Dining": [
                    "Cookware", "Cutlery", "Dinnerware",
                    "Storage", "Placemats", "Saviet Holders"
                ],
                "Bedding & Bath": [
                    "Bedsheets", "Blankets", "Towels",
                    "Bath Mats", "Soap Dish", "Bath Soap"
                ],
                "Lighting": [
                    "Ceiling Lights", "Lamps", "LED Strips",
                    "Outdoor Lights", "Lampshades"
                ],
            },
        },

        "Beauty & Personal Care": {
            "categories": ["Skincare", "Haircare", "Makeup", "Fragrances"],
            "subcategories": {
                "Skincare": [
                    "Moisturizers", "Cleansers", "Serums",
                    "Sunscreen", "Face Toner", "Body Lotions", "Face Oil"
                ],
                "Haircare": ["Shampoo", "Conditioner", "Hair Oils", "Hair Dryers"],
                "Makeup": ["Foundation", "Lipstick", "Mascara", "Eyeshadow", "Lipbalm"],
                "Fragrances": ["Perfume", "Body Spray", "Cologne"],
            },
        },

        "Baby, Kids & Toys": {
            "categories": [
                "Toys & Games", "Baby Gear",
                "Kids' Furniture", "Educational"
            ],
            "subcategories": {
                "Toys & Games": [
                    "Action Figures", "Board Games",
                    "Puzzles", "Stuffed Animals"
                ],
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
            "categories": [
                "Fitness Equipment", "Outdoor Gear",
                "Camping & Hiking", "Sportswear"
            ],
            "subcategories": {
                "Fitness Equipment": ["Dumbbells", "Yoga Mats", "Resistance Bands"],
                "Outdoor Gear": ["Tents", "Backpacks", "Water Bottles"],
                "Camping & Hiking": [
                    "Sleeping Bags", "Lanterns",
                    "Hiking Boots", "Picnic Blankets"
                ],
                "Sportswear": ["Running Shoes", "Tracksuits", "Jerseys"],
            },
        },

        "Pets": {
            "categories": [
                "Pet Toys", "Grooming & Care",
                "Aquariums & Accessories"
            ],
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


# organic
organicDepartmentMap = {
    "Organic Foods": {
        "categories": ["Vegetables", "Fruits", "Grains & Legumes", "Proteins", "Pantry Staples"],
        "subcategories": {
            "Vegetables": ["Sukuma Wiki (Collard Greens)", "Spinach", "Tomatoes", "Onions", "Carrots", "Cabbage", "Broccoli", "Zucchini"],
            "Fruits": ["Bananas", "Apples", "Mangoes", "Berries", "Citrus Fruits", "Avocado", "Pineapples", "Papaya"],
            "Grains & Legumes": ["Rice", "Maize", "Millet", "Quinoa", "Beans", "Lentils", "Green Grams (Ndengu)"],
            "Proteins": ["Chicken", "Eggs", "Beef", "Fish", "Goat Meat"],
            "Pantry Staples": ["Peanut Butter", "Honey", "Cooking Oil", "Flour (Maize, Cassava, Wheat)"],
        },
    },
    "Organic Drinks": {
        "categories": ["Juices", "Herbal Teas", "Coffee & Cocoa"],
        "subcategories": {
            "Juices": ["Fruit Juice", "Vegetable Juice"],
            "Herbal Teas": ["Green Tea", "Chamomile", "Hibiscus", "Lemongrass"],
            "Coffee & Cocoa": ["Coffee", "Chocolate", "Cocoa Powder"],
        },
    },
    "Organic Condiments & Spices": {
        "categories": ["Spices", "Sauces", "Herbs"],
        "subcategories": {
            "Spices": ["Cinnamon", "Turmeric", "Black Pepper", "Cloves", "Coriander", "Ginger Powder"],
            "Sauces": ["Tomato Sauce", "Chili Sauce", "Soy Sauce (Organic)", "Barbecue Sauce"],
            "Herbs": ["Basil", "Oregano", "Rosemary", "Thyme", "Mint"],
        },
    },
}




class Command(BaseCommand):
    help = "Import predefined categories and subcategories with departments and sections"

    def handle(self, *args, **kwargs):
        # 1️⃣ General departments (Fashion, Beauty, etc.)
        general_section, _ = Section.objects.get_or_create(name="general")
        for dept_name, data in departmentMap.items():
            dept_obj, _ = Department.objects.get_or_create(
                name=dept_name, section=general_section
            )
            self.stdout.write(self.style.SUCCESS(f"[General] Using Department: {dept_name}"))

            self._create_categories_and_subcategories(data, dept_obj)

        # 2️⃣ Organic departments (Organic Foods, Organic Drinks, etc.)
        organic_section, _ = Section.objects.get_or_create(name="organic")
        for dept_name, data in organicDepartmentMap.items():
            dept_obj, _ = Department.objects.get_or_create(
                name=dept_name, section=organic_section
            )
            self.stdout.write(self.style.SUCCESS(f"[Organic] Using Department: {dept_name}"))

            self._create_categories_and_subcategories(data, dept_obj)

        # 3️⃣ Inorganic section (catch-all for non-organic items)
        inorganic_section, created = Section.objects.get_or_create(name="inorganic")
        if created:
            self.stdout.write(self.style.SUCCESS("[Inorganic] Section created as catch-all for non-organic items"))

    def _create_categories_and_subcategories(self, data, dept_obj):
        """Helper to avoid repetition"""
        categories = data.get("categories", [])
        subcategories = data.get("subcategories", {})

        for cat_name in categories:
            cat_obj, created = Category.objects.get_or_create(
                name=cat_name, department=dept_obj
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created category: {cat_name}"))
            else:
                self.stdout.write(f"  Category already exists: {cat_name}")

            # Subcategories
            for subcat_name in subcategories.get(cat_name, []):
                subcat_obj, created = SubCategory.objects.get_or_create(
                    name=subcat_name, category=cat_obj
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"    ↳ Created subcategory: {subcat_name}"))
                else:
                    self.stdout.write(f"    ↳ Subcategory already exists: {subcat_name}")
