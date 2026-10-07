import axios from 'axios';
import { message } from 'antd';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 0) {
        message.error(body.message || '操作失败');
        return Promise.reject(new Error(body.message));
      }
      return body;
    }
    return body;
  },
  (err) => {
    const msg =
      err.response?.data?.message || err.response?.data?.error || err.message || '网络错误';
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.startsWith('/login')) {
        message.error('登录已过期，请重新登录');
        location.href = '/login';
        return new Promise(() => {});
      }
    }
    message.error(Array.isArray(msg) ? msg.join('；') : msg);
    return Promise.reject(err);
  },
);

export default api;
