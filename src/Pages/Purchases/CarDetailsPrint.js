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

    // Calculate Job Costing Total
    const jobCostingTotal = (() => {
        const transferCost = Number(lead?.jobCosting?.transferCost || 0);
        const detailingCost = Number(lead?.jobCosting?.detailing_cost || 0);
        const agentCommission = Number(lead?.jobCosting?.agent_commision || 0);
        const carRecoveryCost = Number(lead?.jobCosting?.car_recovery_cost || 0);
        const inspectionCost = Number(lead?.jobCosting?.inspection_cost || 0);
        return transferCost + detailingCost + agentCommission + carRecoveryCost + inspectionCost;
    })();

    // Calculate Car Total Price (Purchased Final Price + Job Costing Total)
    const purchasedFinalPrice = Number(lead?.priceAnalysis?.purchasedFinalPrice || 0);
    const carTotalPrice = purchasedFinalPrice + jobCostingTotal;

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
            <div className="max-w-4xl mx-auto print-container">
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
                            {carPictures.slice(0, 12).map((pic, index) => (
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

                {/* Price Analysis */}
                {(lead?.priceAnalysis?.minSellingPrice || lead?.priceAnalysis?.maxSellingPrice || lead?.priceAnalysis?.purchasedFinalPrice) && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                            Price Analysis
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {lead?.priceAnalysis?.minSellingPrice && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Min Selling Price</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.priceAnalysis.minSellingPrice.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {lead?.priceAnalysis?.maxSellingPrice && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Max Selling Price</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.priceAnalysis.maxSellingPrice.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {lead?.priceAnalysis?.purchasedFinalPrice && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Purchased Final Price</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.priceAnalysis.purchasedFinalPrice.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Job Costing */}
                {(lead?.jobCosting?.transferCost || lead?.jobCosting?.detailing_cost || lead?.jobCosting?.agent_commision || lead?.jobCosting?.car_recovery_cost || lead?.jobCosting?.inspection_cost || jobCostingTotal > 0) && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                            Job Costing
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {lead?.jobCosting?.transferCost !== undefined && lead?.jobCosting?.transferCost !== null && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Transfer Cost</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.jobCosting.transferCost.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {lead?.jobCosting?.detailing_cost !== undefined && lead?.jobCosting?.detailing_cost !== null && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Detailing Cost</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.jobCosting.detailing_cost.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {lead?.jobCosting?.agent_commision !== undefined && lead?.jobCosting?.agent_commision !== null && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Agent Commission</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.jobCosting.agent_commision.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {lead?.jobCosting?.car_recovery_cost !== undefined && lead?.jobCosting?.car_recovery_cost !== null && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Car Recovery Cost</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.jobCosting.car_recovery_cost.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {lead?.jobCosting?.inspection_cost !== undefined && lead?.jobCosting?.inspection_cost !== null && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Inspection Cost</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        AED {lead.jobCosting.inspection_cost.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {/* Job Costing Total - Last item in the grid, spans all columns */}
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Job Costing Total</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    AED {jobCostingTotal.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {/* Car Total Price */}
                        {carTotalPrice > 0 && (
                            <div className="mt-4 pt-4 border-t-2 border-gray-400">
                                <div className="flex justify-between items-center">
                                    <p className="text-lg font-bold text-gray-900">Car Total Price</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        AED {carTotalPrice.toLocaleString()}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    (Purchased Final Price: AED {purchasedFinalPrice.toLocaleString()} + Job Costing Total: AED {jobCostingTotal.toLocaleString()})
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600 print-footer">
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
                        font-size: 12px !important;
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
                        padding-bottom: 3rem !important;
                    }
                    /* Reduce all text sizes and line heights when printing */
                    h1 {
                        font-size: 1.75rem !important;
                        line-height: 1.2 !important;
                    }
                    h2 {
                        font-size: 1.25rem !important;
                        line-height: 1.3 !important;
                    }
                    p {
                        font-size: 0.875rem !important;
                        line-height: 1.4 !important;
                    }
                    .text-4xl {
                        font-size: 1.75rem !important;
                        line-height: 1.2 !important;
                    }
                    .text-2xl {
                        font-size: 1.25rem !important;
                        line-height: 1.3 !important;
                    }
                    .text-xl {
                        font-size: 1rem !important;
                        line-height: 1.35 !important;
                    }
                    .text-lg {
                        font-size: 0.875rem !important;
                        line-height: 1.4 !important;
                    }
                    .text-sm {
                        font-size: 0.75rem !important;
                        line-height: 1.4 !important;
                    }
                    /* Reduce spacing for all elements */
                    div {
                        line-height: 1.4 !important;
                    }
                    /* Reduce margins and padding for better spacing */
                    .mb-8 {
                        margin-bottom: 1rem !important;
                    }
                    .mb-4 {
                        margin-bottom: 0.5rem !important;
                    }
                    .mb-2 {
                        margin-bottom: 0.25rem !important;
                    }
                    .mb-1 {
                        margin-bottom: 0.125rem !important;
                    }
                    .mt-8 {
                        margin-top: 1rem !important;
                    }
                    .pb-4 {
                        padding-bottom: 0.5rem !important;
                    }
                    .pb-2 {
                        padding-bottom: 0.25rem !important;
                    }
                    .pt-4 {
                        padding-top: 0.5rem !important;
                    }
                    .gap-4 {
                        gap: 0.5rem !important;
                    }
                    .gap-3 {
                        gap: 0.375rem !important;
                    }
                    /* Force 3 columns for Price Analysis and Job Costing when printing */
                    .grid.grid-cols-2 {
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }
                    /* Ensure car images stay small when printing */
                    div.grid.grid-cols-4 img,
                    div.grid.grid-cols-6 img {
                        max-width: 150px !important;
                        max-height: 150px !important;
                    }
                    /* Position footer at bottom of page when printing */
                    .print-footer {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        width: 100% !important;
                        margin-top: 0 !important;
                        padding: 0.5rem 1rem !important;
                        background: white !important;
                        border-top: 2px solid #e5e7eb !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CarDetailsPrint;
