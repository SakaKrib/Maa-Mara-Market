from django.test import TestCase

# Create your tests here.

 
class ProductFilterEndpointTests(TestCase):
    def test_filters_endpoint_supports_free_text_item_attributes(self):
        response = self.client.get("/filters/")

        self.assertEqual(
            response.status_code,
            200,
            response.content.decode("utf-8", errors="replace"),
        )
        payload = response.json()
        self.assertIn("attributes", payload)
        self.assertIsInstance(payload["attributes"], list)
