from django import forms
from shop.models import Item
from vendorDashboard.models import PersistentItemData
import uuid
from django.utils.text import slugify

class ItemForm(forms.ModelForm):
    class Meta:
        model = Item
        fields = [
            'category', 'image', 'name', 'description', 'size', 'gender_based', 
            'children_size_based_age', 'price', 'in_stock',
        ]

    def save(self, commit=True, vendor=None):
        print("Custom save() method is running") 
        item = super().save(commit=False)  # Save the Item object without committing to the database
        print("Item object prepared for saving:", item)  # Debug

       
        
        if commit:
            item.save()
            print("Item saved:", item)  # Debug

            try:
                # Create the PersistentItemData
                persistent_item = PersistentItemData.objects.create(
                    vendor=vendor,
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
                    created_by=item.created_by,  # Ensure this field is correctly set
                    available=item.available,
                    slug=item.slug
                )
                print("PersistentItemData created:", persistent_item)  # Debug
            except Exception as e:
                print(f"Error creating PersistentItemData: {e}")  # Debug errors
        return item
    

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Set custom widgets dynamically
        self.fields['size'].widget = forms.Select(choices=Item.SIZE_CHOICES)
        self.fields['gender_based'].widget = forms.Select(choices=Item.GENDER_CHOICES)
        self.fields['children_size_based_age'].widget = forms.Select(choices=Item.AGE_CHOICES)



    def clean(self):
        cleaned_data = super().clean()

        # Iterate through all fields in the form
        for field_name, field_value in cleaned_data.items():
            # Validate only required fields
            if not field_value and self.fields[field_name].required:
                self.add_error(field_name, f"{self.fields[field_name].label or field_name.replace('_', ' ').capitalize()} is required")
        
        return cleaned_data

