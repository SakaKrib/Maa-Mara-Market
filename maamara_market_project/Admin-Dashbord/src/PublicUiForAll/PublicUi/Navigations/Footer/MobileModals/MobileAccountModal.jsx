import React, { useEffect, useState } from "react";
import MobileBottomSheet from "./MobileBottomSheet";
import { UserRound, Package, Settings, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";

const MobileAccountModal = ({ open, onClose, user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    api.get("/api/user/account/", { withCredentials: true })
      .then((res) => {
        if (active && res.data?.success) setProfile(res.data.profile || null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [open]);

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="Account">
      <div className="mm-mobile-account">
        <div className="mm-mobile-account-profile">
          <div className="mm-mobile-account-avatar">
            {(profile?.first_name || user?.username || "M").charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{profile?.first_name || user?.username || "My Account"}</strong>
            <span>{profile?.email || user?.email || "Sign in to manage your account"}</span>
          </div>
        </div>
        <div className="mm-mobile-account-links">
          <button type="button" onClick={() => go("/profile-view")}><UserRound size={17} /> View Profile <ExternalLink size={14} /></button>
          <button type="button" onClick={() => go("/customer-order")}><Package size={17} /> Orders <ExternalLink size={14} /></button>
          <button type="button" onClick={() => go("/settings")}><Settings size={17} /> Settings <ExternalLink size={14} /></button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};

export default MobileAccountModal;