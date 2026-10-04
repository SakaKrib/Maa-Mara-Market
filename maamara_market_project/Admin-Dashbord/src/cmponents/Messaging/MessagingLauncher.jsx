import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  chatbubbleEllipsesOutline,
  closeOutline,
} from "ionicons/icons";
import { useNavigate } from "react-router-dom";

const MessagingLauncher = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const openMessages = () => {
    setVisible(false);
    navigate("/messages");
  };

  return (
    <div className="fixed bottom-24 right-5 z-40 sm:bottom-8 sm:right-6">
      <button
        type="button"
        onClick={openMessages}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_8px_24px_rgba(37,99,235,0.28)] ring-4 ring-white transition duration-200 hover:scale-105 hover:bg-[#1d4ed8] hover:shadow-[0_10px_28px_rgba(37,99,235,0.35)] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
        aria-label="Open messages"
        title="Open messages"
      >
        <IonIcon
          icon={chatbubbleEllipsesOutline}
          className="text-[26px] transition-transform duration-200 group-hover:scale-105"
        />
      </button>

      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#e6e6e4] bg-white text-[#595959] shadow-sm transition hover:bg-[#f8f8f6] hover:text-[#222] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-1"
        aria-label="Hide messaging button"
        title="Hide"
      >
        <IonIcon icon={closeOutline} className="text-[15px]" />
      </button>
    </div>
  );
};

export default MessagingLauncher;
