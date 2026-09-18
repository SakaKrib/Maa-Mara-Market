// hooks/useCsrfToken.js
import { useEffect, useState } from 'react';
import { baseUrl } from '../../Constant/Constant';

export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetch(`${baseUrl}/api/get-csrf-token/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(err => console.error('CSRF fetch error:', err));
  }, []);

  return csrfToken;
};
