import React, { useEffect, useState } from "react";

// "3 days left" -> "36h 12m left" -> "45m 10s left", like large marketplaces.
export const formatTimeLeft = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (total >= 2 * 86400) return `${days} days left`;
  if (total >= 3600) return `${Math.floor(total / 3600)}h ${minutes}m left`;
  if (total > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s left`;
  return "Ended";
};

const OfferTimeLeft = ({ endDate, prefix = "", className = "" }) => {
  const end = endDate ? new Date(endDate).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(end)) return undefined;
    // Tick every second only when seconds are shown; otherwise once a minute.
    const remaining = end - Date.now();
    const delay = remaining < 3600 * 1000 ? 1000 : 60 * 1000;
    const id = window.setInterval(() => setNow(Date.now()), delay);
    return () => window.clearInterval(id);
  }, [end, now > end - 3600 * 1000]);

  if (Number.isNaN(end) || end <= now) return null;
  const urgent = end - now < 24 * 3600 * 1000;

  return (
    <span className={`${urgent ? "text-red-600" : "text-gray-600"} ${className}`} aria-label={`${prefix}${formatTimeLeft(end - now)}`}>
      {prefix}{formatTimeLeft(end - now)}
    </span>
  );
};

export default OfferTimeLeft;
