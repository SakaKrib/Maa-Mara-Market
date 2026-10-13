import { useContext, useEffect } from "react";
import { ColourModeContext } from "./theme";

const BridgeToHTML = () => {
  const { toggleColorMode } = useContext(ColourModeContext);

  useEffect(() => {
    window.toggleReactTheme = toggleColorMode; // 👈 make it globally available
  }, [toggleColorMode]);

  return null;
};


export default BridgeToHTML;