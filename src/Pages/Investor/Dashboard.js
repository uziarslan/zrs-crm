import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const InvestorDashboard = () => {
  const { user } = useAuth();
  const [soaData, setSOAData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchSOA();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSOA = async () => {
    try {
      const response = await axiosInstance.get(`/investors/${user.id}/soa`);
      setSOAData(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Investor Dashboard">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Investor Dashboard">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Credit Limit</div>
          <div className="text-3xl font-bold text-gray-900">
            AED {(soaData?.creditLimit || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Utilized Amount</div>
          <div className="text-3xl font-bold text-red-600">
            AED {(soaData?.utilizedAmount || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Available Credit</div>
          <div className="text-3xl font-bold text-green-600">
            AED {(soaData?.remainingCredit || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Investment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Investments:</span>
              <span className="font-bold">{soaData?.summary?.totalActiveInvestments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Settled Investments:</span>
              <span className="font-bold">{soaData?.summary?.totalSettledInvestments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Profit:</span>
              <span className="font-bold text-green-600">
                AED {(soaData?.summary?.totalProfit || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average ROI:</span>
              <span className="font-bold text-blue-600">
                {(soaData?.summary?.averageROI || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Utilization</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Credit Usage</span>
              <span className="font-bold">
                {soaData?.creditLimit > 0
                  ? ((soaData.utilizedAmount / soaData.creditLimit) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-primary-600 h-4 rounded-full transition-all"
                style={{
                  width: `${soaData?.creditLimit > 0
                    ? Math.min((soaData.utilizedAmount / soaData.creditLimit) * 100, 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            You have <span className="font-bold text-green-600">
              AED {(soaData?.remainingCredit || 0).toLocaleString()}
            </span> available for new investments.
          </p>
        </div>
      </div>

      {/* Recent Investments */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent Investments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Share</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Return</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {soaData?.investments?.slice(0, 10).map((investment, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {investment.images && investment.images.length > 0 ? (
                        <img
                          src={investment.images[0].url}
                          alt={investment.vehicleDetails}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m- Median0h4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {investment.vehicleDetails || 'Vehicle details not available'}
                        </div>
                        {investment.vehicleId && (
                          <div className="text-xs text-gray-500">ID: {investment.vehicleId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {investment.vehicleInfo ? (
                      <div className="space-y-1">
                        {investment.vehicleInfo.trim && (
                          <div className="text-xs text-gray-600">Trim: {investment.vehicleInfo.trim}</div>
                        )}
                        {investment.vehicleInfo.color && (
                          <div className="text-xs text-gray-600">Color: {investment.vehicleInfo.color}</div>
                        )}
                        {investment.vehicleInfo.region && (
                          <div className="text-xs text-gray-600">Region: {investment.vehicleInfo.region}</div>
                        )}
                        {investment.vehicleInfo.mileage && (
                          <div className="text-xs text-gray-600">Mileage: {investment.vehicleInfo.mileage.toLocaleString()} km</div>
                        )}
                        {investment.vehicleInfo.vin && (
                          <div className="text-xs text-gray-500 font-mono">VIN: {investment.vehicleInfo.vin}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No details available</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    AED {investment.investmentAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {investment.investmentPercentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {investment.vehicleInfo?.purchasePrice ? (
                      `AED ${investment.vehicleInfo.purchasePrice.toLocaleString()}`
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${investment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      investment.status === 'sold' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {investment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {investment.profitAmount ? (
                      <span className="text-green-600 font-medium">
                        +AED {investment.profitAmount.toLocaleString()} ({investment.profitPercentage?.toFixed(2)}%)
                      </span>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {investment.totalReturn ? (
                      `AED ${investment.totalReturn.toLocaleString()}`
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!soaData?.investments || soaData.investments.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              No investments yet
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvestorDashboard;
