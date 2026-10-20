import { useLocation } from "react-router-dom";
import { GroupPayoutScreen, SinglePayoutScreen } from "../PayoutScreens";

// One component serves both routes: with a reference it pays one vendor, without it pays the group.
export default function PaypalBulkPayment() {
  const location = useLocation();
  const reference = new URLSearchParams(location.search).get("reference") || location.state?.reference;

  return reference ? (
    <SinglePayoutScreen
      title="PayPal vendor payout"
      subtitle="Paid in USD, converted from KES at the live rate, to the PayPal account the vendor saved."
    />
  ) : (
    <GroupPayoutScreen
      method="PAYPAL"
      title="PayPal bulk payouts"
      subtitle="Each vendor is paid in USD, converted from KES at the live rate, to their saved PayPal account."
    />
  );
}
