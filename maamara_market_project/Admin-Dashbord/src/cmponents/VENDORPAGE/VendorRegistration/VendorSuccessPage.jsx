
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// 🎉 Confetti generator
const generateConfetti = (count = 25) =>
  Array.from({ length: count }).map(() => ({
    id: Math.random(),
    x: Math.random() * window.innerWidth,
    y: Math.random() * -200,
    size: 8 + Math.random() * 12,
    color: [
      "#22c55e",
      "#16a34a",
      "#86efac",
      "#4ade80",
      "#10b981",
    ][Math.floor(Math.random() * 5)],
    rotation: Math.random() * 360,
  }));

export default function VendorSuccessPage() {
  const navigate = useNavigate();
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    setConfetti(generateConfetti(40));
  }, []);

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-green-50 px-4">

      {/* 🎊 Confetti */}
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ x: piece.x, y: piece.y, rotate: piece.rotation }}
          animate={{
            y: window.innerHeight + 100,
            rotate: piece.rotation + 720,
            opacity: [1, 0.8, 0.5, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: Math.random() * 1,
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: piece.size,
            height: piece.size * 0.4,
            backgroundColor: piece.color,
            borderRadius: "2px",
          }}
        />
      ))}

      {/* ✅ Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 shadow-lg z-10"
      >
        <CheckCircle className="w-16 h-16 text-green-600" />
      </motion.div>

      {/* ✅ Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-3xl font-bold text-gray-800 z-10 text-center"
      >
        Vendor Application Submitted 🎉
      </motion.h1>

      {/* ✅ Message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 text-gray-500 text-center max-w-md z-10"
      >
        Your vendor application has been successfully submitted.
        <br /><br />
        Our team will carefully review your application and a feedback response will be sent to you shortly.
        <br /><br />
        Thank you for your interest in partnering with <strong>Maamara Market</strong>.
      </motion.p>

      {/* ✅ Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 bg-white shadow-md rounded-2xl p-6 w-full max-w-md text-center z-10 border border-green-100"
      >
        <h2 className="font-semibold text-gray-700 mb-2 text-xl">
          What happens next?
        </h2>
        <ul className="text-gray-500 text-sm space-y-2">
          <li>✔ Application review (1–3 business days)</li>
          <li>✔ Verification by our team</li>
          <li>✔ Approval or feedback email</li>
          <li>✔ Vendor onboarding access</li>
        </ul>
      </motion.div>

      {/* ✅ CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={() => navigate("/")}
        className="mt-10 px-8 py-3 rounded-full bg-green-600 text-white font-medium shadow-md hover:bg-green-700 transition z-10"
      >
        Go to Home
      </motion.button>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400 z-10">
        Maamara Market • Empowering Vendors 💚
      </p>
    </div>
  );
}