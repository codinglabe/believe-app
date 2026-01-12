// resources/js/hooks/useAxios.ts
import { useEffect } from 'react';
import axios from 'axios';

const useAxios = () => {
    useEffect(() => {
        // Function to get CSRF token
        const getCsrfToken = () => {
            return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        };

        // Set CSRF token on axios defaults
        axios.defaults.headers.common['X-CSRF-TOKEN'] = getCsrfToken();
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        axios.defaults.withCredentials = true;

        // Add request interceptor to ensure token is always fresh
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                // Update token for each request
                config.headers['X-CSRF-TOKEN'] = getCsrfToken();
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Add response interceptor for session timeout
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 419) {
                    // CSRF token mismatch - reload page to get new token
                    console.log('CSRF token expired, reloading page...');
                    window.location.reload();
                }
                if (error.response?.status === 401) {
                    // Unauthorized - redirect to login
                    console.log('Unauthorized, redirecting...');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors on unmount
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []); // Empty dependency array means this runs once on mount

    return axios;
};

export default useAxios;
