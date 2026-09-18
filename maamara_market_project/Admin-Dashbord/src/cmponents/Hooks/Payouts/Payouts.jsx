import { useEffect, useState } from "react";
import { baseUrl } from "../../Constant/Constant";
import api from "../../../Services/Api";

export const useVendorPayoutHistory = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  useEffect(() => {
    let isMounted = true;

    const fetchPayouts = async () => {
      try {
        setLoading(true);
        const res = await api.get(`${baseUrl}/api/vendor-payout-history/`, { withCredentials: true });

        if (isMounted) {
          // Assuming the response is the array of payouts directly:
          setPayouts(res.data); // Or res.data.current if that contains the array
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching payout history:", err);
          setError("Failed to fetch payouts");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPayouts();

    return () => {
      isMounted = false;
    };
  }, []);

  return { payouts, loading, error };
};
