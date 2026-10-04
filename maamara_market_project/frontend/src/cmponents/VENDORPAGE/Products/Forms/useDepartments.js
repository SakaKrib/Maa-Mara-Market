// Canonical frontend copy of backend/order/management/commands/populate_categories.py.
// Keep this file synchronized with the backend management command.
// This is intentionally local/static data: AddingNewItem does not need a category API request.

const departmentMap = {
  "Fashion & Apparel": {
    categories: ["Men's Clothing", "Women's Clothing", "Kids & Baby Wear", "Shoes", "Accessories"],
    subcategories: {
      "Men's Clothing": ["T-Shirts", "Polos", "Dress Shirts", "Sweaters & Sweatshirts", "Hoodies & Pullovers", "Jackets & Coats", "Jeans", "Pants & Chinos", "Shorts", "Suits & Sport Coats", "Activewear", "Underwear & Socks", "Swimwear", "Big & Tall", "Accessories"],
      "Women's Clothing": ["Dresses", "Tops & T-Shirts", "Blouses & Shirts", "Sweaters & Cardigans", "Jackets & Coats", "Jeans", "Pants & Leggings", "Skirts", "Shorts", "Activewear", "Lingerie, Sleep & Lounge", "Suits & Blazers", "Swimwear", "Maternity", "Plus Size", "Accessories"],
      "Kids & Baby Wear": ["Baby Onesies", "Kids T-Shirts", "Baby Gear", "Kids’ Footwear", "Kids Accessories"],
      Shoes: ["Sneakers", "Sandals", "Boots", "Heels", "Flats", "Loafers", "Running Shoes"],
      Accessories: ["Watches", "Bags", "Jewelry", "Belts", "Sunglasses", "Scarves", "Hats", "Gloves"],
    },
  },
  "Home & Living": {
    categories: ["Furniture", "Home Decor", "Kitchen & Dining", "Bedding & Bath", "Lighting"],
    subcategories: {
      Furniture: ["Sofas", "Tables", "Chairs", "Cabinets"],
      "Home Decor": ["Wall Art", "Vases", "Curtains", "Rugs", "Carpets"],
      "Kitchen & Dining": ["Cookware", "Cutlery", "Dinnerware", "Storage", "Placemats", "Saviet Holders"],
      "Bedding & Bath": ["Bedsheets", "Blankets", "Towels", "Bath Mats", "Soap Dish", "Bath Soap"],
      Lighting: ["Ceiling Lights", "Lamps", "LED Strips", "Outdoor Lights", "Lampshades"],
    },
  },
  "Beauty & Personal Care": {
    categories: ["Skincare", "Haircare", "Makeup", "Fragrances"],
    subcategories: {
      Skincare: ["Moisturizers", "Cleansers", "Serums", "Sunscreen", "Face Toner", "Body Lotions", "Face Oil"],
      Haircare: ["Shampoo", "Conditioner", "Hair Oils", "Hair Dryers"],
      Makeup: ["Foundation", "Lipstick", "Mascara", "Eyeshadow", "Lipbalm"],
      Fragrances: ["Perfume", "Body Spray", "Cologne"],
    },
  },
  "Baby, Kids & Toys": {
    categories: ["Toys & Games", "Baby Gear", "Kids' Furniture", "Educational"],
    subcategories: {
      "Toys & Games": ["Action Figures", "Board Games", "Puzzles", "Stuffed Animals"],
      "Kids' Furniture": ["Cribs", "Study Desks", "Toy Storage"],
      Educational: ["Books", "STEM Kits", "Flashcards"],
    },
  },
  Automotive: {
    categories: ["Car Accessories"],
    subcategories: { "Car Accessories": ["Seat Covers", "Floor Mats", "Phone Mounts"] },
  },
  "Sports & Outdoors": {
    categories: ["Fitness Equipment", "Outdoor Gear", "Camping & Hiking", "Sportswear"],
    subcategories: {
      "Fitness Equipment": ["Dumbbells", "Yoga Mats", "Resistance Bands"],
      "Outdoor Gear": ["Tents", "Backpacks", "Water Bottles"],
      "Camping & Hiking": ["Sleeping Bags", "Lanterns", "Hiking Boots", "Picnic Blankets"],
      Sportswear: ["Running Shoes", "Tracksuits", "Jerseys"],
    },
  },
  Pets: {
    categories: ["Pet Toys", "Grooming & Care", "Aquariums & Accessories"],
    subcategories: {
      "Pet Toys": ["Chew Toys", "Balls", "Interactive Toys"],
      "Grooming & Care": ["Shampoo", "Brushes", "Nail Clippers"],
      "Aquariums & Accessories": ["Fish Tanks", "Filters", "Decor"],
    },
  },
  "Seasonal Specials": {
    categories: ["Holiday Decor", "Back to School", "Gift Bundles"],
    subcategories: {
      "Holiday Decor": ["Christmas Lights", "Ornaments", "Wreaths"],
      "Back to School": ["Stationery", "Backpacks", "Lunch Boxes"],
      "Gift Bundles": ["Beauty Sets", "Snack Hampers"],
    },
  },
};

const organicDepartmentMap = {
  "Organic Foods": {
    categories: ["Vegetables", "Fruits", "Grains & Legumes", "Proteins", "Pantry Staples"],
    subcategories: {
      Vegetables: ["Sukuma Wiki (Collard Greens)", "Spinach", "Tomatoes", "Onions", "Carrots", "Cabbage", "Broccoli", "Zucchini"],
      Fruits: ["Bananas", "Apples", "Mangoes", "Berries", "Citrus Fruits", "Avocado", "Pineapples", "Papaya"],
      "Grains & Legumes": ["Rice", "Maize", "Millet", "Quinoa", "Beans", "Lentils", "Green Grams (Ndengu)"],
      Proteins: ["Chicken", "Eggs", "Beef", "Fish", "Goat Meat"],
      "Pantry Staples": ["Peanut Butter", "Honey", "Cooking Oil", "Flour (Maize, Cassava, Wheat)"],
    },
  },
  "Organic Drinks": {
    categories: ["Juices", "Herbal Teas", "Coffee & Cocoa"],
    subcategories: {
      Juices: ["Fruit Juice", "Vegetable Juice"],
      "Herbal Teas": ["Green Tea", "Chamomile", "Hibiscus", "Lemongrass"],
      "Coffee & Cocoa": ["Coffee", "Chocolate", "Cocoa Powder"],
    },
  },
  "Organic Condiments & Spices": {
    categories: ["Spices", "Sauces", "Herbs"],
    subcategories: {
      Spices: ["Cinnamon", "Turmeric", "Black Pepper", "Cloves", "Coriander", "Ginger Powder"],
      Sauces: ["Tomato Sauce", "Chili Sauce", "Soy Sauce (Organic)", "Barbecue Sauce"],
      Herbs: ["Basil", "Oregano", "Rosemary", "Thyme", "Mint"],
    },
  },
};

export const useDepartments = () => ({ departmentMap, organicDepartmentMap });
export { departmentMap, organicDepartmentMap };
