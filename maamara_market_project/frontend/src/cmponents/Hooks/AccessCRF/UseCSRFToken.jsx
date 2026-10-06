// hooks/useCsrfToken.js
import { useEffect, useState } from 'react';
import api from '../../../Services/Api';

export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    api
      .get('/api/get-csrf-token/')
      .then(({ data }) => {
        const token = data?.csrfToken || data?.csrftoken || data?.token || '';
        setCsrfToken(token);
      })
      .catch((err) => console.error('CSRF fetch error:', err));
  }, []);

  return csrfToken;
};
