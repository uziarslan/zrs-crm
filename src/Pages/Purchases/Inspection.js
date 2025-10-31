import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';
import ConfirmDialog from '../../Components/ConfirmDialog';

const Inspection = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '' });
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [bulkStatus, setBulkStatus] = useState('');
    const [showBulkBar, setShowBulkBar] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [leadToPurchase, setLeadToPurchase] = useState(null);
    const [showDocumentWarningModal, setShowDocumentWarningModal] = useState(false);
    const [leadsWithoutDocs, setLeadsWithoutDocs] = useState([]);

    useEffect(() => {
        fetchLeads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        setShowBulkBar(selectedLeads.length > 0);
    }, [selectedLeads]);

    const fetchLeads = async () => {
        try {
            const params = new URLSearchParams();
            params.append('status', 'inspection');
            if (filters.search) params.append('search', filters.search);

            const response = await axiosInstance.get(`/purchases/leads?${params}`);
            setLeads(response.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch inspection leads');
        } finally {
            setLoading(false);
        }
    };

    const exportLeads = async () => {
        try {
            const params = new URLSearchParams();
            params.append('type', 'purchase');
            params.append('status', 'inspection');

            const response = await axiosInstance.get(`/export/leads?${params}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inspection_leads_${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Failed to export leads');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedLeads(leads.map(lead => lead._id));
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
            alert('Please select a status');
            return;
        }

        if (selectedLeads.length === 0) {
            alert('Please select at least one lead');
            return;
        }

        // Check if any selected leads don't meet the requirements for the target status
        if (bulkStatus === 'converted') {
            const selectedLeadObjects = leads.filter(lead => selectedLeads.includes(lead._id));
            const leadsNotReadyForConversion = selectedLeadObjects.filter(lead => {
                const progress = getProgressInfo(lead);
                return progress.percentage < 100;
            });

            if (leadsNotReadyForConversion.length > 0) {
                setLeadsWithoutDocs(leadsNotReadyForConversion);
                setShowDocumentWarningModal(true);
                return;
            }
        }

        try {
            await axiosInstance.put('/purchases/leads/bulk-status', {
                leadIds: selectedLeads,
                status: bulkStatus
            });

            alert(`Successfully updated ${selectedLeads.length} lead(s)`);
            setSelectedLeads([]);
            setBulkStatus('');
            fetchLeads();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to bulk update');
        }
    };

    const handlePurchase = (leadId) => {
        if (user?.role !== 'admin') {
            alert('Only admins can purchase vehicles');
            return;
        }

        setLeadToPurchase(leadId);
        setShowPurchaseModal(true);
    };

    const confirmPurchase = async () => {
        setPurchasing(true);
        try {
            await axiosInstance.post(`/purchases/leads/${leadToPurchase}/purchase`);
            alert('Lead successfully converted to vehicle and purchase order created!');
            setShowPurchaseModal(false);
            setLeadToPurchase(null);
            fetchLeads(); // Refresh the list
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to purchase vehicle');
        } finally {
            setPurchasing(false);
        }
    };

    const hasPriceAnalysis = (lead) => {
        return lead.priceAnalysis &&
            (lead.priceAnalysis.minSellingPrice || lead.priceAnalysis.maxSellingPrice);
    };

    const isDocumentSigned = (lead) => {
        const leadDocuSignCompleted = lead?.docuSign?.status === 'completed';
        const poStatus = lead?.purchaseOrder?.docuSignStatus;
        const poDocuSignCompleted = poStatus === 'completed' || poStatus === 'signed';
        return !!(leadDocuSignCompleted || poDocuSignCompleted);
    };

    const getProgressInfo = (lead) => {
        const steps = [
            { key: 'priceAnalysis', label: 'Price Analysis', completed: hasPriceAnalysis(lead) },
            { key: 'inspectionReport', label: 'Inspection Report', completed: lead?.attachments?.some(d => d.category === 'inspectionReport') },
            { key: 'dualApproval', label: 'Dual Approval', completed: lead?.approval?.status === 'approved' },
            { key: 'documentSigned', label: 'Document Signed', completed: isDocumentSigned(lead) }
        ];

        const completedSteps = steps.filter(step => step.completed).length;
        const totalSteps = steps.length;
        const percentage = Math.round((completedSteps / totalSteps) * 100);

        const currentStep = steps.find(step => !step.completed) || steps[steps.length - 1];

        return {
            percentage,
            completedSteps,
            totalSteps,
            currentStep: currentStep?.label || 'Complete',
            steps
        };
    };

    if (loading) {
        return (
            <DashboardLayout title="Inspection">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    // Stats calculations - focusing on what's pending/waiting
    const leadsWaitingPriceAnalysis = leads.filter(lead => !hasPriceAnalysis(lead)).length;

    const leadsWaitingInspectionReport = leads.filter(lead =>
        !lead?.attachments?.some(d => d.category === 'inspectionReport')
    ).length;

    const leadsWaitingApprovals = leads.filter(lead =>
        lead?.approval?.status === 'pending'
    ).length;

    const totalUnderInspection = leads.length;

    return (
        <DashboardLayout title="Inspection">
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Inspection Leads</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Price analysis and final inspection before approval
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Total</p>
                                <p className="text-2xl font-bold text-green-900">{totalUnderInspection}</p>
                                <p className="text-xs text-green-600 mt-1">Total leads</p>
                            </div>
                            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">Waiting Price Analysis</p>
                                <p className="text-2xl font-bold text-purple-900">{leadsWaitingPriceAnalysis}</p>
                                <p className="text-xs text-purple-600 mt-1">Need pricing data</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Waiting Inspection Report</p>
                                <p className="text-2xl font-bold text-blue-900">{leadsWaitingInspectionReport}</p>
                                <p className="text-xs text-blue-600 mt-1">Need inspection report</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600">Waiting Approvals</p>
                                <p className="text-2xl font-bold text-orange-900">{leadsWaitingApprovals}</p>
                                <p className="text-xs text-orange-600 mt-1">Pending approval</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <div className="mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border-l-4 border-primary-600 rounded-r-lg shadow-sm">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg shadow">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {selectedLeads.length} Lead{selectedLeads.length !== 1 ? 's' : ''} Selected
                                        </div>
                                        <div className="text-xs text-gray-500">Ready for bulk action</div>
                                    </div>
                                </div>

                                <div className="h-12 w-px bg-gray-300"></div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700">Change Status:</label>
                                    <select
                                        value={bulkStatus}
                                        onChange={(e) => setBulkStatus(e.target.value)}
                                        className="border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                                    >
                                        <option value="">Choose...</option>
                                        <option value="converted">Convert to Vehicle</option>
                                        <option value="negotiation">Move to Negotiation</option>
                                        <option value="cancelled">Cancel Lead</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkStatusUpdate}
                                    disabled={!bulkStatus}
                                    className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg shadow-md transition-all ${bulkStatus
                                        ? 'text-white bg-primary-600 hover:bg-primary-700 hover:shadow-lg'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                        }`}
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Apply
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
                        placeholder="Search inspection leads..."
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
                                            checked={selectedLeads.length === leads.length && leads.length > 0}
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
                                    Asking Price
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Progress
                                </th>
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
                                            {lead.vehicleInfo?.askingPrice ? (
                                                <div className="text-sm font-semibold text-gray-900">
                                                    AED {lead.vehicleInfo.askingPrice.toLocaleString()}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const progress = getProgressInfo(lead);
                                                return (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-600">{progress.completedSteps}/{progress.totalSteps}</span>
                                                            <span className="font-semibold text-gray-800">{progress.percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${progress.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            {progress.percentage === 100 ? (
                                                                <span className="text-green-600 font-semibold">Complete</span>
                                                            ) : (
                                                                <span>Awaiting: {progress.currentStep}</span>
                                                            )}
                                                        </div>
                                                        {progress.percentage === 100 && (
                                                            <button
                                                                onClick={() => handlePurchase(lead._id)}
                                                                disabled={purchasing}
                                                                className="w-full inline-flex justify-center items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                                                </svg>
                                                                {purchasing ? 'Purchasing...' : 'Purchase'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
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
                                                to={`/purchases/inspection/${lead._id}`}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No leads in inspection</h3>
                        <p className="text-sm text-gray-500">
                            {filters.search ? 'Try adjusting your search' : 'Leads will appear here when moved from negotiation'}
                        </p>
                    </div>
                )}
            </div>

            {/* Document Warning Modal */}
            {showDocumentWarningModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Cannot Convert Selected Leads</h3>
                                    <p className="text-sm text-gray-600">Some leads are not ready for conversion</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    The following leads cannot be converted because they don't have 100% progress:
                                </p>
                                <div className="max-h-32 overflow-y-auto">
                                    {leadsWithoutDocs.map((lead) => (
                                        <div key={lead._id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-2">
                                            <span className="text-sm font-medium text-gray-900">{lead.leadId}</span>
                                            <span className="text-xs text-gray-600">
                                                {lead.vehicleInfo?.make} {lead.vehicleInfo?.model}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowDocumentWarningModal(false);
                                        setLeadsWithoutDocs([]);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDocumentWarningModal(false);
                                        setLeadsWithoutDocs([]);
                                        // Proceed with conversion of ready leads only
                                        const readyLeads = selectedLeads.filter(leadId => {
                                            const lead = leads.find(l => l._id === leadId);
                                            const progress = getProgressInfo(lead);
                                            return progress.percentage === 100;
                                        });
                                        setSelectedLeads(readyLeads);
                                        handleBulkStatusUpdate();
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Convert Ready Leads Only
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showPurchaseModal}
                onClose={() => {
                    if (!purchasing) {
                        setShowPurchaseModal(false);
                        setLeadToPurchase(null);
                    }
                }}
                onConfirm={confirmPurchase}
                title="Purchase Vehicle"
                message={`Are you sure you want to convert this lead to a vehicle? This will create a purchase order and move the vehicle to inventory. This action cannot be undone.`}
                confirmText="Purchase Vehicle"
                cancelText="Cancel"
                isLoading={purchasing}
                danger={false}
            />
        </DashboardLayout>
    );
};

export default Inspection;
