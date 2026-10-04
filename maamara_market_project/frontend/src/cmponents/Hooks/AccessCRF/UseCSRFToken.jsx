// hooks/useCsrfToken.js
import { useEffect, useState } from 'react';
import api from '../../../Services/Api';

export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    api.get('/api/get-csrf-token/')
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(err => console.error('CSRF fetch error:', err));
  }, []);

  return csrfToken;
};
