import React from "react";
import { Gift, Users, Wallet, Coins } from "lucide-react";
import { CardContent } from "../../../../../../../components/ui/card";

export function WalletSection({ wallet }) {
  return (
    <section className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Wallet className="w-5 h-5" />Wallet Overview</h3>
      <div className="flex justify-between"><span className="flex items-center gap-2"> <Coins className="w-4 h-4" />Coins</span><span>{wallet?.balance || 0}</span></div>
      <div className="flex justify-between"><span>KES Value</span><span>KSh {wallet?.total_kes || 0}</span></div>
    </section>
  );
}

export function ReferralSection({ referral }) {
  const copy = () => {
    if (referral?.referral_code && navigator.clipboard) navigator.clipboard.writeText(referral.referral_code);
  };
  return (
    <section className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2"><Users className="w-5 h-5" />Referral Stats</h3>
      <div className="flex justify-between"><span>Referral Code</span><span className="font-mono text-sm">{referral?.referral_code || "N/A"}</span></div>
      <div className="flex justify-between"><span>Total Referrals</span><span>{referral?.total_referrals ?? 0}</span></div>
      <div className="flex justify-between"><span>Created</span><span>{referral?.created_at ? new Date(referral.created_at).toLocaleDateString() : "—"}</span></div>
      {referral?.referral_code && <button type="button" onClick={copy} className="text-sm hover:underline">Copy Code</button>}
    </section>
  );
}

export function VoucherSection({ voucher }) {
  return (
    <section className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2"><Gift className="w-5 h-5" />Active Voucher</h3>
      {voucher ? (
        <div className="flex justify-between items-center border-b py-2">
          <div><span className="font-mono">{voucher.code}</span><span className="block text-xs">{voucher.name}</span></div>
          <div className="text-right"><span className="text-sm font-semibold">{voucher.discount}</span>{voucher.expiry_date && <div className="text-xs">Expires: {new Date(voucher.expiry_date).toLocaleDateString()}</div>}</div>
        </div>
      ) : <p className="text-sm">No active vouchers</p>}
    </section>
  );
}
