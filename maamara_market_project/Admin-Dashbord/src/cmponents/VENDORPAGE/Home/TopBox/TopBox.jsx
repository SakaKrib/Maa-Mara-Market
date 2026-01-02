import "./TopBox.css";
import { useCustomerSocket } from "../../../../cmponents/Hooks/Customer/CustomerHook";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";

// Helper to generate a consistent color for each letter
const getColorForLetter = (letter) => {
  const colors = [
    "#E57373", "#F06292", "#BA68C8", "#64B5F6", "#4DB6AC",
    "#81C784", "#FFD54F", "#FFB74D", "#A1887F", "#90A4AE",
    "#F44336", "#E91E63", "#9C27B0", "#2196F3", "#009688",
    "#4CAF50", "#FFC107", "#FF9800", "#795548", "#607D8B",
  ];
  if (!letter) return "#607D8B";
  const index = (letter.toUpperCase().charCodeAt(0) - 65) % colors.length;
  return colors[index];
};

const TopBox = () => {
  const { customers, connected } = useCustomerSocket();
  const theme = useTheme()
  const colors = tokens(theme.palette.mode)

  return (
    <div className="topbox">
      <h1 className="text-4xl">Customers</h1>

      {!connected && <p>Connecting to WebSocket...</p>}

    <div>
      <div className="list" >
        {customers.length > 0 ? (
          customers.map((customer) => {
            const fullName =
              customer.full_name ||
              `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
            const initials = fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const bgColor = getColorForLetter(initials[0]);

            return (
              <div className="listItem hover:bg-gray-700 p-2 rounded-full cursor-pointer" key={customer.id} >
                <div className="user">
                  {customer.profile_picture ? (
                    <img
                      src={customer.profile_picture}
                      alt={fullName || "No name"}
                      className="w-11 h-11 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 flex items-center justify-center rounded-full text-white font-bold text-base uppercase border border-gray-200"
                      style={{ color: bgColor }}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="userText">
                    <span className="username">
                      {fullName || "Guest User"}
                    </span>
                    <span className="email">
                      {customer.email || "No email"}
                    </span>
                  </div>
                </div>
                <span className="amount">{customer.city || "Nairobi"}</span>
              </div>
            );
          })
        ) : (
          <p>No customers yet</p>
        )}
      </div>
    </div>
    </div>
  );
};

export default TopBox;
