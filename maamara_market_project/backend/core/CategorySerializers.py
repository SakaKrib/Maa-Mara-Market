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
        items_qs = getattr(obj, "prefetched_items", None)
        if items_qs is None:
            items_qs = obj.items.all()
        return ItemSerializer(items_qs, many=True).data    

class CategorySerializerCat(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'subcategories']

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
