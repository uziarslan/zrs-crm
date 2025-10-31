import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const InvestorSOA = () => {
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
      setError(err.response?.data?.message || 'Failed to fetch SOA');
    } finally {
      setLoading(false);
    }
  };

  const exportSOA = async () => {
    try {
      const response = await axiosInstance.get(`/export/investor-soa/${user.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SOA_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export SOA');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Statement of Accounts">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Statement of Accounts">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* SOA Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Statement of Accounts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Investor: {soaData?.investor?.name || user?.name}
            </p>
            <p className="text-sm text-gray-600">{soaData?.investor?.email || user?.email}</p>
          </div>
          <button
            onClick={exportSOA}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            📄 Download PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="text-sm text-gray-600">Credit Limit</div>
            <div className="text-2xl font-bold text-gray-900">
              AED {(soaData?.creditLimit || 0).toLocaleString()}
            </div>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <div className="text-sm text-gray-600">Utilized</div>
            <div className="text-2xl font-bold text-red-600">
              AED {(soaData?.utilizedAmount || 0).toLocaleString()}
            </div>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <div className="text-sm text-gray-600">Available</div>
            <div className="text-2xl font-bold text-green-600">
              AED {(soaData?.remainingCredit || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Investment Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Share %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Return</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {soaData?.investments?.map((investment, index) => (
                <tr key={index} className={investment.status === 'sold' ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 text-sm font-medium">
                    {investment.vehicleDetails || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {investment.investmentDate ? new Date(investment.investmentDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    AED {investment.investmentAmount?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {investment.investmentPercentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${investment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      investment.status === 'sold' ? 'bg-green-100 text-green-800' :
                        investment.status === 'settled' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {investment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {investment.saleDate ? new Date(investment.saleDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {investment.profitAmount ? (
                      <div>
                        <div className="font-medium text-green-600">
                          AED {investment.profitAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {investment.profitPercentage?.toFixed(2)}% ROI
                        </div>
                      </div>
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
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="7" className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  Total Profit:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                  AED {(soaData?.summary?.totalProfit || 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
          {(!soaData?.investments || soaData.investments.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              No investments to display
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Active Investments</div>
            <div className="text-xl font-bold">{soaData?.summary?.totalActiveInvestments || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Settled Investments</div>
            <div className="text-xl font-bold">{soaData?.summary?.totalSettledInvestments || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Profit</div>
            <div className="text-xl font-bold text-green-600">
              AED {(soaData?.summary?.totalProfit || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Average ROI</div>
            <div className="text-xl font-bold text-blue-600">
              {(soaData?.summary?.averageROI || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvestorSOA;
