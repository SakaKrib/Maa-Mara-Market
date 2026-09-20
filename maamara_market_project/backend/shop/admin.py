from django.contrib import admin
from .models import Review, Reaction, Banner, ChatFile, BlogPost, CommentBlog, ReactionBlog, Wishlist, CareerVacancy, JobApplication

# Register your models here.


admin.site.register(Review)
admin.site.register(Reaction)
admin.site.register(Banner)
admin.site.register(ChatFile)
admin.site.register(BlogPost)
admin.site.register(CommentBlog)
admin.site.register(ReactionBlog)
admin.site.register(Wishlist)



# class OrganicSubCategoryInline(admin.TabularInline):
#     model = OrganicSubCategory
#     extra = 1  # Allows adding new subcategories within category admin

# class OrganicCategoryAdmin(admin.ModelAdmin):
#     list_display = ('name',)  # Show categories in admin
#     inlines = [OrganicSubCategoryInline]  # Embed subcategories within category admin

# class OrganicSubCategoryAdmin(admin.ModelAdmin):
#     list_display = ('name', 'category')  # Show subcategories properly
#     search_fields = ('name', 'category__name')

# admin.site.register(OrganicCategory, OrganicCategoryAdmin)
# admin.site.register(OrganicSubCategory, OrganicSubCategoryAdmin)


admin.site.register(CareerVacancy)
admin.site.register(JobApplication)
