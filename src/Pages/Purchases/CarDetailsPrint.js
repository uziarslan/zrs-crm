import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../services/axiosInstance';

const CarDetailsPrint = () => {
    const { id } = useParams();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLead();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchLead = async () => {
        try {
            const response = await axiosInstance.get(`/purchases/leads/${id}`);
            setLead(response.data.data);
        } catch (err) {
            console.error('Failed to fetch lead:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p>Loading car details...</p>
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-600">Failed to load car details</p>
            </div>
        );
    }

    const carPictures = lead?.attachments?.filter(doc => doc.category === 'carPictures') || [];

    return (
        <div className="min-h-screen bg-white p-8 print:p-4">
            {/* Print Button - Hidden when printing */}
            <div className="mb-6 print:hidden flex justify-end">
                <button
                    onClick={handlePrint}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / Save as PDF
                </button>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="border-b-4 border-gray-800 pb-4 mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} {lead?.vehicleInfo?.year}
                    </h1>
                    <p className="text-xl text-gray-600">Lead ID: {lead?.leadId}</p>
                </div>

                {/* Car Pictures */}
                {carPictures.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                            Car Pictures
                        </h2>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                            {carPictures.map((pic, index) => (
                                <div key={pic._id || index} className="aspect-square max-w-[150px] mx-auto">
                                    <img
                                        src={pic.url}
                                        alt={`${lead?.vehicleInfo?.make || ''} ${lead?.vehicleInfo?.model || ''} ${index + 1}`}
                                        className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vehicle Information */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                        Vehicle Information
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Make</p>
                            <p className="text-lg font-semibold text-gray-900">{lead?.vehicleInfo?.make || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Model</p>
                            <p className="text-lg font-semibold text-gray-900">{lead?.vehicleInfo?.model || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Year</p>
                            <p className="text-lg font-semibold text-gray-900">{lead?.vehicleInfo?.year || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Mileage</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {lead?.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Color</p>
                            <p className="text-lg font-semibold text-gray-900">{lead?.vehicleInfo?.color || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Trim</p>
                            <p className="text-lg font-semibold text-gray-900">{lead?.vehicleInfo?.trim || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Region</p>
                            <p className="text-lg font-semibold text-gray-900">{lead?.vehicleInfo?.region || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">VIN</p>
                            <p className="text-lg font-semibold text-gray-900 font-mono">{lead?.vehicleInfo?.vin || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Asking Price</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {lead?.vehicleInfo?.askingPrice ? `AED ${lead.vehicleInfo.askingPrice.toLocaleString()}` : 'N/A'}
                            </p>
                        </div>
                        {lead?.vehicleInfo?.expectedPrice && (
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Expected Price</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    AED {lead.vehicleInfo.expectedPrice.toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
                    <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @page {
                    margin: 0;
                    size: letter;
                }
                @media print {
                    html, body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    body * {
                        visibility: visible;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:p-4 {
                        padding: 1rem !important;
                    }
                    /* Add padding to content when printing since page margins are 0 */
                    .max-w-4xl {
                        padding: 1rem;
                    }
                    /* Ensure car images stay small when printing */
                    div.grid.grid-cols-4 img,
                    div.grid.grid-cols-6 img {
                        max-width: 150px !important;
                        max-height: 150px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CarDetailsPrint;
