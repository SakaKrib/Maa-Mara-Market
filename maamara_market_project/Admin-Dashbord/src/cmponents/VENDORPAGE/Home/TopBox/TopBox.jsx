import { useState } from "react";
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

  // hover state
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="topbox">
      <h1 className="text-base font-bold leading-5 text-[#222] sm:text-lg">Customers</h1>

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
              <div className="listItem rounded-full cursor-pointer" key={customer.id}
              onMouseEnter={() => setHoveredId(customer.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                color: colors.gray[100],padding:'5px',borderBottom:`1px solid ${colors.gray[800]}`,
                backgroundColor:
                  hoveredId === customer.id ? colors.primary[900] : colors.gray[900]
              }} >
                <div className="user">
                  {customer.profile_picture ? (
                    <img
                      src={customer.profile_picture}
                      alt={fullName || "No name"}
                      className="w-11 h-11 rounded-full object-cover" style={{border: `1px solid ${colors.gray[100]}`}}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 flex items-center justify-center rounded-full font-bold text-base uppercase "
                      style={{ color: bgColor, border: `1px solid ${colors.gray[100]}` }}
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
          <p className="text-sm text-[#595959]" style={{color:colors.gray[100]}}>No customers yet</p>
        )}
      </div>
    </div>
    </div>
  );
};

export default TopBox;
