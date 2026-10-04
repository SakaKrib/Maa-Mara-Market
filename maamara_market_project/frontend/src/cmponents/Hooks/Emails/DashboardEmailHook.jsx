import { useEffect, useState } from "react";
import api from '../../../Services/Api'


export const useEmailStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    this_month: 0,
    last_month: 0,
    growth: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const res = await api.get(`api/email/stats/`);
      setStats(res.data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};