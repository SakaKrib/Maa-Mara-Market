from django.urls import path, include
from .views import *
from .discovery import discovery_feed, multi_collections
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"banners", BannerViewSet, basename="banners")
router.register(r"vendor-blogs", BlogPostViewSet, basename="vendor-blogs")
router.register(r"api/moderation/banners", AdminBannerApprovalViewSet, basename="moderation-banners")
router.register(r"vendor/banners", VendorBannerViewSet, basename="vendor-banners")
router.register(r"vendor/blogs", VendorBlogViewSet, basename="vendorBlogs")
router.register(r"vendor/items", VendorItemRequestViewSet, basename="vendor-items")

vendor_blog_list = VendorBlogViewSet.as_view({"get": "list", "post": "create"})
vendor_blog_detail = VendorBlogViewSet.as_view({
    "get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"
})
blog_list = BlogPostViewSet.as_view({"get": "list", "post": "create"})
blog_detail = BlogPostViewSet.as_view({
    "get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"
})
blog_comment = BlogPostViewSet.as_view({"post": "comment"})
blog_react = BlogPostViewSet.as_view({"post": "react"})
blog_remove_reaction = BlogPostViewSet.as_view({"delete": "remove_reaction"})
admin_blog_list = AdminBlogApprovalViewSet.as_view({"get": "list"})
admin_blog_approve = AdminBlogApprovalViewSet.as_view({"post": "approve"})

urlpatterns = [
    path("", include(router.urls)),
    path("api/vendor/blogs/", vendor_blog_list, name="vendor-blog-list"),
    path("api/vendor/blogs/<int:pk>/", vendor_blog_detail, name="vendor-blog-detail"),
    path("api/vendor/banners/<int:pk>/", banner_detail, name="banner-detail"),
    path("api/vendor/history/timeline/", VendorHistoryTimelineView.as_view(), name="vendor-history-timeline"),
    path("filters/", filters_view, name="filters"),
    path("filter-products/", products_view, name="products"),
    path("api/brands/", list_brands, name="list_brands"),
    path("api/discovery/", discovery_feed, name="discovery-feed"),
    path("api/multi-collections/", multi_collections, name="multi-collections"),
    path("api/blogs/", blog_list, name="list_blogs"),
    path("api/blogs/<int:pk>/", blog_detail, name="blog_detail"),
    path("api/blogs/<int:pk>/comment/", blog_comment, name="blog_comment"),
    path("api/blogs/<int:pk>/react/", blog_react, name="blog_react"),
    path("api/blogs/<int:pk>/remove_reaction/", blog_remove_reaction, name="blog_remove_reaction"),
    path("api/blogs/popular/", PopularBlogPostsViewSet.as_view({"get": "list"}), name="popular_blogs"),
    path("api/admin/blogs/", admin_blog_list, name="admin_blog_list"),
    path("api/admin-approve/blogs/<int:pk>/approve/", admin_blog_approve, name="admin_blog_approve"),
    path("api/banners-list/", BannerListView.as_view(), name="banners-all"),
    path("api/upload/", FileUploadView.as_view(), name="file-upload"),
    path("api/wishlist/", WishlistAPIView.as_view(), name="wishlist"),
    path("api/wishlist/add/<int:pk>/", WishlistAPIView.as_view(), name="wishlist-item"),
    path("api/wishlist/remove/<int:pk>/", WishlistAPIView.as_view(), name="wishlist-remove"),
    path("api/rate-V/<int:vendor_id>/rate/", VendorRatingView.as_view(), name="vendor-rate"),
    path("api/vendor-reviews/", VendorReviewsUnifiedView.as_view(), name="vendor-rating-page"),
]
