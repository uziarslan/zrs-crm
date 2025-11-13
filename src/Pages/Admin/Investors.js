import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const AdminInvestors = () => {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    creditLimit: '',
    decidedPercentageMin: '0',
    decidedPercentageMax: '0'
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

  useEffect(() => {
    fetchInvestors();
  }, []);

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
        creditLimit: creditLimitValue,
        decidedPercentageMin: decidedPercentageMinValue,
        decidedPercentageMax: decidedPercentageMaxValue
      });

      setShowInviteModal(false);
      setInviteData({ email: '', name: '', creditLimit: '', decidedPercentageMin: '0', decidedPercentageMax: '0' });
      await fetchInvestors();
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
          onClick={() => {
            setInviteData({
              email: '',
              name: '',
              creditLimit: '',
              decidedPercentageMin: '0',
              decidedPercentageMax: '0'
            });
            setError('');
            setSuccessMessage('');
            setShowInviteModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Invite Investor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Decided %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilized</th>
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${investor.status === 'active' ? 'bg-green-100 text-green-800' :
                      investor.status === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {investor.status}
                    </span>
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
