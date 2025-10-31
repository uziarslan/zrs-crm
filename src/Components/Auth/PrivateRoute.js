import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (user.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
        if (user.role === 'investor') return <Navigate to="/investor/dashboard" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default PrivateRoute;

