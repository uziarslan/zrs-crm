import React from 'react';
import Navbar from './Navbar';

const DashboardLayout = ({ children, title }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {title && (
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    </div>
                )}
                <div className="fade-in">{children}</div>
            </div>
        </div>
    );
};

export default DashboardLayout;

