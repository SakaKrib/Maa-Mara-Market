import React, { useEffect, useState } from "react";
import { Button } from "../../../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../../../components/ui/card";
import { Input } from "../../../../../../../components/ui/input";
import {
  Loader2,
  Copy,
  Share2,
  Mail,
  Gift,
  Coins,
  Users,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../../../../Services/Api"

export default function InviteFriends() {
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const res = await api.get("/api/referrals-link/", {
          // headers: {
          //   "Content-Type": "application/json",
          // },
          withCredentials: true,
        });
        const data = res.data;
        setReferralData(data);
      } catch (err) {
        console.error("Error fetching referral link:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferral();
  }, [token]);

  const copyToClipboard = () => {
    if (referralData?.referral_link) {
      navigator.clipboard.writeText(referralData.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    const message = `🎉 Join this awesome site and earn rewards! Use my link: ${referralData.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = "Join me and earn rewards!";
    const body = `Hey! Check out this amazing site — use my referral link to sign up: ${referralData.referral_link}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  if (!referralData?.success) {
    return (
      <div className="text-center mt-10 text-red-500">
        Failed to load referral link. Please log in again.
      </div>
    );
  }

  return (
    <div className="flex justify-center p-6">
      <Card className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
        <CardContent className="p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-pink-500" />
              Invite Friends & Earn
            </h1>
            <p className="text-gray-500 mt-2">
              Share your link — when friends join, you earn rewards!
            </p>
          </motion.div>

          <div className="flex items-center space-x-2 mt-6">
            <Input
              value={referralData.referral_link}
              readOnly
              className="w-full text-sm font-mono bg-gray-100 dark:bg-gray-800"
            />
            <Button onClick={copyToClipboard} variant="secondary">
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={shareViaWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </Button>
            <Button
              onClick={shareViaEmail}
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> Email
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow-inner"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-600 dark:text-gray-300">Coins earned:</span>
              </div>
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {referralData.wallet.earned_coins}
              </span>
            </div>

            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-gray-600 dark:text-gray-300">Total Referrals:</span>
              </div>
              {referralData ? (
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {referralData.total_referrals}
              

              </span>
                ) : (
                  <span>Loading...</span>
                )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6 text-sm text-gray-500"
          >
            <Link2 className="inline w-4 h-4 mr-1 text-gray-400" />
            Your personal referral link is unique — share it wisely!
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
