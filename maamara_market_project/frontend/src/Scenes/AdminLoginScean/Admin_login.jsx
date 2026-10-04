import { Box, Button, colors } from "@mui/material";
import Header from "../../Header/Header";
import ProductGrid from "../../cmponents/Onsite/Onsite";
import {useTheme} from "@mui/material";
import { tokens } from "../../theme";
import AdminLogin from "../../cmponents/Auth/AdminLogin/AdminLogin";

const LoginAdmin = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode)
  return (
    <Box m="10px" >
      <Button sx={{
        backgroundColor: colors.primary[900], justifyContent: "space-between"
      }}>View all</Button>
      <Box height="fit-content">
        <AdminLogin />
      </Box>
    </Box>
  );
};

export default LoginAdmin;