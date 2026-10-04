import React, { useEffect, useState } from "react";

const OfferCountdown = ({ endDateStr }) => {
  const [timeLeft, setTimeLeft] = useState(() =>
    endDateStr ? Math.max(0, Math.floor((new Date(endDateStr) - new Date()) / 1000)) : 0
  );

  useEffect(() => {
    if (!endDateStr) return undefined;
    const interval = window.setInterval(() => {
      const diff = Math.floor((new Date(endDateStr) - new Date()) / 1000);
      setTimeLeft(Math.max(0, diff));
      if (diff <= 0) window.clearInterval(interval);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [endDateStr]);

  if (!timeLeft) return null;

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
      Offer ends in {days}d {hours}h {minutes}m {seconds}s
    </div>
  );
};

export default OfferCountdown;
