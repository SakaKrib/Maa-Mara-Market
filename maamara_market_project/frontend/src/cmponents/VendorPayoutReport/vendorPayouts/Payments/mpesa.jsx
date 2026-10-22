import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";
import { SinglePayoutScreen } from "../PayoutScreens";

export default function MpesaB2CPayment() {
  return (
    <SinglePayoutScreen
      title="M-Pesa vendor payout"
      subtitle="Phone numbers use B2C. Buy Goods / Till and Paybill destinations use B2B. Everything below is the vendor's saved payment detail."
      logo={MpesaLogo}
      watchResult
    />
  );
}
