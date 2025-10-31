import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const AdminManagers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', name: '' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await axiosInstance.get('/admin/managers');
      setManagers(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch managers');
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
        role: 'manager'
      });

      setShowInviteModal(false);
      setInviteData({ email: '', name: '' });
      fetchManagers();
      alert('Invitation sent successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axiosInstance.put(`/admin/managers/${id}/status`, { status });
      fetchManagers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Managers">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Managers">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Total Managers: <span className="font-bold">{managers.length}</span>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Invite Manager
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {managers.map((manager) => (
              <tr key={manager._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{manager.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${manager.status === 'active' ? 'bg-green-100 text-green-800' :
                    manager.status === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {manager.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {manager.lastLoginAt ? new Date(manager.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <select
                    value={manager.status}
                    onChange={(e) => updateStatus(manager._id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="invited">Invited</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {managers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No managers found. Invite your first manager!
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Invite Manager</h3>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="manager@example.com"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Manager Name"
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
    </DashboardLayout>
  );
};

export default AdminManagers;
