import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { chatbubbleEllipsesOutline } from "ionicons/icons";
import Messaging from "./Messaging";

const MessagingLauncher = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState({ conversationId: null, messageId: null });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("openMessage") !== "1" || !params.get("conversation")) return;
    setMessageTarget({
      conversationId: params.get("conversation"),
      messageId: params.get("message"),
    });
    setOpen(true);
  }, [location.search]);
  const isNativeApp = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;

  if (open) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
          aria-hidden="true"
        />
        <Messaging
          floating
          initialConversationId={messageTarget.conversationId}
          initialMessageId={messageTarget.messageId}
          onClose={() => setOpen(false)}
        />
      </>
    );
  }

  return (
    <div className={"fixed right-5 sm:bottom-8 sm:right-6 " + (isNativeApp ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[950]" : "bottom-24 z-40")}>
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
