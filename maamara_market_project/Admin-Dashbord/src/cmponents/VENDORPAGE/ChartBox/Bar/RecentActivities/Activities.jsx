import "../../CharBox.css";
import { tokens } from "../../../../../theme";
import { useTheme } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useVendorActivityLogs } from "../../../../../cmponents/Hooks/ActivityHook/ActivityHook";

dayjs.extend(relativeTime);

// Helper to truncate text
const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = text.split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : text;
};

const Activities = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { activityLogs, loading, error } = useVendorActivityLogs();

  if (loading) return <p>Loading recent activities...</p>;
  if (error) return <p>⚠️ Error fetching logs: {error.message}</p>;

  const keywordColors = {
    purchase: colors.orangeAccent?.[500] || "#fb8c00",
    purchased: colors.orangeAccent?.[500] || "#fb8c00",
    item: colors.redAccent[400],
    price: colors.blueAccent[300],
    stock: colors.yellowAccent?.[400] || "#fbc02d",
    view: colors.cyanAccent?.[400] || "#0288d1",
    viewed: colors.cyanAccent?.[400] || "#0288d1",
    wishlist: colors.purpleAccent?.[400] || "#7b1fa2",
    cart: colors.greenAccent?.[500],
    removed: colors.redAccent[500],
    added: colors.greenAccent?.[200],
    refunded: colors.gray?.[400] || "#757575",
    failed: colors.redAccent?.[700] || "#b71c1c",
    completed: colors.greenAccent?.[700] || "#1b5e20",
    pending: colors.yellowAccent?.[400] || "#ffd700",  // Use yellowAccent instead of goldAccent (undefined)
    cancelled: colors.gray?.[700] || "#424242",
    shipped: colors.tealAccent?.[400] || "#00796b",
    delivered: colors.cyanAccent?.[400] || "#00bcd4",
    sold: colors.purpleAccent?.[700] || "#00bcd4",
    returned: colors.brownAccent?.[400] || "#6d4c41", // You need to add brownAccent or replace
  };

  const findKeyword = (description = "") => {
    const descLower = description.toLowerCase();
    return Object.keys(keywordColors).find((key) =>
      descLower.includes(key.toLowerCase())
    ) || null;
  };

  const getDotClass = (description = "") => {
    const desc = description.toLowerCase();
    if (desc.includes("added")) return "dot-green";
    if (desc.includes("removed")) return "dot-red";
    if (desc.includes("wishlist")) return "dot-purple";
    if (desc.includes("cart")) return "dot-green";
    if (desc.includes("purchase") || desc.includes("purchased")) return "dot-orange";
    if (desc.includes("refunded")) return "dot-gray";
    if (desc.includes("failed")) return "dot-darkred";
    if (desc.includes("completed")) return "dot-darkgreen";
    if (desc.includes("pending")) return "dot-gold";
    if (desc.includes("cancelled")) return "dot-darkgray";
    if (desc.includes("shipped")) return "dot-teal";
    if (desc.includes("delivered")) return "dot-cyan";
    if (desc.includes("returned")) return "dot-brown";
    if (desc.includes("sold")) return "dot-gold";
    return "";
  };

  return (
    <div className="activity-container">
      <div className="item">
        <h2 className="text-lg font-semibold mb-2">Recent Activities</h2>
        <div className="activity">
          <div className="list">
            <ul>
              {activityLogs.length === 0 ? (
                <li>
                  <p className="text-gray-400 italic">No vendor activity yet.</p>
                </li>
              ) : (
                activityLogs.map((log) => {
                  const keyword = findKeyword(log.description);
                  const color = keyword ? keywordColors[keyword] : null;
                  const isItem = log.description?.toLowerCase().includes("item");
                  const isCart = log.description?.toLowerCase().includes("cart");
                  const dotClass = getDotClass(log.description);

                  return (
                    <li key={log.id || log.timestamp}>
                      <div
                        className="each-activity"
                        data-item={isItem}
                        data-cart={isCart}
                        data-keyword={keyword || ""}
                      >
                        {/* Remove <span className="dot">. We use ::before on .text for the dot */}
                        <div
                          className={`text ${dotClass}`}
                          style={{
                            color: color || "inherit",
                            fontWeight: keyword ? "bold" : "normal",
                            paddingLeft: "20px",  // So dot doesn't overlap text  
                          }}
                        >
                          <span>{truncateWords(log.description, 8)}</span>
                          <span className="time">
                            {dayjs(log.timestamp).fromNow()}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activities;
