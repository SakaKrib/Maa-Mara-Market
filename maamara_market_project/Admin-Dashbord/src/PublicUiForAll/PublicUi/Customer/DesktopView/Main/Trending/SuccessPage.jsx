"use client";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

// 🎉 Generate random confetti pieces
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
      "#78b981",
      "#05b981",
    ][Math.floor(Math.random() * 7)],
    rotation: Math.random() * 360,
  }));

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [confetti, setConfetti] = useState([]);

  // 🧾 Extract order data passed via navigate
  const order = location.state?.order;

  useEffect(() => {
    setConfetti(generateConfetti(40));
  }, []);

  if (!order.status === 'completed') {
    // Fallback if user refreshed or came directly
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600 mb-6">
          ⚠️ No order data found — redirecting to home...
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="px-6 py-3 rounded-full bg-green-600 text-white hover:bg-green-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-green-50 px-4">
      {/* 🎊 Flying Confetti */}
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ x: piece.x, y: piece.y, rotate: piece.rotation }}
          animate={{
            y: window.innerHeight + 100,
            rotate: piece.rotation + 720,
            opacity: [1, 0.9, 0.6, 0],
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

      {/* ✅ Success Icon Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 shadow-lg z-10"
      >
        <CheckCircle className="w-16 h-16 text-green-600" />
      </motion.div>

      {/* ✅ Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-3xl font-bold text-gray-800 z-10"
      >
        Payment Successful!
      </motion.h1>

      {/* ✅ Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 text-gray-500 text-center max-w-md z-10"
      >
        Your payment has been received. We’re processing your order and will send
        a confirmation email shortly.
      </motion.p>

      {/* ✅ Dynamic Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 bg-white shadow-md rounded-2xl p-6 w-full max-w-md text-center z-10 border border-green-100"
      >
        <h2 className="font-semibold text-gray-700 mb-2 text-2xl">Order Summary</h2>
        <p className="text-gray-500">
          Order ID:{" "}
          <span className="font-medium text-gray-700">#{order.id}</span>
        </p>
        <p className="text-gray-500">
          Amount:{" "}
          <span className="font-medium text-gray-700">
            KES {Number(order.final_total).toLocaleString()}
          </span>
        </p>
        <p className="text-gray-500">
          Items:{" "}
          <span className="font-medium text-gray-700">
            {order.items?.length || 1}
          </span>
        </p>
      </motion.div>

      {/* ✅ CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={() => (window.location.href = "/")}
        className="mt-10 px-8 py-3 rounded-full bg-green-600 text-white font-medium shadow-md hover:bg-green-700 transition z-10"
      >
        Continue Shopping
      </motion.button>

      {/* ✅ Subtle Footer */}
      <p className="mt-6 text-xs text-gray-400 z-10">
        Thank you for choosing us 💚
      </p>
    </div>
  );
}
