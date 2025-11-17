// 封装axios请求拦截
import axios from 'axios';
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN } from '../config'
import router from '@router';

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000,
  withCredentials: true // 请求跨域时携带凭证 cookie authorization
})

// 是否正在刷新token
let isRefreshing = false;
// 等待刷新的请求对列
let refreshSubscribers = [];

// 订阅token刷新
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
}

// 通知订阅者刷新完成
const onTokenRefreshed = (newAccessToken) => {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 添加access token
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误：', error);
    return Promise.reject('error')
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    // 如果是401且不是刷新token的请求
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果刷新token请求失败，直接跳转登陆页
      if (originalRequest.url.includes('/api/auth/refresh')) {
        console.error('Refresh Token无效，请重新登录');
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN);
        router.push('/login');
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        if (!refreshToken) {
          console.error('没有Refresh Token,请重新登录');
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          router.push('/login');
          return Promise.reject(error);
        }
        try {
          // 调用刷新Token接口
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken }, { withCredentials: true })
          if (response.data.success && response.data.data) {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
            // 更新本地存储
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
            localStorage.setItem(REFRESH_TOKEN, newRefreshToken);
            // 通知所有等待的请求
            onTokenRefreshed(newAccessToken);
            isRefreshing = false;
            // 重试原始请求
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return service(originalRequest);
          } else {
            throw new Error('Token 刷新失败');
          }
        } catch (e) {
          console.error('刷新token失败：', refreshToken);
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN);
          router.push('/login')
          isRefreshing = false;
          return Promise.reject(e)
        }
      } else {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve) => {
          subscribeTokenRefresh((newAccessToken) => {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            resolve(service(originalRequest))
          })
        })
      }
    }

    // 其他错误处理
    const errorMessage = error.response?.data?.message || error.message || '请求失败';
    console.error('响应错误：', errorMessage);
    return Promise.reject(error);
  }
)

export default service;