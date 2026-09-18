import { useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { IonIcon } from "@ionic/react";
import { searchOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";

import useDynamicSearch from "../Hooks/SearchHook/GlobalSearchHook";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";

export default function SearchBarForVendorAdmin() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [isMobileSearch, setIsMobileSearch] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const { search, data } = useDynamicSearch({
    url: "/api/search-all/",
  });

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef(null);

  // =========================
  // OUTSIDE CLICK CLOSE
  // =========================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =========================
  // LIVE SEARCH (DEBOUNCED)
  // =========================
  useEffect(() => {
    const delay = setTimeout(() => {
      if (value.trim().length > 1) {
        search(value);
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [value, search]);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = (e) => {
    e.preventDefault();
  
    if (!value.trim()) return;
  
    setOpen(false);
  
    if (windowWidth <= 473) {
      setIsMobileSearch(false);
    }
  
    navigate(`/search/global-results?q=${value}`);
  };

  // =========================
  // CLICK ITEM
  // =========================
  const handleClick = (item) => {
    setOpen(false);

    if (item?.id && item?.name) {
      navigate(`/product/${item.id}`);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
  
      if (window.innerWidth > 473) {
        setIsMobileSearch(false);
      }
    };
  
    window.addEventListener("resize", handleResize);
  
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasResults =
    data &&
    Object.values(data).some((arr) => Array.isArray(arr) && arr.length > 0);

  return (
    <Box
        ref={wrapperRef}
        sx={{
            position: "relative",
            width: "100%",
            minWidth: 0,
        }}
        style={{
            "--placeholder-color": colors.gray[100],
        }}
        >
      {/* ================= FORM ================= */}
      <form
            onSubmit={handleSubmit}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
            }}
            >
            {/* MOBILE SEARCH ICON ONLY */}
            {windowWidth <= 473 && !isMobileSearch ? (
                <Box
                onClick={() => setIsMobileSearch(true)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    width: 40,
                    height: 40,
                }}
                >
                <IonIcon
                    icon={searchOutline}
                    style={{
                    color: colors.gray[100],
                    fontSize: "22px",
                    }}
                />
                </Box>
            ) : (
                <>
                <Box
                    sx={{
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    }}
                >
                    <IonIcon
                    icon={searchOutline}
                    style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: colors.gray[100],
                        fontSize: "18px",
                        zIndex: 2,
                    }}
                    />

                    <input
                    type="search"
                    autoComplete="off"
                    enterKeyHint="search"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Search here..."
                    style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        backgroundColor: colors.primary[500],
                        color: colors.gray[100],
                        border: `1px solid ${colors.primary[400]}`,
                        paddingLeft: "40px",
                        paddingRight: "12px",
                        outline: "none",
                        fontSize: "14px",
                        boxSizing: "border-box",
                    }}
                    />
                </Box>

                {/* HIDE BUTTON BELOW 680PX */}
                {windowWidth > 680 && (
                    <Box
                    component="button"
                    type="submit"
                    sx={{
                        backgroundColor: colors.blueAccent[700],
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        height: "40px",
                        px: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",

                        "&:hover": {
                        opacity: 0.9,
                        },
                    }}
                    >
                    Search
                    </Box>
                )}
                </>
            )}
            </form>

      {/* ================= DROPDOWN ================= */}
      {open && value.trim().length > 1 && (
        <Box
        sx={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          backgroundColor: colors.primary[600],
          zIndex: 9999,
          borderRadius: "10px",
      
          maxHeight: {
            xs: 250,
            sm: 300,
          },
      
          overflowY: "auto",
      
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      
          border: `1px solid ${colors.primary[400]}`,
        }}
      >
          {!hasResults ? (
            <Box style={{ padding: 10, color: colors.gray[200] }}>
              No results found
            </Box>
          ) : (
            Object.entries(data || {}).map(([section, items]) => {
              if (!Array.isArray(items) || items.length === 0) return null;

              return (
                <div key={section}>
                  {/* SECTION TITLE */}
                  <div
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      color: colors.gray[300],
                      textTransform: "uppercase",
                    }}
                  >
                    {section}
                  </div>

                  {/* ITEMS */}
                  {items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleClick(item)}
                      style={{
                        padding: "12px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${colors.primary[700]}`,
                        color: colors.gray[100],
                        fontSize: "14px",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.name || item.title || item.company_name || "Unknown"}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}