import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const AcceptInvite = () => {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const acceptInvitation = async () => {
            try {
                await authService.acceptInvite(token);
                setSuccess(true);
                setTimeout(() => {
                    navigate('/request-otp');
                }, 3000);
            } catch (err) {
                setError(err.response?.data?.message || 'Invalid or expired invitation link');
            } finally {
                setLoading(false);
            }
        };

        acceptInvitation();
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
                        Accept Invitation
                    </h2>
                </div>

                <div className="mt-8 bg-white p-8 rounded-lg shadow-xl">
                    {loading && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Processing your invitation...</p>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-800">{error}</div>
                            <button
                                onClick={() => navigate('/login')}
                                className="mt-4 w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                Go to Login
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="text-sm text-green-800">
                                <p className="font-medium">Account activated successfully!</p>
                                <p className="mt-2">You can now login using OTP. Redirecting...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;

