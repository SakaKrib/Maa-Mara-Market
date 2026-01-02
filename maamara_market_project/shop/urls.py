from django.urls import path
from .views import *

# ✅ Blog ViewSets
blog_list = BlogPostViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

blog_detail = BlogPostViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

# 💬 Comment on blog post
blog_comment = BlogPostViewSet.as_view({
    'post': 'comment',
})

# ❤️ React to blog post
blog_react = BlogPostViewSet.as_view({
    'post': 'react',
})

# 💔 Remove reaction
blog_remove_reaction = BlogPostViewSet.as_view({
    'delete': 'remove_reaction',
})

# Admin blog approval views
admin_blog_list = AdminBlogApprovalViewSet.as_view({
    'get': 'list',  # GET /api/admin/blogs/ -> fetch unapproved blogs
})

admin_blog_approve = AdminBlogApprovalViewSet.as_view({
    'post': 'approve',  # POST /api/admin/blogs/<pk>/approve/ -> approve a blog
})

urlpatterns = [
    path("filters/", filters_view, name="filters"),
    path("filter-products/", products_view, name="products"),
    path("api/brands/", list_brands, name="list_brands"),

    # blogs
    path("api/blogs/", blog_list, name="list_blogs"),
    path("api/blogs/<int:pk>/", blog_detail, name="blog_detail"),  # 👈 added pk here

      # 💬 Comments & Reactions
    path("api/blogs/<int:pk>/comment/", blog_comment, name="blog_comment"),
    path("api/blogs/<int:pk>/react/", blog_react, name="blog_react"),
    path("api/blogs/<int:pk>/remove_reaction/", blog_remove_reaction, name="blog_remove_reaction"),

    # popular blog
    path("api/blogs/popular/", PopularBlogPostsViewSet.as_view({"get": "list"}), name="popular_blogs"),

    # admin approve blog
    path("api/admin/blogs/", admin_blog_list, name="admin_blog_list"),
    path("api/admin-approve/blogs/<int:pk>/approve/", admin_blog_approve, name="admin_blog_approve"),

    # banners
    path("api/banners/", BannerViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
        'post': 'create',
    }), name="list_banners"),
    path("api/banners-list/", BannerListView.as_view(), name="banners-all"),

    # chat api
    path('api/upload/', FileUploadView.as_view(), name='file-upload'),


    #  wishlist
    path('api/wishlist/', WishlistAPIView.as_view(), name='wishlist'),               # GET for fetching items
    path('api/wishlist/add/<int:pk>/', WishlistAPIView.as_view(), name='wishlist-item'),  # POST
    path('api/wishlist/remove/<int:pk>/', WishlistAPIView.as_view(), name='wishlist-remove'),  # DELETE

]
