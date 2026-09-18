import { useState, useEffect } from "react";
import api from "../../../../../src/Services/Api"; // Adjust path to your API service
import { useAuth } from "../../../../../src/cmponents/Auth/AuthContext/Context";

const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);
  const { isAuthenticated } = useAuth();

  const profilepic = profile?.profile

  localStorage.setItem('profilePic', profilepic)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchProfile = async () => {
      setFetching(true);
      try {
        const response = await api.get(`/api/profile/`, {
          withCredentials: true,
        });
        setProfile(response.data);
        setError(null);
        console.log("Fetched profile data:", response.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err);
      } finally {
        setFetching(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  return { profile, error, fetching };
};

export default useProfile;
