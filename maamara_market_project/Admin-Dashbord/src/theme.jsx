// src/theme.jsx
import { createContext, useState, useMemo, useEffect } from "react";
import { createTheme } from "@mui/material/styles";

// 🎨 Color tokens
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        gray: {
          100: "#e0e0e0",
          200: "#c2c2c2",
          300: "#a3a3a3",
          400: "#858585",
          500: "#c2c2c2",
          600: "#525252",
          700: "#3d3d3d",
          800: "#292929",
          900: "#141414",
        },
        primary: {
          100: "#d0d1d5",
          200: "#a1a4ab",
          300: "#727681",
          400: "#434957",
          500: "#141b2d",
          600: "#434957",
          700: "#0c101b",
          800: "#080b12",
          900: "#040509",
        },
        greenAccent: {
          100: "#dbf5ee",
          200: "#b7ebde",
          300: "#94e2cd",
          400: "#70d8bd",
          500: "#4cceac",
          600: "#3da58a",
          700: "#2e7c67",
          800: "#1e5245",
          900: "#0f2922",
        },
        redAccent: {
          100: "#f8dcdb",
          200: "#f1b9b7",
          300: "#e99592",
          400: "#e2726e",
          500: "#db4f4a",
          600: "#af3f3b",
          700: "#832f2c",
          800: "#58201e",
          900: "#2c100f",
        },
        blueAccent: {
          100: "#e1e2fe",
          200: "#c3c6fd",
          300: "#a4a9fc",
          400: "#868dfb",
          500: "#6870fa",
          600: "#535ac8",
          700: "#3e4396",
          800: "#2a2d64",
          900: "#151632",
        },
        yellowAccent: {
          100: "#fff9db",
          200: "#fff3b7",
          300: "#ffed94",
          400: "#ffe770",
          500: "#ffe14c",
          600: "#ccb43d",
          700: "#99872e",
          800: "#665a1e",
          900: "#332d0f",
        },
        tealAccent: {
          100: "#dbfdf8",
          200: "#b7fbf2",
          300: "#94f9eb",
          400: "#70f7e5",
          500: "#4cf5de",
          600: "#3dccb2",
          700: "#2e9985",
          800: "#1e6659",
          900: "#0f332c",
        },

        // === NEW ADDITIONS ===
        orangeAccent: {
          100: "#fff3e0",
          200: "#ffe0b2",
          300: "#ffcc80",
          400: "#ffb74d",
          500: "#ffa726",
          600: "#fb8c00",
          700: "#ef6c00",
          800: "#e65100",
          900: "#bf360c",
        },
        purpleAccent: {
          100: "#f3e5f5",
          200: "#e1bee7",
          300: "#ce93d8",
          400: "#ba68c8",
          500: "#ab47bc",
          600: "#9c27b0",
          700: "#8e24aa",
          800: "#7b1fa2",
          900: "#6a1b9a",
        },
        cyanAccent: {
          100: "#e0f7fa",
          200: "#b2ebf2",
          300: "#80deea",
          400: "#4dd0e1",
          500: "#26c6da",
          600: "#00bcd4",
          700: "#00acc1",
          800: "#0097a7",
          900: "#00838f",
        },
        brownAccent: {
          100: "#efebe9",
          200: "#d7ccc8",
          300: "#bcaaa4",
          400: "#a1887f",
          500: "#8d6e63",
          600: "#795548",
          700: "#6d4c41",
          800: "#5d4037",
          900: "#4e342e",
        },
        goldAccent: {
          100: "#fff8e1",
          200: "#ffecb3",
          300: "#ffe082",
          400: "#ffd54f",
          500: "#ffca28",
          600: "#ffc107",
          700: "#ffb300",
          800: "#ffa000",
          900: "#ff8f00",
        },

      }
    : {
        // light mode (same additions)
        gray: {
          100: "#2a2185",
          100: "#141414",
          200: "#292929",
          300: "#3d3d3d",
          400: "#525252",
          500: "#666666",
          600: "#858585",
          700: "#a3a3a3",
          800: "#c2c2c2",
          900: "#e0e0e0",
        },
        primary: {
          100: "#040509",
          200: "#080b12",
          300: "#0c101b",
          400: "#f2f0f0",
          500: "#e0e0e0",
          600: "#f5f5f5",
          700: "#727681",
          800: "#a1a4ab",
          900: "#d0d1d5",
        },
        greenAccent: {
          100: "#0f2922",
          200: "#1e5245",
          300: "#2e7c67",
          400: "#3da58a",
          500: "#4cceac",
          600: "#70d8bd",
          700: "#94e2cd",
          800: "#b7ebde",
          900: "#dbf5ee",
        },
        redAccent: {
          100: "#2c100f",
          200: "#58201e",
          300: "#832f2c",
          400: "#af3f3b",
          500: "#db4f4a",
          600: "#e2726e",
          700: "#e99592",
          800: "#f1b9b7",
          900: "#f8dcdb",
        },
        blueAccent: {
          100: "#151632",
          200: "#2a2d64",
          300: "#3e4396",
          400: "#535ac8",
          500: "#6870fa",
          600: "#868dfb",
          700: "#a4a9fc",
          800: "#c3c6fd",
          900: "#e1e2fe",
        },
        yellowAccent: {
          100: "#332d0f",
          200: "#665a1e",
          300: "#99872e",
          400: "#ccb43d",
          500: "#ffe14c",
          600: "#ffe770",
          700: "#ffed94",
          800: "#fff3b7",
          900: "#fff9db",
        },
        tealAccent: {
          100: "#0f332c",
          200: "#1e6659",
          300: "#2e9985",
          400: "#3dccb2",
          500: "#4cf5de",
          600: "#70f7e5",
          700: "#94f9eb",
          800: "#b7fbf2",
          900: "#dbfdf8",
        },

        // === NEW ADDITIONS ===
        orangeAccent: {
          100: "#fff3e0",
          200: "#ffe0b2",
          300: "#ffcc80",
          400: "#ffb74d",
          500: "#ffa726",
          600: "#fb8c00",
          700: "#ef6c00",
          800: "#e65100",
          900: "#bf360c",
        },
        purpleAccent: {
          100: "#f3e5f5",
          200: "#e1bee7",
          300: "#ce93d8",
          400: "#ba68c8",
          500: "#ab47bc",
          600: "#9c27b0",
          700: "#8e24aa",
          800: "#7b1fa2",
          900: "#6a1b9a",
        },
        cyanAccent: {
          100: "#e0f7fa",
          200: "#b2ebf2",
          300: "#80deea",
          400: "#4dd0e1",
          500: "#26c6da",
          600: "#00bcd4",
          700: "#00acc1",
          800: "#0097a7",
          900: "#00838f",
        },
        brownAccent: {
          100: "#efebe9",
          200: "#d7ccc8",
          300: "#bcaaa4",
          400: "#a1887f",
          500: "#8d6e63",
          600: "#795548",
          700: "#6d4c41",
          800: "#5d4037",
          900: "#4e342e",
        },
        goldAccent: {
          100: "#fff8e1",
          200: "#ffecb3",
          300: "#ffe082",
          400: "#ffd54f",
          500: "#ffca28",
          600: "#ffc107",
          700: "#ffb300",
          800: "#ffa000",
          900: "#ff8f00",
        },
      }),
});





  // material ui theme settings
  export const themeSettings = (mode) => {
    const colors = tokens(mode);

    return {
        palette: {
            mode: mode,
            ...(mode === 'dark'
              ? {
                  primary: { main: colors.primary[500] },
                  secondary: { main: colors.greenAccent[500] },
                  neutral: {
                    dark: colors.gray[700],
                    main: colors.gray[500],
                    light: colors.gray[100],
                  },
                  background: { default: colors.primary[500] },
                }
              : {
                  primary: { main: colors.primary[200] },
                  secondary: { main: colors.greenAccent[500] },
                  neutral: {
                    dark: colors.gray[900],
                    main: colors.gray[500],
                    light: colors.gray[100],
                  },
                  background: { default: '#fff' },
                }),
          },
          
        fontSize:13,
        h1: {fontSize: 40,fontWeight: '500'
        },
        h2: {fontSize: 32,
        },
        h3: {fontSize: 24,
        },
        h4: {fontSize: 20,
        },
        h5: {fontSize: 16,
        },
        h6: {fontSize: 14,
        },
    };
  };

  // react context for the color mode
  // ✅ Wrap your theme logic inside a proper hook function

export const ColourModeContext = createContext({
  toggleColorMode: () => {},
});


export const useMode = () => {
  const [mode, setMode] = useState(
    localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    localStorage.setItem("theme", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),

      // ✅ ADD THESE
      setLightMode: () => setMode("light"),
      setDarkMode: () => setMode("dark"),
    }),
    []
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return [theme, colorMode];
};