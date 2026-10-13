// src/Header/Header.jsx

import { Typography, Box, useTheme } from "@mui/material";
import { tokens } from "../theme";

const Header = ({ title, subtitle }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box mb={2}>
      <Typography
        variant="h4"
        color={colors.gray[100]}
        fontWeight="bold"
        sx={{ mb: ".5em" }}
        textTransform="uppercase"
      >
        {title}
      </Typography>
      <Typography
        variant="h5"
        color={colors.redAccent[100]}
        sx={{ mt: ".25em" }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
};

export default Header;
