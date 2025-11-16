import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const SalesLeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);
  const [photoViewer, setPhotoViewer] = useState({
    isOpen: false,
    index: 0,
    zoom: 1
  });
  const [isFinancialOpen, setIsFinancialOpen] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/purchases/leads/${id}`);
      setLead(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Lock background scroll when photo viewer is open
  useEffect(() => {
    if (photoViewer.isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [photoViewer.isOpen]);

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
      // eslint-disable-next-line no-alert
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
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.message || 'Failed to download document');
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const calculateTotalCost = () => {
    const purchase = lead?.priceAnalysis?.purchasedFinalPrice || 0;
    const jc = lead?.jobCosting || {};
    const jobTotal =
      (jc.transferCost || 0) +
      (jc.detailing_inspection_cost || 0) +
      (jc.agent_commision || 0) +
      (jc.car_recovery_cost || 0) +
      (jc.other_charges || 0);
    return purchase + jobTotal;
  };

  const handlePhotoWheelZoom = (event) => {
    if (!photoViewer.isOpen) return;
    event.preventDefault();
    const delta = event.deltaY;
    if (!delta) return;
    setPhotoViewer((prev) => {
      const direction = delta > 0 ? -1 : 1;
      const step = 0.1 * direction;
      const nextZoom = Math.min(5, Math.max(0.5, prev.zoom + step));
      if (nextZoom === prev.zoom) return prev;
      return {
        ...prev,
        zoom: nextZoom
      };
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Sales Lead Detail">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Sales Lead Detail">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/sales/leads')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Sales Leads
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout title="Sales Lead Detail">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
            <p className="text-gray-600 mb-4">The requested sales lead could not be found.</p>
            <button
              onClick={() => navigate('/sales/leads')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Sales Leads
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalCost = calculateTotalCost();
  const carPhotos = (lead?.attachments || []).filter(
    (a) => a.category === 'carPictures'
  );

  return (
    <DashboardLayout title={`Sales Lead ${lead.leadId || ''}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {lead.vehicleInfo?.make} {lead.vehicleInfo?.model} {lead.vehicleInfo?.year}
              </h1>
              <p className="text-blue-100">
                Lead ID: {lead.leadId} • Type: {lead.type?.toUpperCase()} • Status:{' '}
                {lead.status?.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <button
              onClick={() => navigate('/sales/leads')}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              ← Back to Sales Leads
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'documents', label: 'Documents' },
                    { id: 'financial', label: 'Financial' },
                    { id: 'activity', label: 'Notes' }
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
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Contact & Vehicle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{lead.contactInfo?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{lead.contactInfo?.phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium break-all">{lead.contactInfo?.email || 'N/A'}</span>
                          </div>
                          {lead.contactInfo?.passportOrEmiratesId && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Passport/Emirates ID:</span>
                              <span className="font-medium">{lead.contactInfo.passportOrEmiratesId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Make:</span>
                            <span className="font-medium">{lead.vehicleInfo?.make || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Model:</span>
                            <span className="font-medium">{lead.vehicleInfo?.model || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Year:</span>
                            <span className="font-medium">{lead.vehicleInfo?.year || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Mileage:</span>
                            <span className="font-medium">
                              {lead.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}
                            </span>
                          </div>
                          {lead.vehicleInfo?.color && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Color:</span>
                              <span className="font-medium">{lead.vehicleInfo.color}</span>
                            </div>
                          )}
                          {lead.vehicleInfo?.vin && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">VIN:</span>
                              <span className="font-medium">{lead.vehicleInfo.vin}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Car Pictures */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Car Pictures</h3>
                      {(() => {
                        const photos = (lead.attachments || []).filter(
                          (a) => a.category === 'carPictures'
                        );
                        if (photos.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <svg
                                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="text-gray-500 text-sm">No car pictures uploaded yet</p>
                            </div>
                          );
                        }

                        return (
                          <div className="flex gap-4 overflow-x-auto pb-2">
                            {photos.map((photo, index) => (
                              <button
                                key={photo._id || photo.url || index}
                                type="button"
                                onClick={() =>
                                  setPhotoViewer({
                                    isOpen: true,
                                    index,
                                    zoom: 1
                                  })
                                }
                                className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 w-56"
                              >
                                <div className="aspect-video bg-gray-100">
                                  <img
                                    src={photo.url}
                                    alt={photo.fileName || `Car picture ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors" />
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Financial Overview (accordion) */}
                    <div className="bg-gray-50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setIsFinancialOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between px-4 py-3"
                      >
                        <h3 className="font-semibold text-gray-900">Financial Overview</h3>
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${isFinancialOpen ? 'rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      <div
                        className={`px-4 overflow-hidden transition-all duration-300 ease-in-out ${isFinancialOpen ? 'max-h-[1000px] pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'
                          }`}
                      >
                        <div className="border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Asking Price</p>
                              <p className="text-lg font-semibold">
                                AED {lead.vehicleInfo?.askingPrice?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Purchase Price</p>
                              <p className="text-lg font-semibold text-green-600">
                                AED {lead.priceAnalysis?.purchasedFinalPrice?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Min Selling Price</p>
                              <p className="text-lg font-semibold text-blue-600">
                                AED {lead.priceAnalysis?.minSellingPrice?.toLocaleString() || 'N/A'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Max Selling Price</p>
                              <p className="text-lg font-semibold text-purple-600">
                                AED {lead.priceAnalysis?.maxSellingPrice?.toLocaleString() || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {lead.jobCosting && (
                            <div className="mt-6 border-t border-gray-200 pt-4">
                              <h4 className="font-semibold text-gray-900 mb-3">Job Costings</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transfer Cost (RTA)</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.transferCost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Detailing / Inspection Cost</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.detailing_inspection_cost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Agent Commission</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.agent_commision || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Car Recovery Cost</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.car_recovery_cost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Other Charges</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.other_charges || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost (Purchase + Job)</p>
                                  <p className="text-sm font-bold text-gray-900">
                                    AED {totalCost.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Lead Metadata</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Source</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{lead.source}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Priority</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{lead.priority}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Assigned To</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.createdBy?.name || 'N/A'}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Created</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      {lead.attachments && lead.attachments.length > 0 ? (
                        <div className="space-y-4">
                          {(() => {
                            const grouped = lead.attachments.reduce((groups, attachment) => {
                              const category = attachment.category;
                              if (!groups[category]) {
                                groups[category] = [];
                              }
                              groups[category].push(attachment);
                              return groups;
                            }, {});

                            const categoryNames = {
                              inspectionReport: 'Inspection Report',
                              registrationCard: 'Registration Card',
                              carPictures: 'Car Pictures',
                              onlineHistoryCheck: 'Suggested History Check'
                            };

                            return Object.entries(grouped).map(([category, attachments]) => (
                              <div key={category} className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                                  {categoryNames[category] || category}
                                </h4>
                                <div className="space-y-2">
                                  {attachments.map((attachment, index) => {
                                    const keyId =
                                      attachment._id ||
                                      attachment.url ||
                                      `${attachment.fileName}_${attachment.category}_${index}`;
                                    const isViewing = viewingDocumentId === keyId;
                                    const isDownloading = downloadingDocumentId === keyId;
                                    return (
                                      <div
                                        key={keyId}
                                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-500 hover:shadow-sm transition-all"
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            {attachment.fileType === 'application/pdf' ? (
                                              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                              </svg>
                                            ) : (
                                              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                              {attachment.fileName || 'Document'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {attachment.category} •{' '}
                                              {attachment.fileSize ? formatFileSize(attachment.fileSize) : 'Unknown size'}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-3">
                                          <button
                                            onClick={() => handleViewDocument(attachment)}
                                            disabled={isViewing || isDownloading}
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="View"
                                          >
                                            {isViewing ? (
                                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path
                                                  className="opacity-75"
                                                  fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                              </svg>
                                            ) : (
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                              </svg>
                                            )}
                                          </button>
                                          <button
                                            onClick={() => handleDownloadDocument(attachment)}
                                            disabled={isViewing || isDownloading}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Download"
                                          >
                                            {isDownloading ? (
                                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path
                                                  className="opacity-75"
                                                  fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                              </svg>
                                            ) : (
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                                />
                                              </svg>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg
                            className="w-16 h-16 mx-auto text-gray-300 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-gray-500 text-sm">No documents available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-6">
                    {/* Investor Allocations */}
                    {lead.investorAllocations && lead.investorAllocations.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Investor Allocations</h3>
                        <div className="space-y-3">
                          {lead.investorAllocations.map((allocation, index) => (
                            <div
                              key={allocation._id || index}
                              className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {allocation.investorId?.name || 'Investor'}
                                </div>
                                {allocation.investorId?.email && (
                                  <div className="text-xs text-gray-500">{allocation.investorId.email}</div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500 mr-1">Ownership:</span>
                                  <span className="font-semibold">
                                    {allocation.ownershipPercentage ?? allocation.percentage ?? 0}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 mr-1">Amount:</span>
                                  <span className="font-semibold">
                                    AED {(allocation.amount || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 mr-1">Profit %:</span>
                                  <span className="font-semibold">
                                    {allocation.profitPercentage != null ? allocation.profitPercentage : 'N/A'}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invoices Summary */}
                    {lead.invoices && lead.invoices.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Invoices</h3>
                        <div className="space-y-3">
                          {lead.invoices.map((invoice) => (
                            <div
                              key={invoice._id || invoice.invoiceNo}
                              className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  Invoice #{invoice.invoiceNo}
                                </div>
                                {invoice.investorId?.name && (
                                  <div className="text-xs text-gray-500">
                                    Investor: {invoice.investorId.name} ({invoice.investorId.email})
                                  </div>
                                )}
                                {invoice.sentAt && (
                                  <div className="text-xs text-gray-500">
                                    Sent: {new Date(invoice.sentAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-900">
                                <div>
                                  <span className="text-gray-500 mr-1">Total Payable:</span>
                                  <span className="font-semibold">
                                    AED {invoice.totals?.total_amount_payable?.toLocaleString() || '0'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div>
                    {lead?.notes && lead.notes.length > 0 ? (
                      <div className="space-y-4">
                        {lead.notes.map((note, index) => (
                          <div key={note._id || index} className="relative">
                            {index !== lead.notes.length - 1 && (
                              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                            )}
                            <div className="flex gap-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 8h.01M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {note.addedBy?.name || 'Unknown'}
                                    </span>
                                    {note.addedAt && (
                                      <span className="text-xs text-gray-500">
                                        {new Date(note.addedAt).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                {note.editedAt && (
                                  <div className="mt-2 text-xs text-gray-500 italic">
                                    Edited {new Date(note.editedAt).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <svg
                          className="w-16 h-16 mx-auto text-gray-300 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <p className="text-gray-500 text-sm">No notes yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Global car picture viewer overlay */}
                {photoViewer.isOpen && carPhotos.length > 0 && carPhotos[photoViewer.index] && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
                    <div
                      className="absolute inset-0"
                      onClick={() => setPhotoViewer({ isOpen: false, index: 0, zoom: 1 })}
                    />
                    <div className="relative z-10 w-full h-full flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-70">
                        <div className="text-sm text-white">
                          {photoViewer.index + 1} / {carPhotos.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoViewer((prev) => ({
                                ...prev,
                                zoom: Math.max(0.5, prev.zoom - 0.25)
                              }))
                            }
                            className="px-2 py-1 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                          >
                            -
                          </button>
                          <span className="text-xs text-white w-10 text-center">
                            {Math.round(photoViewer.zoom * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoViewer((prev) => ({
                                ...prev,
                                zoom: Math.min(5, prev.zoom + 0.25)
                              }))
                            }
                            className="px-2 py-1 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoViewer({ isOpen: false, index: 0, zoom: 1 })}
                            className="ml-4 px-3 py-1 text-xs rounded bg-white text-gray-900 hover:bg-gray-100"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div
                        className="flex-1 flex items-center justify-center overflow-hidden"
                        onWheel={handlePhotoWheelZoom}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index: prev.index === 0 ? carPhotos.length - 1 : prev.index - 1
                            }));
                          }}
                          className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-black bg-opacity-40 text-white hover:bg-opacity-60 absolute left-4"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>

                        <div className="max-w-5xl max-h-full px-4">
                          <img
                            src={carPhotos[photoViewer.index].url}
                            alt={
                              carPhotos[photoViewer.index].fileName ||
                              `Car picture ${photoViewer.index + 1}`
                            }
                            className="max-h-[80vh] mx-auto"
                            style={{ transform: `scale(${photoViewer.zoom})` }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index:
                                prev.index === carPhotos.length - 1 ? 0 : prev.index + 1
                            }));
                          }}
                          className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-black bg-opacity-40 text-white hover:bg-opacity-60 absolute right-4"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Mobile next/prev under image */}
                      <div className="flex sm:hidden items-center justify-between px-4 py-3 bg-black bg-opacity-70">
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index: prev.index === 0 ? carPhotos.length - 1 : prev.index - 1
                            }))
                          }
                          className="px-3 py-2 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index:
                                prev.index === carPhotos.length - 1 ? 0 : prev.index + 1
                            }))
                          }
                          className="px-3 py-2 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500 mr-1">Status:</span>
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {lead.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 mr-1">Priority:</span>
                  <span className="font-semibold capitalize">{lead.priority}</span>
                </div>
                <div>
                  <span className="text-gray-500 mr-1">Type:</span>
                  <span className="font-semibold uppercase">{lead.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout >
  );
};

export default SalesLeadDetail;
