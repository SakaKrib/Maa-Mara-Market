import { useEffect, useState } from "react";
import axios from "axios";
import api from "../../../Services/Api";
import { baseUrl } from "../../Constant/Constant";




const VendorStatsBox = ({ vendorId }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get(`${baseUrl}/api/item-stats/`, {
    withCredentials: true
  })
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, [vendorId]);

  if (!stats) return <p>Loading vendor stats...</p>;

  return (
    <div className="vendor-stats-box">
      <h3>Stats for {stats.vendor_name}</h3>
      <p>Total Items: {stats.total_items}</p>
      <p>Total Likes: {stats.total_likes}</p>
      <p>Total Views: {stats.total_views}</p>
    </div>
  );
};

export default VendorStatsBox;
