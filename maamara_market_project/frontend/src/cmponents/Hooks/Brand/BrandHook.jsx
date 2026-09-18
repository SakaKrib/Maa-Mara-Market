import { useState, useEffect } from "react";
import axios from "axios";

const useBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log(brands)

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/brands/"); // Replace with your API endpoint
        setBrands(res.data);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  return { brands, loading, error };
};

export default useBrands;
