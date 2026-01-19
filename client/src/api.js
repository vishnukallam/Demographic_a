import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', // Falls back to relative path if not set, but we set it in .env
    withCredentials: true
});

export default api;
