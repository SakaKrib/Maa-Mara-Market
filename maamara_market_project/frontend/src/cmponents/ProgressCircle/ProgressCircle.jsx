import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const ProgressCircle = ({
  progress = 0.75,
  size = 40,
  primaryColor,
  accentColor,
  backgroundColor
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const angle = progress * 360;  // corrected here

  const ringColor = backgroundColor || 'rgba(53, 8, 70, 0.14)';
  const fillColor = primaryColor || 'rgba(8, 247, 255, 0.59)';
  const centerColor = accentColor || 'rgba(0, 255, 55, 0.21)';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `
          radial-gradient(${centerColor} 55%, transparent 56%),
          conic-gradient(${fillColor} 0deg ${angle}deg, ${ringColor} ${angle}deg 360deg)
        `,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          color: colors.primary[100],
          fontWeight: 'bold',
        }}
      >
        {Math.round(progress * 100)}%
      </Typography>
    </Box>
  );
};

export default ProgressCircle;
