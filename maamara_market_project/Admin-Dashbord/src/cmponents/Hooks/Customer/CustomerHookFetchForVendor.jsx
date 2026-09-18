import { useEffect, useState } from "react";
import api from "../../../Services/Api"
import { useAuth } from "../../Auth/AuthContext/Context";

export function useVendorCustomers(vendorUserId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {user} = useAuth();
  const userId = user.id

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    api
      .get(`/api/customers/?vendor_user_id=${userId}`, {
        withCredentials: true, // include cookies if needed
      })
      .then((response) => {
        setCustomers(response.data.customers || []);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  return { customers, loading, error };
}
