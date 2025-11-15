import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';

const AdminInvestors = () => {
  const { user } = useAuth();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loadingInviteModal, setLoadingInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    investorEid: '',
    creditLimit: '',
    decidedPercentageMin: '0',
    decidedPercentageMax: '0',
    adminDesignation: ''
  });
  const [editData, setEditData] = useState({
    id: '',
    name: '',
    email: '',
    creditLimit: '',
    decidedPercentageMin: '0',
    decidedPercentageMax: '0'
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sanitizeDecimalInput = (value) => {
    const sanitized = value.replace(/[^\d.]/g, '');
    if (sanitized === '') return '';
    const firstDotIndex = sanitized.indexOf('.');
    if (firstDotIndex === -1) return sanitized;
    const beforeDot = sanitized.slice(0, firstDotIndex);
    const afterDotRaw = sanitized.slice(firstDotIndex + 1).replace(/\./g, '');
    if (value.endsWith('.') && afterDotRaw === '') {
      return `${beforeDot}.`;
    }
    return `${beforeDot}.${afterDotRaw}`;
  };

  const limitPercentageInput = (value) => {
    const sanitized = sanitizeDecimalInput(value);
    if (sanitized === '') return '';
    const numeric = parseFloat(sanitized);
    if (Number.isNaN(numeric)) return sanitized;
    if (numeric < 0) return '0';
    if (numeric > 100) return '100';
    return sanitized;
  };

  const clampPercentageNumber = (value) => {
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) return null;
    return Math.min(Math.max(numeric, 0), 100);
  };

  const formatPercentage = (value) =>
    `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;

  const formatPercentageRange = (min, max) => {
    const hasMin = typeof min === 'number' && !Number.isNaN(min);
    const hasMax = typeof max === 'number' && !Number.isNaN(max);
    if (!hasMin && !hasMax) {
      return '—';
    }
    const normalizedMin = hasMin ? min : max;
    const normalizedMax = hasMax ? max : normalizedMin;
    if (normalizedMin === undefined || normalizedMax === undefined) {
      return '—';
    }
    if (Math.abs(normalizedMin - normalizedMax) < 0.001) {
      return formatPercentage(normalizedMin);
    }
    return `${formatPercentage(normalizedMin)} - ${formatPercentage(normalizedMax)}`;
  };

  const formatLastLogin = (date) => {
    if (!date) return '—';
    const loginDate = new Date(date);
    const now = new Date();
    const diffMs = now - loginDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // For older dates, show formatted date
    return loginDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchAdminInfo = useCallback(async () => {
    if (!user) return null;
    try {
      const baseURL = process.env.REACT_APP_END_POINT || 'http://localhost:4000/api/v1';
      const authURL = baseURL.replace('/v1', '/auth/user');
      const token = localStorage.getItem('token');
      const response = await axios.get(authURL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const fetchedUser = response.data.user || user;
      setAdminInfo(fetchedUser);
      return fetchedUser;
    } catch (err) {
      console.error('Failed to fetch admin info:', err);
      // Fallback to user from context if API call fails
      setAdminInfo(user);
      return user;
    }
  }, [user]);

  const handleViewDocument = async (investorId) => {
    setDocumentLoading(true);
    try {
      const response = await axiosInstance.get(`/investors/${investorId}/agreement/document`);
      const document = response.data.data;

      // Convert base64 to blob
      const byteCharacters = atob(document.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      // Open in new window
      const newWindow = window.open(blobUrl, '_blank');

      // Clean up blob URL after a delay to ensure it's loaded
      if (newWindow) {
        newWindow.addEventListener('load', () => {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 100);
        });
      } else {
        // If popup was blocked, clean up immediately
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load document');
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleResendActivationEmail = async (investorId) => {
    setResendingEmail(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axiosInstance.post(`/investors/${investorId}/resend-activation`);
      setOpenDropdownId(null);
      setSuccessMessage(response.data?.message || 'Activation email sent successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend activation email');
    } finally {
      setResendingEmail(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
    if (user) {
      fetchAdminInfo();
    }
  }, [user, fetchAdminInfo]);


  const fetchInvestors = async () => {
    try {
      const response = await axiosInstance.get('/investors');
      setInvestors(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch investors');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccessMessage('');

    const creditLimitValue = parseFloat(inviteData.creditLimit);
    if (Number.isNaN(creditLimitValue) || creditLimitValue < 0) {
      setInviting(false);
      setError('Credit limit must be a non-negative number.');
      return;
    }

    const decidedPercentageMinValue = parseFloat(inviteData.decidedPercentageMin);
    const decidedPercentageMaxValue = parseFloat(inviteData.decidedPercentageMax);
    if (
      Number.isNaN(decidedPercentageMinValue) ||
      decidedPercentageMinValue < 0 ||
      decidedPercentageMinValue > 100
    ) {
      setInviting(false);
      setError('Minimum decided percentage must be between 0 and 100.');
      return;
    }

    if (
      Number.isNaN(decidedPercentageMaxValue) ||
      decidedPercentageMaxValue < 0 ||
      decidedPercentageMaxValue > 100
    ) {
      setInviting(false);
      setError('Maximum decided percentage must be between 0 and 100.');
      return;
    }

    if (decidedPercentageMinValue > decidedPercentageMaxValue) {
      setInviting(false);
      setError('Minimum decided percentage cannot be greater than maximum decided percentage.');
      return;
    }

    try {
      const response = await axiosInstance.post('/investors', {
        email: inviteData.email,
        name: inviteData.name,
        investorEid: inviteData.investorEid,
        creditLimit: creditLimitValue,
        decidedPercentageMin: decidedPercentageMinValue,
        decidedPercentageMax: decidedPercentageMaxValue,
        adminDesignation: !adminInfo?.designation ? inviteData.adminDesignation : undefined
      });

      setShowInviteModal(false);
      await fetchInvestors();
      await fetchAdminInfo(); // Refresh admin info to get updated designation
      // Reset inviteData - adminDesignation will be set by fetchAdminInfo if it exists
      setInviteData({
        email: '',
        name: '',
        investorEid: '',
        creditLimit: '',
        decidedPercentageMin: '0',
        decidedPercentageMax: '0',
        adminDesignation: adminInfo?.designation || ''
      });
      setSuccessMessage(response.data?.message || 'Investor added successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add investor');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateInvestor = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccessMessage('');

    const creditLimitValue = parseFloat(editData.creditLimit);
    if (Number.isNaN(creditLimitValue) || creditLimitValue < 0) {
      setUpdating(false);
      setError('Credit limit must be a non-negative number.');
      return;
    }

    const decidedPercentageMinValue = parseFloat(editData.decidedPercentageMin);
    const decidedPercentageMaxValue = parseFloat(editData.decidedPercentageMax);

    if (
      Number.isNaN(decidedPercentageMinValue) ||
      decidedPercentageMinValue < 0 ||
      decidedPercentageMinValue > 100
    ) {
      setUpdating(false);
      setError('Minimum decided percentage must be between 0 and 100.');
      return;
    }

    if (
      Number.isNaN(decidedPercentageMaxValue) ||
      decidedPercentageMaxValue < 0 ||
      decidedPercentageMaxValue > 100
    ) {
      setUpdating(false);
      setError('Maximum decided percentage must be between 0 and 100.');
      return;
    }

    if (decidedPercentageMinValue > decidedPercentageMaxValue) {
      setUpdating(false);
      setError('Minimum decided percentage cannot be greater than maximum decided percentage.');
      return;
    }

    try {
      const response = await axiosInstance.put(`/investors/${editData.id}`, {
        name: editData.name,
        email: editData.email,
        creditLimit: creditLimitValue,
        decidedPercentageMin: decidedPercentageMinValue,
        decidedPercentageMax: decidedPercentageMaxValue
      });
      setShowEditModal(false);
      setEditData({
        id: '',
        name: '',
        email: '',
        creditLimit: '',
        decidedPercentageMin: '0',
        decidedPercentageMax: '0'
      });
      await fetchInvestors();
      setSuccessMessage(response.data?.message || 'Investor updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update investor');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteInvestor = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axiosInstance.delete(`/investors/${deleteTarget._id}`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await fetchInvestors();
      setSuccessMessage(response.data?.message || 'Investor deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete investor');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Investors">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Investors">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Total Investors: <span className="font-bold">{investors.length}</span>
        </div>
        <button
          onClick={async () => {
            setLoadingInviteModal(true);
            try {
              // Fetch fresh admin info before opening modal
              let currentAdminInfo = adminInfo;
              if (user) {
                const fetchedAdmin = await fetchAdminInfo();
                currentAdminInfo = fetchedAdmin || adminInfo;
              }
              setInviteData({
                email: '',
                name: '',
                investorEid: '',
                creditLimit: '',
                decidedPercentageMin: '0',
                decidedPercentageMax: '0',
                adminDesignation: currentAdminInfo?.designation || ''
              });
              setError('');
              setSuccessMessage('');
              setShowInviteModal(true);
            } catch (err) {
              setError('Failed to load invite form');
            } finally {
              setLoadingInviteModal(false);
            }
          }}
          disabled={loadingInviteModal}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Invite Investor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Decided %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilized</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agreement Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {investors.map((investor) => {
                const legacyPercentage =
                  typeof investor.decidedPercentage === 'number' ? investor.decidedPercentage : null;
                const minPercentage =
                  typeof investor.decidedPercentageMin === 'number'
                    ? investor.decidedPercentageMin
                    : legacyPercentage;
                const maxPercentage =
                  typeof investor.decidedPercentageMax === 'number'
                    ? investor.decidedPercentageMax
                    : legacyPercentage;

                return (
                  <tr key={investor._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{investor.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{investor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (investor.status === 'invited') {
                              setOpenDropdownId(openDropdownId === `status-${investor._id}` ? null : `status-${investor._id}`);
                            }
                          }}
                          className={`px-2 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full transition-all hover:shadow-sm ${investor.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            investor.status === 'invited' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer' :
                              'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                        >
                          <span>{investor.status}</span>
                          {investor.status === 'invited' && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>

                        {openDropdownId === `status-${investor._id}` && investor.status === 'invited' && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdownId(null)}
                            ></div>
                            <div className="absolute left-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                              <div className="py-0.5">
                                <button
                                  onClick={() => {
                                    handleResendActivationEmail(investor._id);
                                  }}
                                  disabled={resendingEmail}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {resendingEmail ? (
                                    <>
                                      <span className="animate-spin text-gray-700 flex-shrink-0">⟳</span>
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3.5 h-3.5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      <span>Resend Email</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      AED {(Number(investor.creditLimit) || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatPercentageRange(minPercentage, maxPercentage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      AED {(Number(investor.utilizedAmount) || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {investor.agreement ? (
                        <div className="relative">
                          <button
                            onClick={() => {
                              if (investor.agreement.hasDocuments) {
                                setOpenDropdownId(openDropdownId === `agreement-${investor._id}` ? null : `agreement-${investor._id}`);
                              }
                            }}
                            disabled={!investor.agreement.hasDocuments}
                            className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-md uppercase tracking-wide transition-all hover:shadow-sm ${investor.agreement.docuSignStatus === 'completed' ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' :
                              investor.agreement.docuSignStatus === 'sent' || investor.agreement.docuSignStatus === 'delivered' ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' :
                                investor.agreement.docuSignStatus === 'signed' ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100' :
                                  investor.agreement.docuSignStatus === 'declined' || investor.agreement.docuSignStatus === 'voided' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' :
                                    'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                              } ${!investor.agreement.hasDocuments ? 'cursor-default opacity-50' : 'cursor-pointer'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {investor.agreement.docuSignStatus === 'completed' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Signed</span>
                              </>
                            ) : investor.agreement.docuSignStatus === 'sent' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span>Sent</span>
                              </>
                            ) : investor.agreement.docuSignStatus === 'delivered' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Delivered</span>
                              </>
                            ) : investor.agreement.docuSignStatus === 'signed' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span>Signed</span>
                              </>
                            ) : investor.agreement.docuSignStatus === 'declined' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Declined</span>
                              </>
                            ) : investor.agreement.docuSignStatus === 'voided' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <span>Voided</span>
                              </>
                            ) : (
                              <span>{investor.agreement.docuSignStatus || 'N/A'}</span>
                            )}
                            {investor.agreement.hasDocuments && (
                              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>

                          {openDropdownId === `agreement-${investor._id}` && investor.agreement.hasDocuments && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownId(null)}
                              ></div>
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                                <div className="py-0.5">
                                  <button
                                    onClick={() => {
                                      handleViewDocument(investor._id);
                                      setOpenDropdownId(null);
                                    }}
                                    disabled={documentLoading}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {documentLoading ? (
                                      <>
                                        <span className="animate-spin flex-shrink-0">⟳</span>
                                        <span>Loading...</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>View Agreement</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastLogin(investor.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center gap-2">
                      <button
                        onClick={() => {
                          const min =
                            clampPercentageNumber(
                              investor.decidedPercentageMin ?? investor.decidedPercentage ?? 0
                            ) ?? 0;
                          const max =
                            clampPercentageNumber(
                              investor.decidedPercentageMax ??
                              investor.decidedPercentage ??
                              investor.decidedPercentageMin ??
                              min
                            ) ?? min;
                          setEditData({
                            id: investor._id,
                            name: investor.name || '',
                            email: investor.email || '',
                            creditLimit: investor.creditLimit !== undefined && investor.creditLimit !== null ? investor.creditLimit.toString() : '',
                            decidedPercentageMin: min.toString(),
                            decidedPercentageMax: max.toString()
                          });
                          setError('');
                          setSuccessMessage('');
                          setShowEditModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(investor);
                          setError('');
                          setSuccessMessage('');
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {investors.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No investors found. Invite your first investor!
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Invite Investor</h3>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID *</label>
                <input
                  type="text"
                  required
                  value={inviteData.investorEid}
                  onChange={(e) => setInviteData({ ...inviteData, investorEid: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="784-XXXX-XXXXXXX-X"
                />
              </div>
              {!adminInfo?.designation && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Designation *</label>
                  <input
                    type="text"
                    required
                    value={inviteData.adminDesignation}
                    onChange={(e) => setInviteData({ ...inviteData, adminDesignation: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., CEO, Director, Manager"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be saved and won't be asked next time.</p>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit (AED) *</label>
                <input
                  type="text"
                  required
                  value={inviteData.creditLimit}
                  onChange={(e) =>
                    setInviteData({
                      ...inviteData,
                      creditLimit: sanitizeDecimalInput(e.target.value)
                    })
                  }
                  inputMode="decimal"
                  onWheel={(e) => e.target.blur()}
                  className="w-full border rounded px-3 py-2"
                  placeholder="500000"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decided Percentage Range (%) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Minimum</span>
                    <input
                      type="text"
                      required
                      value={inviteData.decidedPercentageMin}
                      onChange={(e) =>
                        setInviteData({
                          ...inviteData,
                          decidedPercentageMin: limitPercentageInput(e.target.value)
                        })
                      }
                      inputMode="decimal"
                      onWheel={(e) => e.target.blur()}
                      className="w-full border rounded px-3 py-2 text-right"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Maximum</span>
                    <input
                      type="text"
                      required
                      value={inviteData.decidedPercentageMax}
                      onChange={(e) =>
                        setInviteData({
                          ...inviteData,
                          decidedPercentageMax: limitPercentageInput(e.target.value)
                        })
                      }
                      inputMode="decimal"
                      onWheel={(e) => e.target.blur()}
                      className="w-full border rounded px-3 py-2 text-right"
                      placeholder="20"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Enter values between 0 and 100.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 bg-primary-600 text-white py-2 rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteData({
                      email: '',
                      name: '',
                      investorEid: '',
                      creditLimit: '',
                      decidedPercentageMin: '0',
                      decidedPercentageMax: '0',
                      adminDesignation: adminInfo?.designation || ''
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Credit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Investor</h3>
            <form onSubmit={handleUpdateInvestor}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit (AED) *</label>
                <input
                  type="text"
                  required
                  value={editData.creditLimit}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      creditLimit: sanitizeDecimalInput(e.target.value)
                    })
                  }
                  inputMode="decimal"
                  onWheel={(e) => e.target.blur()}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Decided Percentage (%) *</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Minimum</span>
                    <input
                      type="text"
                      required
                      value={editData.decidedPercentageMin}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          decidedPercentageMin: limitPercentageInput(e.target.value)
                        })
                      }
                      inputMode="decimal"
                      onWheel={(e) => e.target.blur()}
                      className="w-full border rounded px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Maximum</span>
                    <input
                      type="text"
                      required
                      value={editData.decidedPercentageMax}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          decidedPercentageMax: limitPercentageInput(e.target.value)
                        })
                      }
                      inputMode="decimal"
                      onWheel={(e) => e.target.blur()}
                      className="w-full border rounded px-3 py-2 text-right"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Enter values between 0 and 100.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-primary-600 text-white py-2 rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditData({
                      id: '',
                      name: '',
                      email: '',
                      creditLimit: '',
                      decidedPercentageMin: '0',
                      decidedPercentageMax: '0'
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Delete Investor</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-gray-800">{deleteTarget?.name || 'this investor'}</span>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteInvestor}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default AdminInvestors;
