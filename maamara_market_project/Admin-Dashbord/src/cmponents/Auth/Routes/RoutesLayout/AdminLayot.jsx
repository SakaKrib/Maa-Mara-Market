import { Outlet } from 'react-router-dom';
import ProtectedRoute from '../ProtectRoute';
import { Box, useTheme } from '@mui/material';
import HeaderTop from '../../../Portions/HederTop/HeaderTop';
import NavBar from '../../../Portions/NavBar/NavBarSide';
import { tokens } from '../../../../theme';

const AdminLayout = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <ProtectedRoute requiredRole="admin">
      <HeaderTop />
      <NavBar />
      <div className="content-vite" style={{backgroundColor:colors.primary[500]}}>
        <Box className="main-dashboard" sx={{ backgroundColor: colors.primary[500], margin: '90px 0 0 0', height:'100%'}}>
          <Outlet />
        </Box>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;
