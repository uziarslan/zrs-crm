import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';
import ConfirmDialog from '../../Components/ConfirmDialog';

const Negotiation = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '' });
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [bulkStatus, setBulkStatus] = useState('');
    const [showBulkBar, setShowBulkBar] = useState(false);
    const [showMoveToInspectionModal, setShowMoveToInspectionModal] = useState(false);
    const [leadToMove, setLeadToMove] = useState(null);
    const [isMovingToInspection, setIsMovingToInspection] = useState(false);
    const [showDocumentWarningModal, setShowDocumentWarningModal] = useState(false);
    const [leadsWithoutDocs, setLeadsWithoutDocs] = useState([]);
    const [showConsignmentModal, setShowConsignmentModal] = useState(false);
    const [isConvertingToConsignment, setIsConvertingToConsignment] = useState(false);
    const [leadConsignmentData, setLeadConsignmentData] = useState({}); // Per-lead data: { leadId: { priceAnalysis: {...}, chassisNumber: '' } }
    const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

    useEffect(() => {
        fetchLeads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        setShowBulkBar(selectedLeads.length > 0);
    }, [selectedLeads]);

    const showNotification = useCallback((type, message) => {
        setNotification({ show: true, type, message });
        setTimeout(() => {
            setNotification({ show: false, type, message: '' });
        }, 5000);
    }, []);

    const showSuccess = useCallback(
        (message) => showNotification('success', message),
        [showNotification]
    );
    const showError = useCallback(
        (message) => showNotification('error', message),
        [showNotification]
    );
    const showWarning = useCallback(
        (message) => showNotification('warning', message),
        [showNotification]
    );

    const fetchLeads = async () => {
        try {
            const params = new URLSearchParams();
            params.append('status', 'negotiation');
            if (filters.search) params.append('search', filters.search);

            const response = await axiosInstance.get(`/purchases/leads?${params}`);
            setLeads(response.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch negotiation leads');
        } finally {
            setLoading(false);
        }
    };

    const exportLeads = async () => {
        try {
            const params = new URLSearchParams();
            params.append('type', 'purchase');
            params.append('status', 'negotiation');

            const response = await axiosInstance.get(`/export/leads?${params}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `negotiation_leads_${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            showError('Failed to export leads');
        }
    };

    const hasAllRequiredDocuments = (lead) => {
        if (!lead.attachments || lead.attachments.length === 0) return false;
        const hasRegistrationCard = lead.attachments.some(doc => doc.category === 'registrationCard');
        const hasCarPictures = lead.attachments.some(doc => doc.category === 'carPictures');
        const hasOnlineHistoryCheck = lead.attachments.some(doc => doc.category === 'onlineHistoryCheck');
        return hasRegistrationCard && hasCarPictures && hasOnlineHistoryCheck;
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const leadsReadyForInspection = leads.filter(lead => hasAllRequiredDocuments(lead));
            setSelectedLeads(leadsReadyForInspection.map(lead => lead._id));
        } else {
            setSelectedLeads([]);
        }
    };

    const handleSelectLead = (leadId) => {
        if (selectedLeads.includes(leadId)) {
            setSelectedLeads(selectedLeads.filter(id => id !== leadId));
        } else {
            setSelectedLeads([...selectedLeads, leadId]);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (!bulkStatus) {
            showWarning('Please select a status');
            return;
        }

        if (selectedLeads.length === 0) {
            showWarning('Please select at least one lead');
            return;
        }

        if (bulkStatus === 'consignment') {
            // Initialize per-lead data structure
            const initialLeadData = {};
            selectedLeads.forEach(leadId => {
                const lead = leads.find(l => l._id === leadId);
                initialLeadData[leadId] = {
                    priceAnalysis: {
                        minSellingPrice: lead?.priceAnalysis?.minSellingPrice || '',
                        maxSellingPrice: lead?.priceAnalysis?.maxSellingPrice || '',
                        purchasedFinalPrice: lead?.priceAnalysis?.purchasedFinalPrice || ''
                    },
                    chassisNumber: lead?.vehicleInfo?.vin || ''
                };
            });
            setLeadConsignmentData(initialLeadData);
            setShowConsignmentModal(true);
            return;
        }

        if (bulkStatus === 'inspection') {
            const selectedLeadObjects = leads.filter(lead => selectedLeads.includes(lead._id));
            const leadsWithoutDocsFound = selectedLeadObjects.filter(lead => !hasAllRequiredDocuments(lead));

            if (leadsWithoutDocsFound.length > 0) {
                setLeadsWithoutDocs(leadsWithoutDocsFound);
                setShowDocumentWarningModal(true);
                return;
            }
        }

        try {
            await axiosInstance.put('/purchases/leads/bulk-status', {
                leadIds: selectedLeads,
                status: bulkStatus
            });

            showSuccess(`Successfully updated ${selectedLeads.length} lead(s)`);
            setSelectedLeads([]);
            setBulkStatus('');
            fetchLeads();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to bulk update');
        }
    };

    const handleConvertToConsignment = async () => {
        // Validate each lead individually
        const errors = [];
        const leadIds = Object.keys(leadConsignmentData);

        for (const leadId of leadIds) {
            const lead = leads.find(l => l._id === leadId);
            const leadData = leadConsignmentData[leadId];
            const priceAnalysis = leadData.priceAnalysis;

            // Validate price analysis
            if (!priceAnalysis.minSellingPrice && !priceAnalysis.maxSellingPrice) {
                errors.push(`Lead ${lead?.leadId || leadId}: Please enter at least Minimum or Maximum Selling Price`);
                continue;
            }

            const minPrice = priceAnalysis.minSellingPrice ? parseFloat(priceAnalysis.minSellingPrice) : null;
            const maxPrice = priceAnalysis.maxSellingPrice ? parseFloat(priceAnalysis.maxSellingPrice) : null;
            const finalPrice = priceAnalysis.purchasedFinalPrice ? parseFloat(priceAnalysis.purchasedFinalPrice) : null;

            if (priceAnalysis.minSellingPrice && (isNaN(minPrice) || minPrice <= 0)) {
                errors.push(`Lead ${lead?.leadId || leadId}: Minimum Selling Price must be a valid positive number`);
                continue;
            }

            if (priceAnalysis.maxSellingPrice && (isNaN(maxPrice) || maxPrice <= 0)) {
                errors.push(`Lead ${lead?.leadId || leadId}: Maximum Selling Price must be a valid positive number`);
                continue;
            }

            if (priceAnalysis.purchasedFinalPrice && (isNaN(finalPrice) || finalPrice <= 0)) {
                errors.push(`Lead ${lead?.leadId || leadId}: Purchased Final Price must be a valid positive number`);
                continue;
            }

            if (minPrice && maxPrice && minPrice > maxPrice) {
                errors.push(`Lead ${lead?.leadId || leadId}: Minimum Selling Price cannot be greater than Maximum Selling Price`);
                continue;
            }
        }

        if (errors.length > 0) {
            showWarning(errors.join('\n'));
            return;
        }

        setIsConvertingToConsignment(true);
        try {
            const leadIdsArray = [];

            // Update price analysis and chassis number for each lead
            for (const leadId of leadIds) {
                const leadData = leadConsignmentData[leadId];
                const priceAnalysis = leadData.priceAnalysis;

                const minPrice = priceAnalysis.minSellingPrice ? parseFloat(priceAnalysis.minSellingPrice) : null;
                const maxPrice = priceAnalysis.maxSellingPrice ? parseFloat(priceAnalysis.maxSellingPrice) : null;
                const finalPrice = priceAnalysis.purchasedFinalPrice ? parseFloat(priceAnalysis.purchasedFinalPrice) : null;

                // Update price analysis
                await axiosInstance.put(`/purchases/leads/${leadId}/price-analysis`, {
                    minSellingPrice: minPrice,
                    maxSellingPrice: maxPrice,
                    purchasedFinalPrice: finalPrice
                });

                // Update chassis number (VIN) if provided
                if (leadData.chassisNumber.trim()) {
                    await axiosInstance.put(`/purchases/leads/${leadId}`, {
                        vehicleInfo: { vin: leadData.chassisNumber.trim() }
                    });
                }

                leadIdsArray.push(leadId);
            }

            // Then, update status to consignment for all leads
            await axiosInstance.put('/purchases/leads/bulk-status', {
                leadIds: leadIdsArray,
                status: 'consignment'
            });

            showSuccess(`Successfully converted ${leadIdsArray.length} lead(s) to consignment`);
            setSelectedLeads([]);
            setBulkStatus('');
            setLeadConsignmentData({});
            setShowConsignmentModal(false);
            fetchLeads();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to convert to consignment');
        } finally {
            setIsConvertingToConsignment(false);
        }
    };

    // Helper functions for bulk consignment
    const handleLeadPriceAnalysisChange = (leadId, field, value) => {
        setLeadConsignmentData(prev => ({
            ...prev,
            [leadId]: {
                ...prev[leadId],
                priceAnalysis: {
                    ...prev[leadId].priceAnalysis,
                    [field]: value
                }
            }
        }));
    };

    const handleLeadChassisNumberChange = (leadId, value) => {
        setLeadConsignmentData(prev => ({
            ...prev,
            [leadId]: {
                ...prev[leadId],
                chassisNumber: value
            }
        }));
    };

    const handleMoveToInspection = (lead) => {
        setLeadToMove(lead);
        setShowMoveToInspectionModal(true);
    };

    const confirmMoveToInspection = async () => {
        if (!leadToMove) return;

        setIsMovingToInspection(true);
        try {
            await axiosInstance.put(`/purchases/leads/${leadToMove._id}/status`, {
                status: 'inspection'
            });
            setShowMoveToInspectionModal(false);
            setLeadToMove(null);
            fetchLeads();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to move to inspection');
        } finally {
            setIsMovingToInspection(false);
        }
    };

    const getDocumentProgress = (lead) => {
        // Check for 3 required documents (matching detail page logic):
        // 1. Registration Card (customer registration card)
        // 2. Car Pictures
        // 3. Online History Check
        const hasRegistrationCard = lead.attachments?.some(doc => doc.category === 'registrationCard');
        const hasCarPictures = lead.attachments?.some(doc => doc.category === 'carPictures');
        const hasOnlineHistoryCheck = lead.attachments?.some(doc => doc.category === 'onlineHistoryCheck');

        let completed = 0;
        const total = 3; // Always 3 documents required

        if (hasRegistrationCard) completed++;
        if (hasCarPictures) completed++;
        if (hasOnlineHistoryCheck) completed++;

        return Math.round((completed / total) * 100);
    };

    if (loading) {
        return (
            <DashboardLayout title="Negotiation">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {notification.show && (
                        <div
                            className={`mb-4 border-l-4 p-4 rounded-r-lg ${notification.type === 'success'
                                    ? 'bg-green-50 border-green-400'
                                    : notification.type === 'warning'
                                        ? 'bg-yellow-50 border-yellow-400'
                                        : 'bg-red-50 border-red-400'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <p
                                    className={`text-sm ${notification.type === 'success'
                                            ? 'text-green-700'
                                            : notification.type === 'warning'
                                                ? 'text-yellow-700'
                                                : 'text-red-700'
                                        }`}
                                >
                                    {notification.message}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setNotification({ show: false, type: 'success', message: '' })
                                    }
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const leadsReady = leads.filter(lead => hasAllRequiredDocuments(lead)).length;
    const leadsPending = leads.length - leadsReady;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                {notification.show && (
                    <div
                        className={`mb-4 border-l-4 p-4 rounded-r-lg ${notification.type === 'success'
                                ? 'bg-green-50 border-green-400'
                                : notification.type === 'warning'
                                    ? 'bg-yellow-50 border-yellow-400'
                                    : 'bg-red-50 border-red-400'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <p
                                className={`text-sm ${notification.type === 'success'
                                        ? 'text-green-700'
                                        : notification.type === 'warning'
                                            ? 'text-yellow-700'
                                            : 'text-red-700'
                                    }`}
                            >
                                {notification.message}
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    setNotification({ show: false, type: 'success', message: '' })
                                }
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Negotiation Leads</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Document collection and negotiation management
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">In Progress</p>
                                <p className="text-2xl font-bold text-purple-900">{leadsPending}</p>
                                <p className="text-xs text-purple-600 mt-1">Documents pending</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Ready for Inspection</p>
                                <p className="text-2xl font-bold text-green-900">{leadsReady}</p>
                                <p className="text-xs text-green-600 mt-1">All documents complete</p>
                            </div>
                            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <div className="flex">
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="ml-3 text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Bulk Action Bar */}
            {showBulkBar && user?.role === 'admin' && (
                <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 rounded-r-lg shadow-sm">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-lg shadow">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {selectedLeads.length} Lead{selectedLeads.length !== 1 ? 's' : ''} Ready
                                        </div>
                                        <div className="text-xs text-gray-500">Move to Inspection</div>
                                    </div>
                                </div>

                                <div className="h-12 w-px bg-gray-300"></div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700">Action:</label>
                                    <select
                                        value={bulkStatus}
                                        onChange={(e) => setBulkStatus(e.target.value)}
                                        className="border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm"
                                    >
                                        <option value="">Choose...</option>
                                        <option value="inspection">Move to Inspection</option>
                                        <option value="consignment">Convert to Consignment</option>
                                        <option value="cancelled">Cancel</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkStatusUpdate}
                                    disabled={!bulkStatus}
                                    className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg shadow-md transition-all ${bulkStatus
                                        ? 'text-white bg-green-600 hover:bg-green-700 hover:shadow-lg'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                        }`}
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    Move Selected
                                </button>
                                <button
                                    onClick={() => setSelectedLeads([])}
                                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search negotiation leads..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                <button
                    onClick={exportLeads}
                    className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {user?.role === 'admin' && (
                                    <th className="px-6 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedLeads.length > 0 &&
                                                leads.filter(lead => hasAllRequiredDocuments(lead)).every(lead =>
                                                    selectedLeads.includes(lead._id)
                                                )
                                            }
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Lead
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Vehicle
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Color
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Price
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Documents
                                </th>
                                {user?.role === 'admin' && (
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Action
                                    </th>
                                )}
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leads.map((lead) => {
                                const progress = getDocumentProgress(lead);
                                const isReady = hasAllRequiredDocuments(lead);

                                return (
                                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                                        {user?.role === 'admin' && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.includes(lead._id)}
                                                    onChange={() => handleSelectLead(lead._id)}
                                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-primary-600">{lead.leadId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{lead.contactInfo.name}</div>
                                                <div className="text-xs text-gray-500">{lead.contactInfo.phone}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.vehicleInfo ? (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{lead.vehicleInfo.year}</div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">Not specified</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {lead.vehicleInfo?.color ? (
                                                <span className="text-sm text-gray-900 capitalize">{lead.vehicleInfo.color}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {lead.vehicleInfo?.askingPrice ? (
                                                <div className="text-sm font-semibold text-gray-900">
                                                    AED {lead.vehicleInfo.askingPrice.toLocaleString()}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-[80px]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-semibold ${isReady ? 'text-green-700' : 'text-gray-600'}`}>
                                                            {progress}%
                                                        </span>
                                                        {isReady && (
                                                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all ${isReady ? 'bg-green-600' : 'bg-purple-500'}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {user?.role === 'admin' && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isReady ? (
                                                    <button
                                                        onClick={() => handleMoveToInspection(lead)}
                                                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm"
                                                    >
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                        Move
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {new Date(lead.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                to={`/purchases/negotiation/${lead._id}`}
                                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all"
                                            >
                                                View
                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {leads.length === 0 && (
                    <div className="text-center py-16">
                        <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No leads in negotiation</h3>
                        <p className="text-sm text-gray-500">
                            {filters.search ? 'Try adjusting your search' : 'Leads will appear here when moved to negotiation status'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ConfirmDialog
                isOpen={showMoveToInspectionModal}
                onClose={() => {
                    if (!isMovingToInspection) {
                        setShowMoveToInspectionModal(false);
                        setLeadToMove(null);
                    }
                }}
                onConfirm={confirmMoveToInspection}
                title="Move to Inspection"
                message={`All required documents have been uploaded for lead ${leadToMove?.leadId}. Are you sure you want to move this lead to the Inspection phase?`}
                confirmText="Move to Inspection"
                cancelText="Cancel"
                isLoading={isMovingToInspection}
                danger={false}
            />

            {showDocumentWarningModal && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowDocumentWarningModal(false)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-gray-200 bg-red-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Missing Required Documents</h3>
                                </div>
                                <button
                                    onClick={() => setShowDocumentWarningModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 max-h-96 overflow-y-auto">
                            <p className="text-sm text-gray-600 mb-4">
                                The following leads cannot be moved to inspection because they are missing required documents:
                            </p>

                            <div className="space-y-2 mb-4">
                                {leadsWithoutDocs.map((lead) => (
                                    <div key={lead._id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-primary-600">{lead.leadId}</span>
                                            <span className="text-sm text-gray-700">{lead.contactInfo.name}</span>
                                        </div>
                                        <Link
                                            to={`/purchases/negotiation/${lead._id}`}
                                            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800"
                                            onClick={() => setShowDocumentWarningModal(false)}
                                        >
                                            Upload Documents
                                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Required Documents:</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Registration Card
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Car Pictures
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Online History Check
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl">
                            <button
                                onClick={() => setShowDocumentWarningModal(false)}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Consignment Price Analysis Modal */}
            {showConsignmentModal && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => !isConvertingToConsignment && setShowConsignmentModal(false)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Convert to Consignment</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Configure price analysis for {selectedLeads.length} selected lead(s)
                                    </p>
                                </div>
                                {!isConvertingToConsignment && (
                                    <button
                                        onClick={() => setShowConsignmentModal(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
                            {/* Selected Leads Table */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-base font-semibold text-gray-900">Enter Price Analysis for Each Lead</h4>
                                    <span className="text-sm text-gray-500">{selectedLeads.length} lead(s)</span>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <div className="text-xs text-blue-700">
                                            <strong>Note:</strong> Please fill in the price analysis for each lead. At least Minimum or Maximum Selling Price is required. Once all required fields are filled, click "Convert to Consignment" to update all leads.
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead & Vehicle</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min Price <span className="text-red-500">*</span></th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Max Price <span className="text-red-500">*</span></th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Final Price</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Chassis/VIN</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedLeads.map((leadId) => {
                                                    const lead = leads.find(l => l._id === leadId);
                                                    const leadData = leadConsignmentData[leadId] || { priceAnalysis: { minSellingPrice: '', maxSellingPrice: '', purchasedFinalPrice: '' }, chassisNumber: '' };
                                                    const priceAnalysis = leadData.priceAnalysis || { minSellingPrice: '', maxSellingPrice: '', purchasedFinalPrice: '' };

                                                    return (
                                                        <tr key={leadId} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div>
                                                                    <div className="text-sm font-semibold text-primary-600">{lead?.leadId || 'N/A'}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} {lead?.vehicleInfo?.year}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                                                                        <span className="text-gray-400 text-xs">AED</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={priceAnalysis.minSellingPrice || ''}
                                                                        onChange={(e) => handleLeadPriceAnalysisChange(leadId, 'minSellingPrice', e.target.value)}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isConvertingToConsignment}
                                                                        className={`w-full pl-8 pr-2 py-1.5 text-xs border rounded [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isConvertingToConsignment ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                        placeholder="0.00"
                                                                        min="0"
                                                                        step="0.01"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                                                                        <span className="text-gray-400 text-xs">AED</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={priceAnalysis.maxSellingPrice || ''}
                                                                        onChange={(e) => handleLeadPriceAnalysisChange(leadId, 'maxSellingPrice', e.target.value)}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isConvertingToConsignment}
                                                                        className={`w-full pl-8 pr-2 py-1.5 text-xs border rounded [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isConvertingToConsignment ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                        placeholder="0.00"
                                                                        min="0"
                                                                        step="0.01"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                                                                        <span className="text-gray-400 text-xs">AED</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={priceAnalysis.purchasedFinalPrice || ''}
                                                                        onChange={(e) => handleLeadPriceAnalysisChange(leadId, 'purchasedFinalPrice', e.target.value)}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isConvertingToConsignment}
                                                                        className={`w-full pl-8 pr-2 py-1.5 text-xs border rounded [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isConvertingToConsignment ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                        placeholder="0.00"
                                                                        min="0"
                                                                        step="0.01"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={leadData.chassisNumber || ''}
                                                                    onChange={(e) => handleLeadChassisNumberChange(leadId, e.target.value)}
                                                                    disabled={isConvertingToConsignment}
                                                                    className={`w-full px-2 py-1.5 text-xs border rounded ${isConvertingToConsignment ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                    placeholder="VIN"
                                                                    maxLength={17}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>


                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl flex-shrink-0">
                            <button
                                onClick={() => {
                                    if (!isConvertingToConsignment) {
                                        setShowConsignmentModal(false);
                                        setLeadConsignmentData({});
                                        setBulkStatus('');
                                    }
                                }}
                                disabled={isConvertingToConsignment}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${isConvertingToConsignment
                                    ? 'bg-white text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConvertToConsignment}
                                disabled={isConvertingToConsignment}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${isConvertingToConsignment
                                    ? 'bg-primary-400 text-white cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                                    }`}
                            >
                                {isConvertingToConsignment ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Converting...
                                    </span>
                                ) : (
                                    `Convert ${selectedLeads.length} Lead(s) to Consignment`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Negotiation;
