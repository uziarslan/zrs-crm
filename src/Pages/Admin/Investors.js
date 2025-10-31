import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const AdminInvestors = () => {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', name: '', creditLimit: '' });
  const [editData, setEditData] = useState({ id: '', creditLimit: '' });
  const [inviting, setInviting] = useState(false);

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
    try {
      // Use relative path from /api/v1 to /api/auth/invite
      await axiosInstance.post('../auth/invite', {
        email: inviteData.email,
        name: inviteData.name,
        role: 'investor',
        creditLimit: parseFloat(inviteData.creditLimit)
      });

      setShowInviteModal(false);
      setInviteData({ email: '', name: '', creditLimit: '' });
      fetchInvestors();
      alert('Invitation sent successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateCredit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/investors/${editData.id}/credit-limit`, {
        creditLimit: parseFloat(editData.creditLimit)
      });
      setShowEditModal(false);
      fetchInvestors();
      alert('Credit limit updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update credit limit');
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

      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Total Investors: <span className="font-bold">{investors.length}</span>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilized</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {investors.map((investor) => (
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  AED {investor.creditLimit.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  AED {investor.utilizedAmount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  AED {investor.remainingCredit.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => {
                      setEditData({ id: investor._id, creditLimit: investor.creditLimit });
                      setShowEditModal(true);
                    }}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Edit Credit
                  </button>
                </td>
              </tr>
            ))}
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
                  type="number"
                  required
                  value={inviteData.creditLimit}
                  onChange={(e) => setInviteData({ ...inviteData, creditLimit: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="500000"
                />
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
                  onClick={() => setShowInviteModal(false)}
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
            <h3 className="text-lg font-bold mb-4">Update Credit Limit</h3>
            <form onSubmit={handleUpdateCredit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit (AED) *</label>
                <input
                  type="number"
                  required
                  value={editData.creditLimit}
                  onChange={(e) => setEditData({ ...editData, creditLimit: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded hover:bg-primary-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminInvestors;
