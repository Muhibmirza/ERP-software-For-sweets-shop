import axios from 'axios';
import type { ApiResponse } from '../types';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' }
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const processQueue = (error: unknown, token?: string) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token || '');
  });
  failedQueue = [];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (!error.response && original && (original.__networkRetries || 0) < 3) {
      original.__networkRetries = (original.__networkRetries || 0) + 1;
      await delay(700 * original.__networkRetries);
      return api(original);
    }
    const refreshToken = useAuthStore.getState().refreshToken;
    if (error.response?.status === 401 && refreshToken && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${import.meta.env.VITE_API_URL || ''}/api/auth/refresh-token`,
          { refreshToken }
        );
        useAuthStore.getState().setTokens(response.data.data.accessToken, response.data.data.refreshToken);
        processQueue(null, response.data.data.accessToken);
        original.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => (await promise).data.data;
