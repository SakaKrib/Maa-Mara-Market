from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from ReactSerializers import traffic_geo
from ReactSerializers.models import TrafficEvent


class CountryResolutionTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def test_time_zone_names_map_to_countries(self):
        self.assertEqual(traffic_geo.country_from_timezone("Africa/Nairobi"), "KE")
        self.assertEqual(traffic_geo.country_from_timezone("Africa/Kampala"), "UG")
        self.assertEqual(traffic_geo.country_from_timezone("Europe/London"), "GB")
        self.assertEqual(traffic_geo.country_from_timezone("nonsense"), "")
        self.assertEqual(traffic_geo.country_from_timezone(""), "")

    def test_country_names(self):
        self.assertEqual(traffic_geo.country_name_for("KE"), "Kenya")

    def test_cdn_header_wins(self):
        self.assertEqual(traffic_geo.resolve_country({"HTTP_CF_IPCOUNTRY": "ug"}, "8.8.8.8", "Africa/Nairobi")[0], "UG")

    def test_private_address_falls_back_to_the_browser_time_zone(self):
        code, name = traffic_geo.resolve_country({}, "172.20.0.1", "Africa/Nairobi")
        self.assertEqual((code, name), ("KE", "Kenya"))

    def test_nothing_known_gives_empty_not_a_wrong_country(self):
        self.assertEqual(traffic_geo.resolve_country({}, "127.0.0.1", ""), ("", ""))

    def test_ip_lookup_failure_is_not_remembered_for_long(self):
        with patch("ReactSerializers.traffic_geo._lookup_providers", return_value=iter(())):
            self.assertEqual(traffic_geo.country_from_ip("8.8.4.4"), ("", ""))
        with patch("ReactSerializers.traffic_geo._lookup_providers", return_value=iter([("US", "United States")])):
            cache.delete("traffic-geo:8.8.4.4")
            self.assertEqual(traffic_geo.country_from_ip("8.8.4.4")[0], "US")


class InboundTrafficTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_user(username=f"a-{uuid4().hex[:6]}", password="x", is_staff=True)

    def test_visits_are_located_and_events_are_counted(self):
        public = APIClient()
        for event_type in ("session_start", "page_view", "page_view"):
            response = public.post(
                "/api/traffic/record/",
                {"path": "/", "event_type": event_type, "session_id": "s1", "visitor_id": "v1", "timezone": "Africa/Nairobi"},
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(set(TrafficEvent.objects.values_list("country_code", flat=True)), {"KE"})

        admin = APIClient()
        admin.force_authenticate(self.admin)
        body = admin.get("/api/admin/inbound-traffic/?days=30").json()
        self.assertEqual(body["summary"]["countries"], 1)
        self.assertEqual(body["summary"]["events"], 3)
        self.assertEqual(body["summary"]["unlocated_views"], 0)
        self.assertEqual(body["countries"][0]["country_name"], "Kenya")

    def test_unlocated_visits_are_reported(self):
        TrafficEvent.objects.create(event_type="page_view", path="/", session_id="s2", visitor_id="v2")
        admin = APIClient()
        admin.force_authenticate(self.admin)
        body = admin.get("/api/admin/inbound-traffic/").json()
        self.assertEqual(body["summary"]["countries"], 0)
        self.assertEqual(body["summary"]["unlocated_views"], 1)


    def test_recent_visitors_group_multiple_sessions_into_one_journey(self):
        TrafficEvent.objects.create(
            event_type="session_start", path="/", session_id="session-a",
            visitor_id="returning-visitor", country_code="KE", country_name="Kenya",
        )
        TrafficEvent.objects.create(
            event_type="page_view", path="/", session_id="session-a",
            visitor_id="returning-visitor", country_code="KE", country_name="Kenya",
        )
        TrafficEvent.objects.create(
            event_type="page_view", path="/products", session_id="session-a",
            visitor_id="returning-visitor", country_code="KE", country_name="Kenya",
        )
        TrafficEvent.objects.create(
            event_type="session_start", path="/", session_id="session-b",
            visitor_id="returning-visitor", country_code="KE", country_name="Kenya",
        )
        TrafficEvent.objects.create(
            event_type="page_view", path="/cart", session_id="session-b",
            visitor_id="returning-visitor", country_code="KE", country_name="Kenya",
        )

        admin = APIClient()
        admin.force_authenticate(self.admin)
        body = admin.get("/api/admin/inbound-traffic/?days=30").json()

        self.assertEqual(body["summary"]["unique_visitors"], 1)
        self.assertEqual(len(body["recent_visitors"]), 1)
        visitor = body["recent_visitors"][0]
        self.assertEqual(visitor["visitor_id"], "returning-visitor")
        self.assertEqual(visitor["session_count"], 2)
        self.assertEqual(visitor["page_count"], 3)
        self.assertEqual(visitor["event_count"], 3)
        self.assertEqual([page["path"] for page in visitor["pages"]], ["/", "/products", "/cart"])

        detail = admin.get(
            "/api/admin/inbound-traffic/visitors/visitor:returning-visitor/"
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["session_count"], 2)
        self.assertEqual(len(detail.json()["activity"]), 3)

    def test_session_start_is_recorded_once_per_session(self):
        client = APIClient()
        payload = {
            "path": "/",
            "event_type": "session_start",
            "session_id": "one-session",
            "visitor_id": "one-visitor",
            "timezone": "Africa/Nairobi",
        }

        first = client.post("/api/traffic/record/", payload, format="json")
        second = client.post("/api/traffic/record/", payload, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(
            TrafficEvent.objects.filter(
                session_id="one-session", event_type="session_start"
            ).count(),
            1,
        )
