import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  useTheme,
} from '@mui/material';
import { tokens } from '../../theme';
import useVendors from '../Hooks/Vendor_hook/VendorHook';

export default function ProductOnsite() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [vendors, setVendors] = useVendors();

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2em',
        padding: '1em 2.5em',
        justifyContent: 'center',
      }}
    >
      {vendors.flatMap((vendor) =>
        vendor.items.map((item) => (
          <Box key={item.id}>
            <Card
              sx={{
                height: '100%',
                backgroundColor: colors.primary[600],
                width: { xs: 280, sm: 320, md: 300 },
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.03)',
                },
              }}
            >
              <CardMedia
                component="img"
                height="200"
                image={item.image || '/default-product.jpg'}
                alt={item.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: colors.gray[100], fontWeight: 600 }}
                >
                  {item.name}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {item.description || 'No description available'}
                </Typography>

                <Typography variant="subtitle1" color={colors.primary[200]}>
                  KES {item.discount_price || item.price}
                  {item.discount_price && item.discount_price < item.price && (
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{
                        textDecoration: 'line-through',
                        marginLeft: 1,
                        color: '#ff666b',
                      }}
                    >
                      KES {item.price}
                    </Typography>
                  )}
                </Typography>

                <Typography variant="caption">Size: {item.size}</Typography>
                <br />
                <Typography variant="caption">Stock: {item.in_stock}</Typography>
              </CardContent>
            </Card>
          </Box>
        ))
      )}
    </Box>
  );
};
