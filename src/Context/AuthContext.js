import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Fetch current user from API
                    const baseURL = process.env.REACT_APP_END_POINT || 'http://localhost:4000/api/v1';
                    const authURL = baseURL.replace('/v1', '/auth/user');

                    const response = await axios.get(authURL, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    setUser(response.data.user);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    authService.logout();
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        const data = await authService.login(email, password);
        setUser(data.user);
        return data;
    };

    const loginWithOTP = async (email, otp) => {
        const data = await authService.verifyOTP(email, otp);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        loginWithOTP,
        logout,
        isAuthenticated: authService.isAuthenticated(),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;

