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
    document.body.classList.toggle("maamara-messaging-open", open);
    return () => document.body.classList.remove("maamara-messaging-open");
  }, [open]);

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
  const isBlogRoute = /^\/blogs(?:\/|$)/.test(location.pathname);
  const isMessagingRoute = /^\/messages(?:\/|$)/.test(location.pathname);

  if (isBlogRoute || isMessagingRoute) return null;

  if (open) {
    return (
      <>
        <style>{"body.maamara-messaging-open .maamara-message-launcher { display: none !important; }"}</style>
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
    <div className={"maamara-message-launcher fixed right-5 sm:bottom-8 sm:right-6 " + (isNativeApp ? "bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[950]" : "bottom-28 z-40")}>
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
