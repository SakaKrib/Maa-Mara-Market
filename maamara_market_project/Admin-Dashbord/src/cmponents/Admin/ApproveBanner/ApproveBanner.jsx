import { useEffect, useState } from "react";
import api from "../../../Services/Api";
import { useTheme } from "@emotion/react";
import { tokens } from "../../../theme";

const POLL_INTERVAL = 10000;

export default function AdminBannerApprovalPage({ onCountChange }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const fetchBanners = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get("/api/moderation/banners/");
      const list = res.data?.results || res.data || [];

      setBanners(list);
      onCountChange?.(list.length);
    } catch (err) {
      console.error("Failed to fetch banners:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners(false);

    const interval = setInterval(() => {
      fetchBanners(true);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);

    try {
      await api.post(`/api/moderation/banners/${id}/approve/`);

      setBanners((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);

    try {
      await api.post(`/api/moderation/banners/${id}/reject/`);

      setBanners((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading banners...</div>;

  if (banners.length === 0)
    return (
      <div
        style={{ color: colors.gray[100], backgroundColor: colors.primary[500] }}
        className="p-6 text-center"
      >
        No pending banners.
      </div>
    );

  return (
    <div
      className="max-w-5xl mx-auto p-4"
      style={{ backgroundColor: colors.primary[500] }}
    >
      <h1 style={{ color: colors.gray[100] }} className="text-2xl font-bold mb-4">
        Pending Banner Approvals
      </h1>

      <div className="space-y-4" style={{ backgroundColor: colors.primary[600] }}>
        {banners.map((banner) => (
          <div key={banner.id} className="border rounded p-4 shadow">
            <h2 style={{ color: colors.gray[100] }} className="text-xl font-semibold">
              {banner.title}
            </h2>

            {banner.subtitle && (
              <p style={{ color: colors.gray[100] }}>{banner.subtitle}</p>
            )}

            {banner.image && (
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-48 object-cover rounded mt-2"
              />
            )}

            <div className="flex justify-between items-center mt-3">
              <span style={{ color: colors.gray[100] }} className="text-sm">
                Vendor: {banner.vendor_name}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(banner.id)}
                  disabled={processingId === banner.id}
                  style={{
                    backgroundColor: colors.greenAccent[700],
                    color: colors.gray[100],
                  }}
                  className="px-3 py-1 rounded"
                >
                  Approve
                </button>

                <button
                  onClick={() => handleReject(banner.id)}
                  disabled={processingId === banner.id}
                  style={{
                    backgroundColor: colors.redAccent[500],
                    color: colors.gray[100],
                  }}
                  className="px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}