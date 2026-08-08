import axios from 'axios';

// In development: full URL to Flask on port 5000
// In production:  same origin — Flask serves both the API and the React app
const BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('prms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register');

    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('prms_token');
      localStorage.removeItem('prms_user');
      window.location.href = '/login';
    }

    return Promise.reject(err);
  }
);

export default api;
