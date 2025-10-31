import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

const VerifyOTP = () => {
    const location = useLocation();
    const email = location.state?.email || '';
    const [otp, setOTP] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginWithOTP } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await loginWithOTP(email, otp);

            // Redirect based on role
            if (data.user.role === 'manager') {
                navigate('/manager/dashboard');
            } else if (data.user.role === 'investor') {
                navigate('/investor/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!email) {
        navigate('/request-otp');
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
                        Verify OTP
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter the 6-digit code sent to <strong>{email}</strong>
                    </p>
                </div>

                <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-xl" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-800">{error}</div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="otp" className="sr-only">
                            OTP Code
                        </label>
                        <input
                            id="otp"
                            name="otp"
                            type="text"
                            maxLength="6"
                            required
                            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOTP(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </div>

                    <div className="text-center space-y-2">
                        <Link
                            to="/request-otp"
                            className="font-medium text-primary-600 hover:text-primary-500 text-sm block"
                        >
                            Didn't receive the code? Request again
                        </Link>
                        <Link
                            to="/login"
                            className="font-medium text-gray-600 hover:text-gray-500 text-sm block"
                        >
                            ← Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VerifyOTP;

