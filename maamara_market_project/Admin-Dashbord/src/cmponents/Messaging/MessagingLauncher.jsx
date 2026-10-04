import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import { chatbubbleEllipsesOutline } from "ionicons/icons";
import Messaging from "./Messaging";

const MessagingLauncher = () => {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
          aria-hidden="true"
        />
        <Messaging floating onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <div className="fixed bottom-24 right-5 z-40 sm:bottom-8 sm:right-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-11 w-11 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_6px_18px_rgba(37,99,235,0.25)] ring-2 ring-white transition duration-200 hover:scale-105 hover:bg-[#1d4ed8] hover:shadow-[0_8px_22px_rgba(37,99,235,0.32)] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
        aria-label="Open messages"
        title="Open messages"
      >
        <IonIcon
          icon={chatbubbleEllipsesOutline}
          className="text-[21px] transition-transform duration-200 group-hover:scale-105"
        />
      </button>
    </div>
  );
};

export default MessagingLauncher;
