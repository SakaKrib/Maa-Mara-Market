import { Outlet } from 'react-router-dom';
import ProtectedRoute from '../ProtectRoute';
import { Box, useTheme } from '@mui/material';
import HeaderTop from '../../../Portions/HederTop/HeaderTop';
import NavBar from '../../../Portions/NavBar/NavBarSide';
import { tokens } from '../../../../theme';
import VendorRegistration from '../../../../cmponents/VENDORPAGE/VendorRegistration/Terms&Conditions';

const CustomerLayout = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <ProtectedRoute requiredRole="customer">
      <VendorRegistration />
    </ProtectedRoute>
  );
};

export default CustomerLayout;