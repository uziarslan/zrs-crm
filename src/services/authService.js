import axios from 'axios';

const API_URL = process.env.REACT_APP_END_POINT || 'http://localhost:4000/api/v1';

const authService = {
    // Admin login with email/password
    login: async (email, password) => {
        const response = await axios.post(`${API_URL.replace('/v1', '')}/auth/admin/login`, {
            email,
            password,
        });

        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        return response.data;
    },

    // Request OTP for Manager/Investor
    requestOTP: async (email) => {
        const response = await axios.post(`${API_URL.replace('/v1', '')}/auth/request-otp`, {
            email,
        });
        return response.data;
    },

    // Verify OTP and login
    verifyOTP: async (email, otp) => {
        const response = await axios.post(`${API_URL.replace('/v1', '')}/auth/verify-otp`, {
            email,
            otp,
        });

        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        return response.data;
    },

    // Accept invitation
    acceptInvite: async (token) => {
        const response = await axios.post(`${API_URL.replace('/v1', '')}/auth/accept-invite/${token}`);
        return response.data;
    },

    // Logout
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Get current user
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return localStorage.getItem('token') !== null;
    },
};

export default authService;

