// Centralized API configuration for Geo-Attend
// Works on localhost, local Wi-Fi IP, Cloudflare tunnels, and Cloud Hosting (Vercel / Render / Netlify)!

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('GEOATTEND_API_URL');
    if (custom) return custom.trim().replace(/\/$/, '');
  }
  return import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
};

export const setApiBaseUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('GEOATTEND_API_URL', url.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem('GEOATTEND_API_URL');
    }
  }
};

export const getApiUrl = () => {
  const base = getApiBaseUrl();
  return base ? `${base}/api` : '/api';
};

export const API_BASE = {
  toString() {
    return getApiBaseUrl();
  },
  valueOf() {
    return getApiBaseUrl();
  }
};

export const API_URL = {
  toString() {
    return getApiUrl();
  },
  valueOf() {
    return getApiUrl();
  }
};

export default {
  API_BASE,
  API_URL,
  getApiBaseUrl,
  setApiBaseUrl,
  getApiUrl
};
