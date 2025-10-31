import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const ManagerDashboard = () => {
  const [stats, setStats] = useState({
    leads: 0,
    followUps: 0,
    sales: 0
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch purchase leads
      const purchaseLeadsRes = await axiosInstance.get('/purchases/leads');
      const salesLeadsRes = await axiosInstance.get('/sales/leads');

      setStats({
        leads: purchaseLeadsRes.data.count + salesLeadsRes.data.count,
        followUps: 0, // TODO: Fetch follow-ups count
        sales: salesLeadsRes.data.count
      });

      // Get recent leads
      setRecentLeads([
        ...purchaseLeadsRes.data.data.slice(0, 5),
        ...salesLeadsRes.data.data.slice(0, 5)
      ].slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Manager Dashboard">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manager Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-gray-600">My Leads</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.leads}</p>
          <Link to="/purchases/leads" className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block">
            View all →
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-gray-600">Follow-ups Due</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.followUps}</p>
          <Link to="/purchases/leads" className="text-sm text-yellow-600 hover:text-yellow-700 mt-2 inline-block">
            View all →
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-gray-600">Sales Leads</h3>
          <p className="text-3xl font-bold text-green-600">{stats.sales}</p>
          <Link to="/sales/leads" className="text-sm text-green-600 hover:text-green-700 mt-2 inline-block">
            View all →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/purchases/leads/create"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium">New Purchase Lead</div>
          </Link>
          <Link
            to="/sales/leads"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
          >
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">New Sales Lead</div>
          </Link>
          <Link
            to="/purchases/inventory"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
          >
            <div className="text-2xl mb-2">🚗</div>
            <div className="text-sm font-medium">View Inventory</div>
          </Link>
          <Link
            to="/csa/tickets/create"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
          >
            <div className="text-2xl mb-2">🎫</div>
            <div className="text-sm font-medium">Create Ticket</div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent Leads</h3>
        </div>
        <div className="divide-y">
          {recentLeads.map((lead) => (
            <div key={lead._id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {lead.type === 'purchase' && lead.vehicleInfo && lead.attachments && lead.attachments.filter(a => a.category === 'carPictures').length > 0 && (
                      <img
                        src={lead.attachments.filter(a => a.category === 'carPictures')[0].url}
                        alt={`${lead.vehicleInfo.make} ${lead.vehicleInfo.model}`}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{lead.leadId}</div>
                      <div className="text-sm text-gray-600">{lead.contactInfo?.name || 'N/A'}</div>
                      {lead.type === 'purchase' && lead.vehicleInfo && (
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {lead.vehicleInfo.make} {lead.vehicleInfo.model} {lead.vehicleInfo.year}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {lead.type === 'purchase' ? '📥 Purchase' : '📤 Sales'} • {lead.source}
                      </div>
                      {lead.type === 'purchase' && lead.vehicleInfo && (
                        <div className="text-xs text-gray-600 mt-1 space-x-2">
                          {lead.vehicleInfo.trim && <span>Trim: {lead.vehicleInfo.trim}</span>}
                          {lead.vehicleInfo.color && <span>Color: {lead.vehicleInfo.color}</span>}
                          {lead.vehicleInfo.region && <span>Region: {lead.vehicleInfo.region}</span>}
                          {lead.vehicleInfo.mileage && <span>Mileage: {lead.vehicleInfo.mileage.toLocaleString()} km</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'negotiation' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {lead.status}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {recentLeads.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
