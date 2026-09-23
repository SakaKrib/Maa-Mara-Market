from django.db import models
from django.contrib.auth.models import User
from ReactSerializers.models import Item, ColorVariant, AgeVariant, SizeStock
from django.shortcuts import reverse
from django.conf import settings
from django_countries.fields import CountryField
from core.models import Wallet, Voucher, Referral
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal, InvalidOperation
import math
import uuid
from .Base import get_usd_to_kes_rate

#billing address model
