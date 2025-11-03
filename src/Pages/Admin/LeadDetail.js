import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const LeadDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewingDocumentId, setViewingDocumentId] = useState(null);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);

    useEffect(() => {
        fetchLead();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchLead = async () => {
        try {
            const response = await axiosInstance.get(`/purchases/leads/${id}`);
            setLead(response.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch lead');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = async (doc) => {
        setViewingDocumentId(doc._id);
        try {
            if (doc.fileType !== 'application/pdf') {
                window.open(doc.url, '_blank');
                setViewingDocumentId(null);
                return;
            }

            const response = await axiosInstance.get(doc.viewUrl || doc.url, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to view document');
        } finally {
            setViewingDocumentId(null);
        }
    };

    const handleDownloadDocument = async (doc) => {
        setDownloadingDocumentId(doc._id);
        try {
            const response = await axiosInstance.get(doc.viewUrl || doc.url, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: doc.fileType || 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = doc.fileName || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to download document');
        } finally {
            setDownloadingDocumentId(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const getDocumentsByCategory = (category) => {
        if (!lead?.attachments) return [];
        return lead.attachments.filter(doc => doc.category === category);
    };

    const getStatusColor = (status) => {
        const colors = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-indigo-100 text-indigo-800',
            qualified: 'bg-cyan-100 text-cyan-800',
            negotiation: 'bg-yellow-100 text-yellow-800',
            inspection: 'bg-purple-100 text-purple-800',
            under_review: 'bg-orange-100 text-orange-800',
            approved: 'bg-green-100 text-green-800',
            converted: 'bg-emerald-100 text-emerald-800',
            lost: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
            inventory: 'bg-teal-100 text-teal-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: 'text-gray-600',
            medium: 'text-blue-600',
            high: 'text-orange-600',
            urgent: 'text-red-600'
        };
        return colors[priority] || 'text-gray-600';
    };

    if (loading) {
        return (
            <DashboardLayout title="Lead Details">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Lead Details">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </DashboardLayout>
        );
    }

    const carPictures = getDocumentsByCategory('carPictures');

    return (
        <DashboardLayout title={`Lead ${lead?.leadId}`}>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Status Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">{lead?.leadId}</h1>
                            <p className="text-blue-100 text-sm">
                                {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} {lead?.vehicleInfo?.year}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm text-blue-100 mb-1">Status</div>
                                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                                    <span className="text-sm font-semibold capitalize">
                                        {lead?.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* Contact Information */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name</div>
                                <div className="text-sm font-semibold text-gray-900">{lead?.contactInfo?.name || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</div>
                                <div className="text-sm font-semibold text-gray-900">{lead?.contactInfo?.phone || 'Not provided'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</div>
                                <div className="text-sm font-semibold text-gray-900 break-all">{lead?.contactInfo?.email || 'Not provided'}</div>
                            </div>
                            {lead?.contactInfo?.passportOrEmiratesId && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Passport No. / Emirates ID</div>
                                    <div className="text-sm font-semibold text-gray-900 break-all">{lead.contactInfo.passportOrEmiratesId}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Make</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.make || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Model</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.model || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Year</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.year || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Mileage</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Trim</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.trim || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Color</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.color || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Region</div>
                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.region || 'N/A'}</div>
                            </div>
                            {lead?.vehicleInfo?.vin && (
                                <div className="md:col-span-2">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">VIN</div>
                                    <div className="text-sm font-mono text-gray-900">{lead.vehicleInfo.vin}</div>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Asking Price</div>
                                <div className="text-xl font-bold text-green-700">{lead?.vehicleInfo?.askingPrice ? `AED ${lead.vehicleInfo.askingPrice.toLocaleString()}` : 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Car Pictures */}
                    {carPictures.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-gray-900">Car Pictures</h3>
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                {carPictures.map((doc) => (
                                    <div key={doc._id} className="group relative aspect-square">
                                        <img
                                            src={doc.url}
                                            alt={doc.fileName}
                                            className="w-full h-full object-cover rounded-lg border-2 border-gray-200 hover:border-primary-500 cursor-pointer transition-all"
                                            onClick={() => handleViewDocument(doc)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    {(() => {
                        // Get all documents excluding carPictures (which are shown separately)
                        const allDocuments = lead?.attachments?.filter(doc => doc.category !== 'carPictures') || [];

                        // Group documents by category for better organization
                        const groupedDocuments = allDocuments.reduce((groups, doc) => {
                            const category = doc.category || 'other';
                            if (!groups[category]) {
                                groups[category] = [];
                            }
                            groups[category].push(doc);
                            return groups;
                        }, {});

                        // Category display names
                        const categoryNames = {
                            'registrationCard': 'Registration Card',
                            'onlineHistoryCheck': 'Online History Check',
                            'inspectionReport': 'Inspection Report',
                            'other': 'Other Documents'
                        };

                        if (allDocuments.length === 0) {
                            return null;
                        }

                        return (
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                                    <span className="text-sm text-gray-500">({allDocuments.length})</span>
                                </div>

                                <div className="space-y-6">
                                    {Object.keys(groupedDocuments).map((category) => (
                                        <div key={category}>
                                            {Object.keys(groupedDocuments).length > 1 && (
                                                <div className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                                    {categoryNames[category] || category}
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {groupedDocuments[category].map((doc) => (
                                                    <div
                                                        key={doc._id}
                                                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</div>
                                                                <div className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={() => handleViewDocument(doc)}
                                                                disabled={viewingDocumentId === doc._id || downloadingDocumentId === doc._id}
                                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="View"
                                                            >
                                                                {viewingDocumentId === doc._id ? (
                                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadDocument(doc)}
                                                                disabled={viewingDocumentId === doc._id || downloadingDocumentId === doc._id}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Download"
                                                            >
                                                                {downloadingDocumentId === doc._id ? (
                                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Lead Metadata */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Lead Metadata</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Lead ID</div>
                                <div className="text-sm font-medium text-gray-900">{lead?.leadId}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Type</div>
                                <div className="text-sm font-medium text-gray-900 capitalize">{lead?.type}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead?.status)}`}>
                                    {lead?.status}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Source</div>
                                <div className="text-sm font-medium text-gray-900 capitalize">{lead?.source || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Priority</div>
                                <div className={`text-sm font-bold capitalize ${getPriorityColor(lead?.priority)}`}>
                                    {lead?.priority || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                                <div className="text-sm font-medium text-gray-900">{lead?.createdBy?.name || 'N/A'}</div>
                            </div>
                            {lead?.assignedTo && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Assigned To</div>
                                    <div className="text-sm font-medium text-gray-900">{lead.assignedTo.name || 'N/A'}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Created</div>
                                <div className="text-sm font-medium text-gray-900">
                                    {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Price Analysis (if available) */}
                    {lead?.priceAnalysis && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Price Analysis</h3>
                            <div className="space-y-3">
                                {lead.priceAnalysis.minSellingPrice && (
                                    <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">Min Selling Price</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            AED {lead.priceAnalysis.minSellingPrice.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {lead.priceAnalysis.maxSellingPrice && (
                                    <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">Max Selling Price</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            AED {lead.priceAnalysis.maxSellingPrice.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {lead.priceAnalysis.purchasedFinalPrice && (
                                    <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">Purchased Final Price</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            AED {lead.priceAnalysis.purchasedFinalPrice.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default LeadDetail;
