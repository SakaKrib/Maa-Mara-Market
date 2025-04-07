from django import forms
from django_countries.fields import CountryField
from django_countries.widgets import CountrySelectWidget
from shop.models import Item
import uuid
from django.shortcuts import reverse
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Fieldset, HTML

PAYMENT_CHOICES = (
    ('S', 'stripe'),
    ('M', 'Mpesa'),
    ('P', 'PayPal')
)


class CheckOutForm(forms.Form):
    street_address = forms.CharField(widget=forms.TextInput(attrs={'placeholder':'Westlands, Nairobi'}))
    appartment_address = forms.CharField(required=False, widget=forms.TextInput(attrs={'placeholder':'Appartment or Suit No.'}))
    country = CountryField(blank_label='(select country)').formfield(widget=CountrySelectWidget(attrs={
        'class': 'custom-select'
    }))
    city = forms.CharField(widget=forms.TextInput(attrs={'placeholder': 'Nairobi'}))
    ZIP = forms.CharField(widget=forms.TextInput(attrs={'class': 'custom-select', 'placeholder': '0100'}))
    save_info = forms.BooleanField(required=False)
    same_billing_address = forms.BooleanField(widget=forms.CheckboxInput())
    payment_option = forms.ChoiceField(widget=forms.RadioSelect, choices= PAYMENT_CHOICES)
     


        
        
   
    


    



        
