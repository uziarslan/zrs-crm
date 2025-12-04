import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    fetchPOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPOs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await axiosInstance.get(`/purchases/po?${params}`);
      setPOs(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (poId) => {
    if (!window.confirm('Are you sure you want to approve this Purchase Order?')) return;

    try {
      await axiosInstance.post(`/purchases/po/${poId}/approve`);
      alert('Purchase Order approved!');
      fetchPOs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve PO');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      pending_signature: 'bg-blue-100 text-blue-800',
      signed: 'bg-purple-100 text-purple-800',
      completed: 'bg-teal-100 text-teal-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout title="Purchase Orders">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Purchase Orders">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="pending_signature">Pending Signature</option>
          <option value="signed">Signed</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="space-y-6">
        {pos.map((po) => (
          <div key={po._id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{po.poId}</h3>
                <p className="text-sm text-gray-600">
                  Vehicle: {po.vehicleId?.vehicleId} - {po.vehicleId?.make} {po.vehicleId?.model}
                </p>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                {po.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">Amount</div>
                <div className="text-lg font-bold">AED {po.amount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Approvals</div>
                <div className="text-lg font-bold">{po.approvedBy?.length || 0} / 2</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Zoho Sign Status</div>
                <div className="text-sm font-medium capitalize">{po.docuSignStatus || 'Not sent'}</div>
              </div>
            </div>

            {/* Investor Allocations */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Investor Allocations:</div>
              <div className="space-y-2">
                {po.investorAllocations?.map((allocation, idx) => (
                  <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>{allocation.investorId?.name || 'Investor'}</span>
                    <span className="font-medium">
                      AED {allocation.amount.toLocaleString()} ({allocation.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approvals */}
            {po.approvedBy && po.approvedBy.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Approvals:</div>
                <div className="space-y-2">
                  {po.approvedBy.map((approval, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{approval.adminId?.name || 'Admin'}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-600">{new Date(approval.approvedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {user?.role === 'admin' && po.status === 'pending_approval' && !po.approvedBy?.some(a => a.adminId?._id === user.id) && (
              <button
                onClick={() => handleApprove(po._id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Approve Purchase Order
              </button>
            )}
          </div>
        ))}
      </div>

      {pos.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No purchase orders found</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PurchaseOrders;
