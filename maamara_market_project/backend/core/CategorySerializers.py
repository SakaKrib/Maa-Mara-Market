from rest_framework import serializers
from ReactSerializers.models import Section, Department, Category, SubCategory
from ReactSerializers.Serializers import ItemSerializer

class SubCategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'items']

    def get_items(self, obj):
        # Fetch related items for this subcategory
        items_qs = obj.items.all()
        return ItemSerializer(items_qs, many=True).data    

class CategorySerializerCat(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'subcategories']

    def get_subcategories(self, obj):
        # Use the prefetched subcategories
        subcategories = getattr(obj, 'prefetched_subcategories', [])
        return SubCategorySerializer(subcategories, many=True).data    

class DepartmentSerializer(serializers.ModelSerializer):
    categories = CategorySerializerCat(many=True, read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'categories']

class SectionSerializerCat(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'name', 'departments']
