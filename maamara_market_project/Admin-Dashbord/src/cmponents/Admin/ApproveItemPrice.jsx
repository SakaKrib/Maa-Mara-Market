import React, { useEffect, useState } from "react";
import api from "../../Services/Api";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  useTheme,
  Divider,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PersonIcon from "@mui/icons-material/Person";
import NotesIcon from "@mui/icons-material/Notes";
import Inventory2Icon from "@mui/icons-material/Inventory2";

import { tokens } from "../../theme";


const AdminPriceApproval = ({ onCountChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [approvingId, setApprovingId] = useState(null);

  // =========================
  // FETCH PENDING REQUESTS
  // =========================
  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get(
        `/api/price-change-requests/?status=pending`,
        { withCredentials: true }
      );

      const list = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];

      setRequests(list);

      onCountChange?.(list.length);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // =========================
  // FETCH APPROVAL HISTORY
  // =========================
  const fetchHistory = async () => {
    setHistoryLoading(true);

    try {
      const res = await api.get(
        `/api/price-change-requests/?status=approved`,
        { withCredentials: true }
      );

      const list = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];

      setHistory(list);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(false);
    fetchHistory();
  }, []);

  // =========================
  // APPROVE REQUEST
  // =========================
  const handleApprove = async (requestId) => {
    setApprovingId(requestId);

    try {
      await api.post(
        `/api/item-price-change/approve/${requestId}/price-change/`,
        {},
        { withCredentials: true }
      );

      setRequests((prev) => {
        const updated = prev.filter((r) => r.id !== requestId);

        onCountChange?.(updated.length);

        return updated;
      });

      // refresh history after approval
      fetchHistory();
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MonetizationOnIcon />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-card-foreground sm:text-lg">Pending price change requests</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Review vendor price updates before they are applied to marketplace items.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center rounded-xl border border-border bg-muted/40 py-10">
              <CircularProgress />
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
              <p className="text-sm font-medium text-card-foreground">No pending price updates.</p>
              <p className="mt-1 text-xs text-muted-foreground">New vendor requests will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {requests.map((req) => (
                <article key={req.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                        <Inventory2Icon />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-card-foreground sm:text-base">{req.item_name || "Marketplace item"}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Requested by <span className="font-semibold text-card-foreground">{req.requested_by_name || "Vendor"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">New price</p>
                        <p className="mt-1 text-base font-bold text-card-foreground">KES {req.new_price}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</p>
                        <p className="mt-1 break-words text-sm text-card-foreground">{req.reason || "No reason provided."}</p>
                      </div>
                    </div>

                    <Button
                      variant="contained"
                      onClick={() => handleApprove(req.id)}
                      disabled={approvingId === req.id}
                      className="!w-full !rounded-[20px] !bg-primary !px-4 !py-3 !text-sm !font-semibold !normal-case !text-primary-foreground hover:!bg-primary/90"
                    >
                      {approvingId === req.id ? <CircularProgress size={20} color="inherit" /> : "Approve price change"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircleIcon />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-card-foreground sm:text-lg">Approval history</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Recently approved vendor price changes.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {historyLoading ? (
            <div className="flex justify-center rounded-xl border border-border bg-muted/40 py-10">
              <CircularProgress />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
              <p className="text-sm font-medium text-card-foreground">No approval history yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {history.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-bold text-card-foreground sm:text-base">
                          {item.item_name || "Marketplace item"}
                        </h4>
                        <p className="mt-1 text-base font-bold text-primary">KES {item.new_price}</p>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                        Approved
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requested by</p>
                        <p className="mt-1 text-sm text-card-foreground">{item.requested_by_name || "Vendor"}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Approved by</p>
                        <p className="mt-1 text-sm text-card-foreground">{item.approved_by_name || "Admin"}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/40 p-3 sm:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</p>
                        <p className="mt-1 break-words text-sm text-card-foreground">{item.reason || "No reason provided."}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AccessTimeIcon sx={{ fontSize: 17 }} />
                      <span>
                        Approved at{" "}
                        <strong className="text-card-foreground">
                          {item.approved_at ? new Date(item.approved_at).toLocaleString() : "N/A"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  
};

export default AdminPriceApproval;