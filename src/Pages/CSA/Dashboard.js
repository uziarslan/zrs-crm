import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const CSADashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axiosInstance.get('/csa/dashboard');
      setStats(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="CSA Dashboard">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CSA Dashboard">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Tickets</div>
          <div className="text-3xl font-bold text-gray-900">{stats?.totalTickets || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Open Tickets</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.openTickets || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">In Progress</div>
          <div className="text-3xl font-bold text-yellow-600">{stats?.inProgressTickets || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Urgent</div>
          <div className="text-3xl font-bold text-red-600">{stats?.urgentTickets || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Resolution Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Resolved:</span>
              <span className="font-bold text-green-600">{stats?.resolvedTickets || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Closed:</span>
              <span className="font-bold">{stats?.closedTickets || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Resolution Time:</span>
              <span className="font-bold">{stats?.avgResolutionTimeHours?.toFixed(1) || 0} hours</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tickets by Type</h3>
          <div className="space-y-2">
            {stats?.ticketsByType?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 capitalize">{item._id?.replace('_', ' ')}:</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Link
          to="/csa/tickets"
          className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          View All Tickets
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default CSADashboard;
