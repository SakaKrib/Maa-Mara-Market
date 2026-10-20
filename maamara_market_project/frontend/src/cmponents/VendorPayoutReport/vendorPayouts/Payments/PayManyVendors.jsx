import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";
import { GroupPayoutScreen } from "../PayoutScreens";

export default function MpesaB2CMultiPayment() {
  return (
    <GroupPayoutScreen
      method="MOBILE_MONEY"
      title="M-Pesa bulk payouts"
      subtitle="Phone number, Buy Goods / Till and Paybill destinations are shown exactly as saved for each vendor."
      logo={MpesaLogo}
    />
  );
}
