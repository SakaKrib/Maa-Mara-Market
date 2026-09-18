class SectionSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ["id", "name", "departments"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "department"]


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ["id", "name", "category"]


class SizeStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeStock
        fields = ["id", "size", "quantity_in_stock"]


class AgeVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgeVariant
        fields = ["id", "age_group", "quantity_in_stock"]


class WeightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Weight
        fields = ["id", "value", "unit"]


class LengthSerializer(serializers.ModelSerializer):
    class Meta:
        model = Length
        fields = ["id", "value", "unit"]


class ShoeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shoe
        fields = ["id", "shoe_type", "shoe_gender", "shoe_size"]


class ColorVariantSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)
    sizes = SizeStockSerializer(many=True, read_only=True)

    class Meta:
        model = ColorVariant
        fields = ["id", "color", "image", "sizes"]


class ReactionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Reaction
        fields = ["id", "user", "reaction_type", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    reactions = ReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "rating", "review_text", "created_at", "reactions"]


class ItemSerializer(serializers.ModelSerializer):
    section = serializers.StringRelatedField()
    department = serializers.StringRelatedField()
    category = serializers.StringRelatedField()
    subcategory = serializers.StringRelatedField()