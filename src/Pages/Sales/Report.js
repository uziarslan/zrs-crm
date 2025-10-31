import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const SalesReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchReport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axiosInstance.get(`/sales/report?${params}`);
      setReport(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axiosInstance.get(`/export/sales?${params}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export report');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Sales Report">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sales Report">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={exportReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Sales</div>
          <div className="text-3xl font-bold text-gray-900">{report?.totalSales || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-green-600">
            AED {(report?.totalRevenue || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Profit</div>
          <div className="text-3xl font-bold text-blue-600">
            AED {(report?.totalProfit || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Avg Profit %</div>
          <div className="text-3xl font-bold text-purple-600">
            {(report?.averageProfitPercentage || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent Sales</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report?.sales?.map((sale) => (
              <tr key={sale._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                  {sale.saleId}
                </td>
                <td className="px-6 py-4 text-sm">
                  {sale.vehicleId?.vehicleId} - {sale.vehicleId?.make} {sale.vehicleId?.model}
                </td>
                <td className="px-6 py-4 text-sm">
                  {sale.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  AED {sale.sellingPrice.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                  AED {sale.profit.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sale.profitPercentage.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(sale.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!report?.sales || report.sales.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No sales found for the selected period
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesReport;
