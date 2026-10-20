import { useLocation } from "react-router-dom";
import { GroupPayoutScreen, SinglePayoutScreen } from "./PayoutScreens";

// With a reference it pays one vendor; without it pays every unpaid bank payout of the period.
export default function BankTransferBulkPayment() {
  const location = useLocation();
  const reference = new URLSearchParams(location.search).get("reference") || location.state?.reference;

  return reference ? (
    <SinglePayoutScreen
      title="Bank transfer payout"
      subtitle="The transfer goes to the bank account the vendor saved."
    />
  ) : (
    <GroupPayoutScreen
      method="BANK_TRANSFER"
      title="Bank transfer bulk payouts"
      subtitle="Each vendor is paid to the bank account details they saved."
    />
  );
}
