import React, { useState } from 'react';
import {
  Box, Button, TextField, Select, MenuItem, InputLabel, FormControl, Typography, Breadcrumbs,
  useTheme
} from '@mui/material';
import axios from 'axios';
import { baseUrl } from '../../../Constant/Constant';
import { useCsrfToken } from '../../../Hooks/AccessCRF/UseCSRFToken';
import api from '../../../../Services/Api';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { tokens } from '../../../../theme';
import { Link } from 'react-router-dom';
import "../../../../index.css";




const VendorItemForm = () => {
    const csrfToken = useCsrfToken();

    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    in_stock: '',
    category: '',
    size: '',
    gender_based: '',
    color: '',
    item_attribute: '',
    image: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    try {
      const res = await api.post(`${baseUrl}api/item-post/update/`, data, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRFToken': csrfToken,
        }
      });
      console.log('Item posted:', res.data);
    } catch (err) {
      console.error('Error posting item:', err);
    }
  };

 

  return (
   <Box sx={{width: '300px',}}style={{
    
   }}>
    <Box sx={{display:'flex', gap: '1em', padding: '1em 1em'}}>
    <Breadcrumbs maxItems={2} aria-label="breadcrumb">
  <Link underline="hover" color={colors.blueAccent[100]}  href="#">
    Home
  </Link>
  <Link underline="hover" color={colors.blueAccent[100]} href="#">
    Items
  </Link>
  
  <Typography sx={{ color: colors.gray[100]  }}>Add Items</Typography>
</Breadcrumbs>
    </Box>

   

    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Typography variant="h5" mb={2}>Post New Item</Typography>

      <TextField label="Name" name="name" fullWidth margin="normal" onChange={handleChange} />
      <TextField label="Description" name="description" fullWidth margin="normal" multiline rows={4} onChange={handleChange} />
      <TextField label="Price" name="price" type="number" fullWidth margin="normal" onChange={handleChange} />
      <TextField label="Stock Quantity" name="in_stock" type="number" fullWidth margin="normal" onChange={handleChange} />

      <FormControl fullWidth margin="normal">
        <InputLabel>Size</InputLabel>
        <Select name="size" value={formData.size} onChange={handleChange}>
          <MenuItem value="Small">Small</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="large">Large</MenuItem>
          <MenuItem value="free-size">Free Size</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Gender</InputLabel>
        <Select name="gender_based" value={formData.gender_based} onChange={handleChange}>
          <MenuItem value="men">Men</MenuItem>
          <MenuItem value="women">Women</MenuItem>
          <MenuItem value="children">Children</MenuItem>
          <MenuItem value="unisex">Unisex</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Color</InputLabel>
        <Select name="color" value={formData.color} onChange={handleChange}>
          <MenuItem value="blue">Blue</MenuItem>
          <MenuItem value="black">Black</MenuItem>
          <MenuItem value="red">Red</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Attribute</InputLabel>
        <Select name="item_attribute" value={formData.item_attribute} onChange={handleChange}>
          <MenuItem value="beaded">Beaded</MenuItem>
          <MenuItem value="gold">Gold</MenuItem>
          <MenuItem value="silver">Silver</MenuItem>
        </Select>
      </FormControl>

      <Button variant="contained" component="label" sx={{ mt: 2 }}>
        Upload Image
        <input type="file" hidden onChange={handleFileChange} />
      </Button>

      <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
        Submit Item
      </Button>
    </Box>
    </Box>
  );
};

export default VendorItemForm;
