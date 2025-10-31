import React, { useState, useEffect } from 'react';
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
            alert('Failed to export leads');
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
            alert('Please select a status');
            return;
        }

        if (selectedLeads.length === 0) {
            alert('Please select at least one lead');
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

            alert(`Successfully updated ${selectedLeads.length} lead(s)`);
            setSelectedLeads([]);
            setBulkStatus('');
            fetchLeads();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to bulk update');
        }
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
            alert(err.response?.data?.message || 'Failed to move to inspection');
        } finally {
            setIsMovingToInspection(false);
        }
    };

    const getDocumentProgress = (lead) => {
        let completed = 0;
        if (lead.attachments?.some(doc => doc.category === 'registrationCard')) completed++;
        if (lead.attachments?.some(doc => doc.category === 'carPictures')) completed++;
        if (lead.attachments?.some(doc => doc.category === 'onlineHistoryCheck')) completed++;
        return Math.round((completed / 3) * 100);
    };

    if (loading) {
        return (
            <DashboardLayout title="Negotiation">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const leadsReady = leads.filter(lead => hasAllRequiredDocuments(lead)).length;
    const leadsPending = leads.length - leadsReady;

    return (
        <DashboardLayout title="Negotiation">
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
        </DashboardLayout>
    );
};

export default Negotiation;
