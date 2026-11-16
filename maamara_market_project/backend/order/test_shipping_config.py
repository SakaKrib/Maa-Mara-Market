from unittest import mock

from django.test import SimpleTestCase, override_settings

from order import shipping

ORDER = object()
DEST = {"postalCode": "SW1A 1AA", "cityName": "London", "countryCode": "GB"}


class CarrierRatesSwitchTests(SimpleTestCase):
    @override_settings(SHIPPING_RATES_ENABLED=False)
    def test_rates_are_not_requested_while_the_switch_is_off(self):
        with mock.patch.object(shipping, "_dhl_rates", side_effect=AssertionError("called")), \
                mock.patch.object(shipping, "_fedex_rates", side_effect=AssertionError("called")):
            self.assertEqual(shipping.get_rates_for_destination(ORDER, DEST), ([], []))

    @override_settings(SHIPPING_RATES_ENABLED=True)
    def test_rates_from_both_carriers_are_returned_when_the_switch_is_on(self):
        dhl = [{"provider": "DHL", "service": "Express", "price": "10.00", "currency": "KES"}]
        fedex = [{"provider": "FedEx", "service": "Priority", "price": "12.00", "currency": "KES"}]
        with mock.patch.object(shipping, "_dhl_rates", return_value=dhl), \
                mock.patch.object(shipping, "_fedex_rates", return_value=fedex):
            rates, errors = shipping.get_rates_for_destination(ORDER, DEST)
        self.assertEqual({r["provider"] for r in rates}, {"DHL", "FedEx"})
        self.assertEqual(errors, [])

    @override_settings(SHIPPING_RATES_ENABLED=True)
    def test_one_failing_carrier_does_not_hide_the_other(self):
        import requests
        fedex = [{"provider": "FedEx", "service": "Priority", "price": "12.00", "currency": "KES"}]
        with mock.patch.object(shipping, "_dhl_rates", side_effect=requests.exceptions.Timeout()), \
                mock.patch.object(shipping, "_fedex_rates", return_value=fedex):
            rates, errors = shipping.get_rates_for_destination(ORDER, DEST)
        self.assertEqual([r["provider"] for r in rates], ["FedEx"])
        self.assertEqual(errors, ["DHL"])


class DhlAuthorizationTests(SimpleTestCase):
    def test_key_and_secret_are_sent_as_basic_credentials(self):
        header = shipping._dhl_authorization({"api_key": "key", "api_secret": "secret"})
        self.assertEqual(header, "Basic a2V5OnNlY3JldA==")

    def test_key_alone_falls_back_to_bearer(self):
        self.assertEqual(shipping._dhl_authorization({"api_key": "key", "api_secret": ""}), "Bearer key")
