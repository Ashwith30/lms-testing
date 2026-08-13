import axios from 'axios';

const getBaseURL = () => {
  // If a VITE_API_URL env variable is provided (or preset at build time), use it.
  // Otherwise, default to localhost.
  return (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
});
