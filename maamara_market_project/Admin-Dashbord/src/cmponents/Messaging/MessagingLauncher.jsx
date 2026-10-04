import React from "react";
import { IonIcon } from "@ionic/react";
import { chatbubbleEllipsesOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";

const MessagingLauncher = () => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/messages")}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Open messages"
      title="Open messages"
    >
      <IonIcon icon={chatbubbleEllipsesOutline} className="text-2xl" />
    </button>
  );
};

export default MessagingLauncher;
