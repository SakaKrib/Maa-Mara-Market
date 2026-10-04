import React from "react";
import { IonIcon } from "@ionic/react";
import { closeOutline, logOutOutline } from "ionicons/icons";

const LogoutConfirmationModal = ({
  open,
  onCancel,
  onConfirm,
  title = "Sign out?",
  description = "Do you want to sign out of your Maa Mara account?",
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirmation-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Account</p>
            <h2 id="logout-confirmation-title" className="mt-1 text-xl font-bold text-card-foreground">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            aria-label="Close sign out confirmation"
            onClick={onCancel}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
          >
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <IonIcon icon={logOutOutline} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;
