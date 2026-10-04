import { useState } from "react";
import api from "../../../Services/Api"

export const useSendEmail = () => {
  const [loading, setLoading] = useState(false);

  const sendEmail = async (data) => {
    setLoading(true);
    try {
      const res = await api.post(`api/email/send/`, data);
      return res.data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { sendEmail, loading };
};