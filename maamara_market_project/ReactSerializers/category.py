from ReactSerializers.models import Category

categories_to_register = [
    "Men's Clothing", "Women's Clothing", "Kids & Baby Wear", "Shoes", "Accessories",
    "T-Shirts", "Jeans", "Suits", "Jackets", "Underwear",
    "Dresses", "Tops", "Skirts", "Blouses", "Lingerie",
    "Baby Onesies", "Kids T-Shirts",
    "Sneakers", "Sandals", "Boots", "Heels",
    "Watches", "Bags", "Jewelry", "Belts", "Sunglasses",
    "Furniture", "Home Decor", "Kitchen & Dining", "Bedding & Bath", "Lighting",
    "Sofas", "Tables", "Chairs", "Cabinets",
    "Wall Art", "Vases", "Curtains", "Rugs",
    "Cookware", "Cutlery", "Dinnerware", "Storage",
    "Bedsheets", "Blankets", "Towels", "Bath Mats",
    "Ceiling Lights", "Lamps", "LED Strips", "Outdoor Lights",
    "Stands", "Phone Stands", "Tablet Stands", "Laptop Stands", "Tv Stands",
    "Skincare", "Haircare", "Makeup", "Fragrances",
    "Moisturizers", "Cleansers", "Serums", "Sunscreen",
    "Shampoo", "Conditioner", "Hair Oils", "Hair Dryers",
    "Foundation", "Lipstick", "Mascara", "Eyeshadow",
    "Perfume", "Body Spray", "Cologne",
    "Toys & Games", "Baby Gear", "Kids' Furniture", "Educational",
    "Action Figures", "Board Games", "Puzzles", "Stuffed Animals",
    "Cribs", "Study Desks", "Toy Storage",
    "Books", "STEM Kits", "Flashcards",
    "Car Accessories", "Seat Covers", "Floor Mats", "Phone Mounts",
    "Fitness Equipment", "Outdoor Gear", "Camping & Hiking", "Sportswear",
    "Dumbbells", "Yoga Mats", "Resistance Bands",
    "Tents", "Backpacks", "Water Bottles",
    "Sleeping Bags", "Lanterns", "Hiking Boots",
    "Running Shoes", "Tracksuits", "Jerseys",
    "Pet Toys", "Grooming & Care", "Aquariums & Accessories",
    "Chew Toys", "Balls", "Interactive Toys",
    "Brushes", "Nail Clippers",  # Skip duplicate "Shampoo"
    "Fish Tanks", "Filters", "Decor",
    "Holiday Decor", "Back to School", "Gift Bundles",
    "Christmas Lights", "Ornaments", "Wreaths",
    "Stationery", "Lunch Boxes",  # Skip duplicate "Backpacks"
    "Beauty Sets", "Snack Hampers",
    "Luxury Beauty", "Spa Kits",
    "Artisan Crafts", "Handmade Decor", "Local Foods",
    "Beaded Jewelry", "Wood Carvings", "Textiles",
    "Chutneys", "Spices", "Snacks",
    "Woven Baskets", "Ceramics", "Wall Hangings"
]

for name in categories_to_register:
    _, created = Category.objects.get_or_create(name=name)
    print(f"{'✅ Created' if created else '✔️ Already exists'}: {name}")
