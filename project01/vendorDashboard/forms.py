from django import forms
from vendorDashboard.models import Vendor
from django.core.exceptions import ValidationError  # To raise errors properly
import re

class VendorForm(forms.ModelForm):
    # Personal Details (Required)
    surname_name = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'Ogola'}),
        label="Surname (Last Name)",
        required=True
    )
    middle_name = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'John'}),
        label="Middle Name",
        required=False
    )
    first_name = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'James'}),
        label="First Name",
        required=True
    )
    phone_number = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': '+254701234567'}),
        label="Phone Number",
        required=True
    )
    username = forms.CharField(
        widget=forms.EmailInput(attrs={'placeholder': 'william21', 'autocomplete': 'off'}),
        label="Username",
        required=False
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'placeholder': 'jamesbruce@gmail.com', 'autocomplete': 'off'}),
        label="Email Address",
        required=True
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Create a secure password', 'autocomplete': 'new-password'}),
        label="Password",
        required=True
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Confirm your password'}),
        label="Confirm Password",
        required=True
    )
    id_number = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'Enter ID Number'}),
        label="ID Number",
        required=True
    )
    
    # Company Details
    company_name = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'e.g., Acme Corp.'}),
        label="Company Name",
        required=True
    )
    workshop_location = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'e.g., 123 Market Street, Nairobi', 'rows': 3}),
        label="Workshop Location",
        required=True
    )
    product_type = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'e.g., Handcrafted Furniture'}),
        label="Goods To Be Sold",
        required=True
    )
    company_logo = forms.ImageField(
        label="Company Logo (optional)",
        required=False
    )
    
    # Payment Details
    payment_method = forms.ChoiceField(
        choices=Vendor.PAYMENT_METHOD_CHOICES,
        widget=forms.Select(),
        label="Payment Method",
        required=True
    )
    bank_account_number = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'e.g., 0123456789012'}),
        label="Bank Account Number",
        required=True
    )
    mpesa_number = forms.CharField(
        widget=forms.TextInput(attrs={'placeholder': 'e.g., +254701234567'}),
        label="M-Pesa Number",
        required=True
    )

    # Optional Details
    tax_number = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'placeholder': 'e.g., P12345678'}),
        label="Tax Number"
    )
    website_url = forms.URLField(
        required=False,
        widget=forms.URLInput(attrs={'placeholder': 'https://www.example.com'}),
        label="Website URL"
    )
    profile_picture = forms.ImageField(
        required=False,
        label="Profile Picture"
    )
    social_media_links = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'placeholder': 'Add JSON links, e.g., {"facebook": "url"}'}),
        label="Social Media Links"
    )
    
    class Meta:
        model = Vendor
        fields = [
            'surname_name', 'middle_name', 'first_name', 'phone_number', 'username', 'email',
            'id_number', 'password', 'confirm_password', 'company_name',
            'workshop_location', 'product_type', 'payment_method',
            'bank_account_number', 'mpesa_number', 'tax_number', 'website_url',
            'profile_picture', 'social_media_links'
        ]

    #check and enhace password security
    def clean_password(self):
        password = self.cleaned_data.get("password")
        
        # Validate password complexity
        if not re.search(r'[A-Z]', password):
            raise ValidationError("The password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', password):
            raise ValidationError("The password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', password):
            raise ValidationError("The password must contain at least one digit.")
        if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
            raise ValidationError("The password must contain at least one special character (e.g., !@#$%^&*).")
        if len(password) < 8:
            raise ValidationError("The password must be at least 8 characters long.")
        
        # If everything is valid, return the password
        return password    

    #check password if the match
    def clean(self):
        cleaned_data = super().clean()

        # Iterate through all fields in the form
        for field_name, field in self.fields.items():
            field_value = cleaned_data.get(field_name)

            # Validate only required fields
            if field.required and not field_value:
                self.add_error(field_name, f"{field.label or field_name.replace('_', ' ').capitalize()} is required")

        # Example for specific field validation
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        if password and confirm_password and password != confirm_password:
            self.add_error("confirm_password", "Passwords do not match!")

        return cleaned_data




    
            
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class VendorLoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)


    #remove autocomplete on form
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Disable autocomplete for username and password fields
        self.fields['email'].widget.attrs['autocomplete'] = 'off'
        self.fields['password'].widget.attrs['autocomplete'] = 'off'



    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get('email')
        user = User.objects.filter(email=email).first()

        if user:
            # Check if the user is linked to a vendor
            if not hasattr(user, 'vendor'):
                raise ValidationError("This account is not registered as a vendor.")
        return cleaned_data
    
#vendor profile form

class VendorProfileForm(forms.ModelForm):
    class Meta:
        model = Vendor
        fields = [
            'surname_name', 'middle_name', 'first_name', 'phone_number', 'username', 'email',
            'id_number', 'password', 'company_name',
            'workshop_location', 'product_type', 'vendor_company_logo', 'payment_method',
            'bank_account_number', 'mpesa_number', 'tax_number', 'website_url',
            'profile_picture', 'social_media_links'
        ]
        widgets = {
            'surname_name': forms.TextInput(attrs={'placeholder': 'Surname Name'}),
            'middle_name': forms.TextInput(attrs={'placeholder': 'Middle Name'}),
            'first_name': forms.TextInput(attrs={'placeholder': 'First Name'}),
            'phone_number': forms.TextInput(attrs={'placeholder': 'Phone Number'}),
            'email': forms.EmailInput(attrs={'placeholder': 'Email Address'}),
            'id_number': forms.TextInput(attrs={'placeholder': 'ID Number'}),
            'password': forms.PasswordInput(attrs={'placeholder': 'Password'}),
            'company_name': forms.TextInput(attrs={'placeholder': 'Company Name'}),
            'workshop_location': forms.TextInput(attrs={'placeholder': 'Workshop Location'}),
            'product_type': forms.TextInput(attrs={'placeholder': 'Product Type'}),
            'vendor_company_logo': forms.FileInput(),
            'payment_method': forms.Select(choices=[('bank', 'Bank'), ('mpesa', 'Mpesa')]),
            'bank_account_number': forms.TextInput(attrs={'placeholder': 'Bank Account Number'}),
            'mpesa_number': forms.TextInput(attrs={'placeholder': 'Mpesa Number'}),
            'tax_number': forms.TextInput(attrs={'placeholder': 'Tax Number'}),
            'website_url': forms.URLInput(attrs={'placeholder': 'Website URL'}),
            'profile_picture': forms.FileInput(),
            'social_media_links': forms.Textarea(attrs={'placeholder': 'Social Media Links', 'rows': 3}),
        }


        