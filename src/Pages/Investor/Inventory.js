import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const InvestorInventory = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchInventory = async () => {
    try {
      const response = await axiosInstance.get(`/investors/${user.id}/inventory`);
      setVehicles(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      purchased: 'bg-blue-100 text-blue-800',
      in_inventory: 'bg-purple-100 text-purple-800',
      sale: 'bg-green-100 text-green-800',
      test_drive: 'bg-yellow-100 text-yellow-800',
      sold: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout title="My Inventory">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Inventory">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Vehicles you have invested in: <span className="font-bold">{vehicles.length}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.vehicleId} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
            {vehicle.images && vehicle.images.length > 0 ? (
              <div className="h-48 bg-gray-200 overflow-hidden">
                <img
                  src={vehicle.images[0].url}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm text-gray-500 mb-1">{vehicle.vehicleId}</div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <div className="text-sm text-gray-600">{vehicle.year}</div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                  {vehicle.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Mileage:</span>
                  <span className="font-medium">{vehicle.mileage?.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Purchase Price:</span>
                  <span className="font-medium">AED {(vehicle.purchasePrice || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Your Investment:</span>
                  <span className="font-bold text-primary-600">
                    AED {(vehicle.investmentAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Share:</span>
                  <span className="font-bold text-blue-600">{vehicle.investmentPercentage}%</span>
                </div>
                {vehicle.sellingPrice && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium">AED {vehicle.sellingPrice.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {vehicles.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No investments yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            You haven't invested in any vehicles yet.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default InvestorInventory;
