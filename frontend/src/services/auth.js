import api from './api';

export const getToken    = ()      => localStorage.getItem('prms_token');
export const getUser     = ()      => { try { return JSON.parse(localStorage.getItem('prms_user')); } catch { return null; } };
export const isLoggedIn  = ()      => !!getToken();
export const getRole     = ()      => getUser()?.role || null;

const _save = (token, user) => {
  localStorage.setItem('prms_token', token);
  localStorage.setItem('prms_user', JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem('prms_token');
  localStorage.removeItem('prms_user');
  window.location.href = '/login';
};

export const loginUser = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  _save(data.token, data.user);
  return data.user;
};

export const registerTeacher = async (name, email, password) => {
  const { data } = await api.post('/auth/register-teacher', { name, email, password });
  _save(data.token, data.user);
  return data;   // includes join_code
};

export const registerStudent = async (name, email, password, join_code) => {
  const { data } = await api.post('/auth/register-student', { name, email, password, join_code });
  _save(data.token, data.user);
  return data.user;
};
