import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [groupedLogs, setGroupedLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'grouped'
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
    limit: 100
  });

  const renderMetadata = (metadata) => {
    if (!metadata) return null;

    return Object.entries(metadata).map(([key, value]) => {
      // Format the display based on key type
      let displayValue = value;

      if (value === null || value === undefined) {
        displayValue = 'None';
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects (like oldManager, newManager)
        if (value.name) {
          displayValue = `${value.name} (${value.email || value.id || ''})`;
        } else {
          displayValue = JSON.stringify(value);
        }
      } else if (key.includes('Amount') || key.includes('Limit') || key.includes('Price')) {
        displayValue = `AED ${parseFloat(value).toLocaleString()}`;
      } else if (key.includes('Percentage')) {
        displayValue = `${parseFloat(value).toFixed(2)}%`;
      }

      return (
        <div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
          <span className="font-medium text-gray-700 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}:
          </span>
          <span className="text-gray-900">{String(displayValue)}</span>
        </div>
      );
    });
  };

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', filters.limit);

      const response = await axiosInstance.get(`/admin/audit-logs?${params}`);
      setLogs(response.data.data);
      setGroupedLogs(response.data.grouped || {});
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      authentication: 'bg-blue-100 text-blue-800',
      user_management: 'bg-purple-100 text-purple-800',
      lead_management: 'bg-indigo-100 text-indigo-800',
      purchase_order: 'bg-orange-100 text-orange-800',
      sales: 'bg-green-100 text-green-800',
      inventory: 'bg-yellow-100 text-yellow-800',
      investor: 'bg-pink-100 text-pink-800',
      csa: 'bg-teal-100 text-teal-800',
      approval: 'bg-red-100 text-red-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-gray-600'
    };
    return colors[severity] || 'text-gray-600';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return '🔴';
    if (severity === 'high') return '🟠';
    if (severity === 'medium') return '🟡';
    return '⚪';
  };

  if (loading) {
    return (
      <DashboardLayout title="Audit Logs">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Logs">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="user_management">User Management</option>
              <option value="lead_management">Lead Management</option>
              <option value="purchase_order">Purchase Orders</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="investor">Investor</option>
              <option value="approval">Approvals</option>
              <option value="csa">CSA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">Chronological</option>
              <option value="grouped">Grouped by Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.keys(groupedLogs).map((category) => (
          <div key={category} className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-sm text-gray-600 capitalize mb-1">
              {category.replace('_', ' ')}
            </div>
            <div className="text-2xl font-bold text-primary-600">
              {groupedLogs[category].length}
            </div>
          </div>
        ))}
      </div>

      {/* Logs Display */}
      {viewMode === 'all' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">All Activity ({logs.length} records)</h3>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{getSeverityIcon(log.severity)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(log.category)}`}>
                          {log.category.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-semibold uppercase ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                        {log.logId && (
                          <span className="text-xs text-gray-500">#{log.logId}</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {log.description}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>
                          👤 {log.performedBy?.userName || 'System'} ({log.performedBy?.userRole})
                        </span>
                        {log.targetEntity?.entityName && (
                          <span>
                            🎯 {log.targetEntity.entityType}: {log.targetEntity.entityName}
                          </span>
                        )}
                        <span>
                          🕒 {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary-600 cursor-pointer hover:text-primary-700">
                            View Details
                          </summary>
                          <div className="mt-2 text-xs bg-gray-50 p-3 rounded space-y-1">
                            {renderMetadata(log.metadata)}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No audit logs found for the selected filters
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedLogs).map((category) => (
            <div key={category} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>
                    {category.replace('_', ' ')}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({groupedLogs[category].length} events)
                  </span>
                </h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {groupedLogs[category].map((log) => (
                  <div key={log._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="text-xl">{getSeverityIcon(log.severity)}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {log.description}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>👤 {log.performedBy?.userName || 'System'}</span>
                          {log.targetEntity?.entityName && (
                            <span>🎯 {log.targetEntity.entityName}</span>
                          )}
                          <span>🕒 {new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-primary-600 cursor-pointer">Details</summary>
                            <div className="mt-1 text-xs bg-gray-50 p-2 rounded">
                              {renderMetadata(log.metadata)}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedLogs).length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No audit logs found
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AuditLogs;
