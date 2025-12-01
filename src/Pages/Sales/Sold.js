import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const Sold = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '' });
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    fetchSoldLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const showNotification = useCallback((type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type, message: '' });
    }, 5000);
  }, []);

  const showError = useCallback(
    (message) => showNotification('error', message),
    [showNotification]
  );

  const fetchSoldLeads = async () => {
    try {
      const params = new URLSearchParams();
      params.append('status', 'sold');
      if (filters.search) params.append('search', filters.search);

      const response = await axiosInstance.get(`/purchases/leads?${params}`);
      setLeads(response.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sold leads');
    } finally {
      setLoading(false);
    }
  };

  const exportSales = async () => {
    try {
      const params = new URLSearchParams();
      params.append('status', 'sold');

      const response = await axiosInstance.get(`/export/leads?${params}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sold_vehicles_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showError('Failed to export sold vehicles');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {notification.show && (
            <div className="mb-4 border-l-4 p-4 rounded-r-lg bg-red-50 border-red-400">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{notification.message}</p>
                <button
                  type="button"
                  onClick={() => setNotification({ show: false, type: 'success', message: '' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {notification.show && (
          <div className="mb-4 border-l-4 p-4 rounded-r-lg bg-red-50 border-red-400">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{notification.message}</p>
              <button
                type="button"
                onClick={() => setNotification({ show: false, type: 'success', message: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sold Vehicles</h1>
            <p className="text-sm text-gray-600 mt-1">
              View all completed sales
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search sold vehicles..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={exportSales}
          className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Lead ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sold Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Buying Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Selling Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ZRS Profit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Other Party Profit
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => {
                const sellInvoice = lead.sellInvoice || {};
                const zrsProfit = Number(sellInvoice.zrsProfit || 0);
                const isConsignment = lead.type === 'consignment';

                // For consignment: use ownerProfit, for purchase: sum investor profits
                let otherPartyProfit = 0;
                if (isConsignment) {
                  otherPartyProfit = Number(sellInvoice.ownerProfit || 0);
                } else {
                  const investorBreakdown = sellInvoice.investorBreakdown || [];
                  otherPartyProfit = investorBreakdown.reduce((sum, inv) => {
                    const profit = Number(inv.profitAmount || 0);
                    return sum + profit;
                  }, 0);
                }

                const sellingPrice = lead.soldPrice || sellInvoice.sellingPrice || 0;
                const purchasePrice = lead.priceAnalysis?.purchasedFinalPrice || 0;
                const jobCosting = lead.jobCosting || {};
                const totalJobCost =
                  (jobCosting.transferCost || 0) +
                  (jobCosting.detailing_cost || 0) +
                  (jobCosting.agent_commision || 0) +
                  (jobCosting.car_recovery_cost || 0) +
                  (jobCosting.inspection_cost || 0);
                const buyingPrice = purchasePrice + totalJobCost;

                const zrsProfitPercentage = purchasePrice > 0 ? ((zrsProfit / purchasePrice) * 100) : 0;
                const otherPartyProfitPercentage = purchasePrice > 0 ? ((otherPartyProfit / purchasePrice) * 100) : 0;
                const soldDate = sellInvoice.createdAt || lead.updatedAt || lead.createdAt;

                return (
                  <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-primary-600">{lead.leadId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {soldDate ? new Date(soldDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${lead.type === 'purchase'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                        }`}>
                        {lead.type === 'purchase' ? 'Purchase' : 'Consignment'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.vehicleInfo ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                          </div>
                          <div className="text-xs text-gray-500">{lead.vehicleInfo.year}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.sellOrder?.customerName || lead.contactInfo?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lead.sellOrder?.customerContact || lead.contactInfo?.phone || ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        AED {buyingPrice.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        AED {sellingPrice.toLocaleString() || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-600">
                        AED {zrsProfit.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {zrsProfitPercentage !== 0 && (
                        <div className="text-xs text-gray-500">{zrsProfitPercentage.toFixed(2)}%</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        AED {otherPartyProfit.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {otherPartyProfitPercentage !== 0 && (
                        <div className="text-xs text-gray-500">{otherPartyProfitPercentage.toFixed(2)}%</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/sales/sold/${lead._id}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all"
                      >
                        View
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {leads.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No sold vehicles</h3>
            <p className="text-sm text-gray-500">
              {filters.search ? 'Try adjusting your search' : 'Sold vehicles will appear here when Sell Invoices are generated'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Sold;
