import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

// Import SVG icons
import detailingIcon from '../../assets/icons/detailing.svg';
import photoshootIcon from '../../assets/icons/photoshoot.svg';
import photoshootEditedIcon from '../../assets/icons/photoshoot-edited.svg';
import metaAdsIcon from '../../assets/icons/meta-ads.svg';
import onlineAdsIcon from '../../assets/icons/online-ads.svg';
import instagramIcon from '../../assets/icons/instagram.svg';

const InventoryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [updating, setUpdating] = useState(false);
    const [markingReady, setMarkingReady] = useState(false);
    const [viewingPODocumentId, setViewingPODocumentId] = useState(null);
    const [downloadingPODocumentId, setDownloadingPODocumentId] = useState(null);
    const [viewingInvoice, setViewingInvoice] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [viewingDocumentId, setViewingDocumentId] = useState(null);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);

    const checklistItems = [
        { key: 'detailing', label: 'Detailing', iconSrc: detailingIcon },
        { key: 'photoshoot', label: 'Photoshoot', iconSrc: photoshootIcon },
        { key: 'photoshootEdited', label: 'Photoshoot Edited', iconSrc: photoshootEditedIcon },
        { key: 'metaAds', label: 'Meta Ads', iconSrc: metaAdsIcon },
        { key: 'onlineAds', label: 'Online Ads', iconSrc: onlineAdsIcon },
        { key: 'instagram', label: 'Instagram', iconSrc: instagramIcon }
    ];

    useEffect(() => {
        fetchVehicle();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchVehicle = async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }
            const response = await axiosInstance.get(`/purchases/inventory/${id}`);
            setVehicle(response.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch vehicle details');
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    const handleUpdateChecklist = async (itemKey, completed, notes = '') => {
        if (!vehicle) return;

        // Optimistically update the UI immediately
        const updatedChecklist = {
            ...vehicle.operationalChecklist,
            [itemKey]: {
                completed: completed,
                notes: notes || '',
                completedBy: user?.id || user?._id,
                completedAt: completed ? new Date() : null
            }
        };

        setVehicle({
            ...vehicle,
            operationalChecklist: updatedChecklist
        });

        try {
            setUpdating(true);
            await axiosInstance.put(`/purchases/vehicles/${id}/checklist`, {
                item: itemKey,
                completed,
                notes,
                completedBy: user.id,
                completedAt: completed ? new Date() : null
            });
            // Refresh from server to ensure consistency (without showing loading state)
            await fetchVehicle(false);
        } catch (err) {
            // Revert optimistic update on error (without showing loading state)
            await fetchVehicle(false);
            alert(err.response?.data?.message || 'Failed to update checklist');
        } finally {
            setUpdating(false);
        }
    };

    const handleViewDocument = async (doc) => {
        const docId = doc._id || doc.url || `${doc.fileName}_${doc.category}`;
        setViewingDocumentId(docId);
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
        const docId = doc._id || doc.url || `${doc.fileName}_${doc.category}`;
        setDownloadingDocumentId(docId);
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

    const handleViewPODocument = async (doc) => {
        const docId = doc.documentId || doc._id;
        setViewingPODocumentId(docId);
        try {
            if (!vehicle?.purchaseOrder?._id) {
                alert('Purchase order not found');
                setViewingPODocumentId(null);
                return;
            }

            // If content is available directly, use it
            if (doc.content) {
                const pdfBase64 = doc.content;
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);

                const newWindow = window.open('', '_blank');
                if (newWindow && !newWindow.closed) {
                    const safeTitle = (doc.name || 'Document').replace(/[<>&]/g, '');
                    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>html,body{height:100%;margin:0} .frame{border:0;width:100%;height:100%;}</style>
</head>
<body>
  <iframe class="frame" src="${blobUrl}" type="application/pdf"></iframe>
  <noscript>
    <p>PDF viewer requires JavaScript. <a href="${blobUrl}" target="_blank" rel="noopener">Open PDF</a></p>
  </noscript>
</body>
</html>`;
                    newWindow.document.open();
                    newWindow.document.write(html);
                    newWindow.document.close();
                } else {
                    window.open(blobUrl, '_blank');
                }
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
            } else {
                // Fallback to API endpoint
                const response = await axiosInstance.get(`/purchases/po/${vehicle.purchaseOrder._id}/documents/${doc.documentId}`, {
                    responseType: 'arraybuffer',
                    headers: { Accept: 'application/pdf' }
                });

                const blob = new Blob([response.data], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);

                const newWindow = window.open('', '_blank');
                if (newWindow && !newWindow.closed) {
                    const safeTitle = (doc.name || 'Document').replace(/[<>&]/g, '');
                    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>html,body{height:100%;margin:0} .frame{border:0;width:100%;height:100%;}</style>
</head>
<body>
  <iframe class="frame" src="${blobUrl}" type="application/pdf"></iframe>
  <noscript>
    <p>PDF viewer requires JavaScript. <a href="${blobUrl}" target="_blank" rel="noopener">Open PDF</a></p>
  </noscript>
</body>
</html>`;
                    newWindow.document.open();
                    newWindow.document.write(html);
                    newWindow.document.close();
                } else {
                    window.open(blobUrl, '_blank');
                }
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to view document');
        } finally {
            setViewingPODocumentId(null);
        }
    };

    const handleDownloadPODocument = async (doc) => {
        const docId = doc.documentId || doc._id;
        setDownloadingPODocumentId(docId);
        try {
            if (!vehicle?.purchaseOrder?._id) {
                alert('Purchase order not found');
                setDownloadingPODocumentId(null);
                return;
            }

            let blob;
            // If content is available directly, use it
            if (doc.content) {
                const pdfBase64 = doc.content;
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'application/pdf' });
            } else {
                // Fallback to API endpoint
                const response = await axiosInstance.get(`/purchases/po/${vehicle.purchaseOrder._id}/documents/${doc.documentId}`, {
                    responseType: 'arraybuffer',
                    headers: { Accept: 'application/pdf' }
                });
                blob = new Blob([response.data], { type: 'application/pdf' });
            }

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${doc.name || 'PO_Document'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to download document');
        } finally {
            setDownloadingPODocumentId(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const isChecklistComplete = () => {
        if (!vehicle.operationalChecklist) return false;
        const checklist = vehicle.operationalChecklist;
        return checklist.detailing?.completed &&
            checklist.photoshoot?.completed &&
            checklist.photoshootEdited?.completed &&
            checklist.metaAds?.completed &&
            checklist.onlineAds?.completed &&
            checklist.instagram?.completed;
    };

    const handleMarkAsReady = async () => {
        try {
            setMarkingReady(true);
            await axiosInstance.put(`/purchases/vehicles/${id}/mark-ready`);
            await fetchVehicle(); // Refresh vehicle data
            alert('Vehicle marked as ready for sale!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to mark vehicle as ready');
        } finally {
            setMarkingReady(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading vehicle details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/purchases/inventory')}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Back to Inventory
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!vehicle) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="text-gray-400 text-6xl mb-4">🚗</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Vehicle Not Found</h2>
                        <p className="text-gray-600 mb-4">The requested vehicle could not be found.</p>
                        <button
                            onClick={() => navigate('/purchases/inventory')}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Back to Inventory
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">
                                {vehicle.make} {vehicle.model} {vehicle.year}
                            </h1>
                            <p className="text-blue-100">Vehicle ID: {vehicle.vehicleId}</p>
                        </div>
                        <button
                            onClick={() => navigate('/purchases/inventory')}
                            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                        >
                            ← Back to Inventory
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'overview', label: 'Overview' },
                                { id: 'checklist', label: 'Operational Checklist' },
                                { id: 'documents', label: 'Documents' },
                                { id: 'financial', label: 'Financial' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Vehicle Information */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Make:</span>
                                                <span className="font-medium">{vehicle.make}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Model:</span>
                                                <span className="font-medium">{vehicle.model}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Year:</span>
                                                <span className="font-medium">{vehicle.year}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Mileage:</span>
                                                <span className="font-medium">{vehicle.mileage?.toLocaleString()} km</span>
                                            </div>
                                            {vehicle.color && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Color:</span>
                                                    <span className="font-medium">{vehicle.color}</span>
                                                </div>
                                            )}
                                            {vehicle.vin && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">VIN:</span>
                                                    <span className="font-medium">{vehicle.vin}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Owner Information */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900 mb-4">Owner Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Name:</span>
                                                <span className="font-medium">{vehicle.contactInfo?.name || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Phone:</span>
                                                <span className="font-medium">{vehicle.contactInfo?.phone || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Email:</span>
                                                <span className="font-medium break-all">{vehicle.contactInfo?.email || 'N/A'}</span>
                                            </div>
                                            {vehicle.contactInfo?.passportOrEmiratesId && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Passport/Emirates ID:</span>
                                                    <span className="font-medium">{vehicle.contactInfo.passportOrEmiratesId}</span>
                                                </div>
                                            )}
                                            {vehicle.contactInfo?.preferredContact && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Preferred Contact:</span>
                                                    <span className="font-medium capitalize">{vehicle.contactInfo.preferredContact}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Information */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-4">Financial Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600">Asking Price</p>
                                            <p className="text-lg font-semibold">${vehicle.askingPrice?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600">Purchase Price</p>
                                            <p className="text-lg font-semibold text-green-600">${vehicle.purchasePrice?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600">Minimum Price</p>
                                            <p className="text-lg font-semibold text-blue-600">${vehicle.minSellingPrice?.toLocaleString() || 'N/A'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600">Maximum Price</p>
                                            <p className="text-lg font-semibold text-purple-600">${vehicle.maxSellingPrice?.toLocaleString() || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${vehicle.status === 'inventory' || vehicle.status === 'in_inventory' ? 'bg-blue-100 text-blue-800' :
                                            vehicle.status === 'ready_for_sale' ? 'bg-green-100 text-green-800' :
                                                vehicle.status === 'consignment' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {vehicle.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Checklist Tab */}
                        {activeTab === 'checklist' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-4">Operational Checklist</h3>
                                    <div className="space-y-3">
                                        {checklistItems.map((item) => {
                                            const checklistItem = vehicle.operationalChecklist?.[item.key];
                                            const isCompleted = checklistItem?.completed || false;
                                            const completedAt = checklistItem?.completedAt;

                                            return (
                                                <div
                                                    key={item.key}
                                                    className={`border rounded-lg p-4 transition-colors ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 flex items-center justify-center">
                                                                <img
                                                                    src={item.iconSrc}
                                                                    alt={item.label}
                                                                    className="w-6 h-6 text-gray-600"
                                                                />
                                                            </div>
                                                            <span className="font-medium text-gray-900">{item.label}</span>
                                                        </div>
                                                        <label className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isCompleted}
                                                                onChange={(e) => handleUpdateChecklist(item.key, e.target.checked)}
                                                                disabled={updating}
                                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                            />
                                                        </label>
                                                    </div>

                                                    {completedAt && (
                                                        <p className="text-xs text-gray-500">
                                                            Completed: {new Date(completedAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Mark as Ready Button */}
                                    {isChecklistComplete() && (vehicle.status === 'inventory' || vehicle.status === 'in_inventory') && (
                                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-green-900">All tasks completed!</h4>
                                                    <p className="text-sm text-green-700">This vehicle is ready to be marked for sale.</p>
                                                </div>
                                                <button
                                                    onClick={handleMarkAsReady}
                                                    disabled={markingReady}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {markingReady ? 'Processing...' : 'Mark as Ready for Sale'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Documents Tab */}
                        {activeTab === 'documents' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    {vehicle.attachments && vehicle.attachments.length > 0 ? (
                                        <div className="space-y-4">
                                            {(() => {
                                                // Group attachments by category
                                                const groupedAttachments = vehicle.attachments.reduce((groups, attachment) => {
                                                    const category = attachment.category;
                                                    if (!groups[category]) {
                                                        groups[category] = [];
                                                    }
                                                    groups[category].push(attachment);
                                                    return groups;
                                                }, {});

                                                // Category display names
                                                const categoryNames = {
                                                    'inspectionReport': 'Inspection Report',
                                                    'registrationCard': 'Registration Card',
                                                    'carPictures': 'Car Pictures',
                                                    'onlineHistoryCheck': 'Suggested History Check'
                                                };

                                                return Object.entries(groupedAttachments).map(([category, attachments]) => (
                                                    <div key={category} className="space-y-2">
                                                        <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                                                            {categoryNames[category] || category}
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {attachments.map((attachment, index) => (
                                                                <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-500 hover:shadow-sm transition-all">
                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                                            {attachment.fileType === 'application/pdf' ? (
                                                                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                                                {attachment.fileName || 'Document'}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {attachment.category} • {attachment.fileSize ? formatFileSize(attachment.fileSize) : 'Unknown size'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-3">
                                                                        <button
                                                                            onClick={() => handleViewDocument(attachment)}
                                                                            disabled={viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) || downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`)}
                                                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            title="View"
                                                                        >
                                                                            {viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) ? (
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
                                                                            onClick={() => handleDownloadDocument(attachment)}
                                                                            disabled={viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) || downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`)}
                                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            title="Download"
                                                                        >
                                                                            {downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) ? (
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
                                                ));
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-gray-500 text-sm">No documents available</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Financial Tab */}
                        {activeTab === 'financial' && (
                            <div className="space-y-6">
                                {/* Purchase Order Section */}
                                {vehicle?.purchaseOrder && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-blue-900">Purchase Order</h3>
                                                <div className="text-xs text-blue-700">PO #{vehicle.purchaseOrder.poId}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Status</div>
                                                <div className="text-sm font-semibold text-gray-900 capitalize">{vehicle.purchaseOrder.status || 'N/A'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Total Amount</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.purchaseOrder.amount?.toLocaleString() || 'N/A'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Transfer Cost (RTA)</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.purchaseOrder.transferCost?.toLocaleString() || '0'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Detailing / Inspection Cost</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.purchaseOrder.detailing_inspection_cost?.toLocaleString() || '0'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Agent Commission</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.purchaseOrder.agent_commision.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Car Recovery Cost</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.purchaseOrder.car_recovery_cost.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Other Charges</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.purchaseOrder.other_charges.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Total Investment</div>
                                                <div className="text-lg font-bold text-blue-900">AED {vehicle.purchaseOrder.total_investment?.toLocaleString() || 'N/A'}</div>
                                            </div>
                                            {vehicle.purchaseOrder.prepared_by && (
                                                <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Prepared By</div>
                                                    <div className="text-sm font-semibold text-gray-900">{vehicle.purchaseOrder.prepared_by}</div>
                                                </div>
                                            )}
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Created Date</div>
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {vehicle.purchaseOrder.createdAt ? new Date(vehicle.purchaseOrder.createdAt).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Investor Allocations */}
                                        {vehicle.purchaseOrder.investorAllocations && vehicle.purchaseOrder.investorAllocations.length > 0 && (
                                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-3">Investor Allocations</div>
                                                <div className="space-y-2">
                                                    {vehicle.purchaseOrder.investorAllocations.map((allocation, index) => (
                                                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {allocation.investorId?.name || 'Unknown Investor'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {allocation.investorId?.email || ''}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    AED {allocation.amount?.toLocaleString() || '0'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {allocation.percentage || 0}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* DocuSign Status */}
                                        {vehicle.purchaseOrder.docuSignStatus && (
                                            <div className="bg-white rounded-lg p-4 border border-blue-200 mt-4">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">DocuSign Status</div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${vehicle.purchaseOrder.docuSignStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                        vehicle.purchaseOrder.docuSignStatus === 'signed' ? 'bg-green-100 text-green-800' :
                                                            vehicle.purchaseOrder.docuSignStatus === 'failed' || vehicle.purchaseOrder.docuSignStatus === 'voided' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {vehicle.purchaseOrder.docuSignStatus === 'completed' || vehicle.purchaseOrder.docuSignStatus === 'signed' ? '✓ Signed' :
                                                            vehicle.purchaseOrder.docuSignStatus === 'failed' ? '✗ Failed' :
                                                                vehicle.purchaseOrder.docuSignStatus === 'voided' ? '✗ Voided' :
                                                                    'Pending'}
                                                    </span>
                                                    {vehicle.purchaseOrder.docuSignSignedAt && (
                                                        <span className="text-xs text-gray-600">
                                                            Signed on {new Date(vehicle.purchaseOrder.docuSignSignedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Purchase Order Documents (DocuSign Documents) */}
                                        {vehicle.purchaseOrder.docuSignDocuments && vehicle.purchaseOrder.docuSignDocuments.length > 0 && (
                                            <div className="bg-white rounded-lg p-4 border border-blue-200 mt-4">
                                                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-3">Purchase Order Documents</div>
                                                <div className="space-y-2">
                                                    {vehicle.purchaseOrder.docuSignDocuments.map((doc, index) => (
                                                        <div key={doc.documentId || index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900">{doc.name || 'Purchase Order Document'}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'PDF Document'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleViewPODocument(doc)}
                                                                    disabled={viewingPODocumentId === (doc.documentId || doc._id) || downloadingPODocumentId === (doc.documentId || doc._id)}
                                                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {viewingPODocumentId === (doc.documentId || doc._id) ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Loading...
                                                                        </span>
                                                                    ) : (
                                                                        'View'
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadPODocument(doc)}
                                                                    disabled={viewingPODocumentId === (doc.documentId || doc._id) || downloadingPODocumentId === (doc.documentId || doc._id)}
                                                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {downloadingPODocumentId === (doc.documentId || doc._id) ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Loading...
                                                                        </span>
                                                                    ) : (
                                                                        'Download'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Invoice Section */}
                                {vehicle?.invoice && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-green-900">Invoice</h3>
                                                <div className="text-xs text-green-700">Invoice #{vehicle.invoice.invoiceNo}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Invoice Number</div>
                                                <div className="text-sm font-semibold text-gray-900">{vehicle.invoice.invoiceNo || 'N/A'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Status</div>
                                                <div className="text-sm font-semibold text-gray-900 capitalize">{vehicle.invoice.status || 'N/A'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Buying Price</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.invoice.totals?.buying_price?.toLocaleString() || '0'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Transfer Cost (RTA)</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.invoice.totals?.transfer_cost_rta?.toLocaleString() || '0'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Detailing / Inspection Cost</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.invoice.totals?.detailing_inspection_cost?.toLocaleString() || '0'}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Agent Commission</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.invoice.totals.agent_commission.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Car Recovery Cost</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.invoice.totals.car_recovery_cost.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Other Charges</div>
                                                <div className="text-sm font-semibold text-gray-900">AED {vehicle.invoice.totals.other_charges.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-green-200 md:col-span-2">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Total Amount Payable</div>
                                                <div className="text-lg font-bold text-green-900">AED {vehicle.invoice.totals?.total_amount_payable?.toLocaleString() || '0'}</div>
                                            </div>
                                            {vehicle.invoice.preparedBy && (
                                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                                    <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Prepared By</div>
                                                    <div className="text-sm font-semibold text-gray-900">{vehicle.invoice.preparedBy}</div>
                                                </div>
                                            )}
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Sent Date</div>
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {vehicle.invoice.sentAt ? new Date(vehicle.invoice.sentAt).toLocaleDateString() :
                                                        vehicle.invoice.createdAt ? new Date(vehicle.invoice.createdAt).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vehicle Information in Invoice */}
                                        {vehicle.invoice.vehicle && (
                                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-3">Vehicle Information</div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {vehicle.invoice.vehicle.make && (
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1">Make</div>
                                                            <div className="text-sm font-semibold text-gray-900">{vehicle.invoice.vehicle.make}</div>
                                                        </div>
                                                    )}
                                                    {vehicle.invoice.vehicle.model && (
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1">Model</div>
                                                            <div className="text-sm font-semibold text-gray-900">{vehicle.invoice.vehicle.model}</div>
                                                        </div>
                                                    )}
                                                    {vehicle.invoice.vehicle.year && (
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1">Year</div>
                                                            <div className="text-sm font-semibold text-gray-900">{vehicle.invoice.vehicle.year}</div>
                                                        </div>
                                                    )}
                                                    {vehicle.invoice.vehicle.vin && (
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1">VIN</div>
                                                            <div className="text-sm font-mono text-gray-900">{vehicle.invoice.vehicle.vin}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Invoice Documents */}
                                        {vehicle.invoice.content && (
                                            <div className="bg-white rounded-lg p-4 border border-green-200 mt-4">
                                                <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-3">Invoice Documents</div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">Invoice #{vehicle.invoice.invoiceNo}</div>
                                                                <div className="text-xs text-gray-500">
                                                                    {vehicle.invoice.fileSize ? `${(vehicle.invoice.fileSize / 1024).toFixed(1)} KB` : 'PDF Document'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    setViewingInvoice(true);
                                                                    try {
                                                                        const pdfBase64 = vehicle.invoice.content;
                                                                        const byteCharacters = atob(pdfBase64);
                                                                        const byteNumbers = new Array(byteCharacters.length);
                                                                        for (let i = 0; i < byteCharacters.length; i++) {
                                                                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                                        }
                                                                        const byteArray = new Uint8Array(byteNumbers);
                                                                        const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                                        const blobUrl = URL.createObjectURL(blob);
                                                                        window.open(blobUrl, '_blank');
                                                                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                                                    } catch (err) {
                                                                        alert(err.response?.data?.message || 'Failed to view invoice');
                                                                    } finally {
                                                                        setViewingInvoice(false);
                                                                    }
                                                                }}
                                                                disabled={viewingInvoice || downloadingInvoice}
                                                                className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {viewingInvoice ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Loading...
                                                                    </span>
                                                                ) : (
                                                                    'View'
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setDownloadingInvoice(true);
                                                                    try {
                                                                        const pdfBase64 = vehicle.invoice.content;
                                                                        const byteCharacters = atob(pdfBase64);
                                                                        const byteNumbers = new Array(byteCharacters.length);
                                                                        for (let i = 0; i < byteCharacters.length; i++) {
                                                                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                                        }
                                                                        const byteArray = new Uint8Array(byteNumbers);
                                                                        const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                                        const blobUrl = URL.createObjectURL(blob);
                                                                        const link = document.createElement('a');
                                                                        link.href = blobUrl;
                                                                        link.download = `Invoice_${vehicle.invoice.invoiceNo || 'invoice'}.pdf`;
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                                                    } catch (err) {
                                                                        alert(err.response?.data?.message || 'Failed to download invoice');
                                                                    } finally {
                                                                        setDownloadingInvoice(false);
                                                                    }
                                                                }}
                                                                disabled={viewingInvoice || downloadingInvoice}
                                                                className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {downloadingInvoice ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Loading...
                                                                    </span>
                                                                ) : (
                                                                    'Download'
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Investment Information (Fallback) */}
                                {!vehicle?.purchaseOrder && !vehicle?.invoice && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900 mb-4">Investment Information</h3>
                                        {vehicle.investorAllocation && vehicle.investorAllocation.length > 0 ? (
                                            <div className="space-y-4">
                                                {vehicle.investorAllocation.map((allocation, index) => (
                                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div>
                                                                <span className="font-medium text-gray-900">
                                                                    {allocation.investorId?.name || vehicle.investor?.name || 'Unknown Investor'}
                                                                </span>
                                                                {allocation.investorId?.email && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {allocation.investorId.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-gray-600 font-medium">
                                                                {allocation.percentage}%
                                                            </span>
                                                        </div>
                                                        <div className="text-lg font-semibold text-green-600">
                                                            AED {allocation.amount?.toLocaleString() || '0'}
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Total Investment */}
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold text-gray-900">Total Investment:</span>
                                                        <span className="text-xl font-bold text-blue-600">
                                                            AED {vehicle.investorAllocation.reduce((sum, alloc) => sum + (alloc.amount || 0), 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : vehicle.investor ? (
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div>
                                                        <span className="font-medium text-gray-900">
                                                            {vehicle.investor?.name || 'Unknown Investor'}
                                                        </span>
                                                        {vehicle.investor?.email && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {vehicle.investor.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {vehicle.purchasePrice && (
                                                    <div className="text-lg font-semibold text-green-600">
                                                        AED {vehicle.purchasePrice.toLocaleString()}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Investment details from Purchase Order pending
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">No financial information available</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default InventoryDetail;
