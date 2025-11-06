import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const Inventory = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [showBulkBar, setShowBulkBar] = useState(false);

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    setShowBulkBar(selectedVehicles.length > 0);
  }, [selectedVehicles]);

  // Refresh inventory when page becomes visible again (e.g., after navigating back from detail page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchInventory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh when the window regains focus (in case visibility API doesn't fire)
    const handleFocus = () => {
      fetchInventory();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await axiosInstance.get(`/purchases/inventory?${params}`);
      setVehicles(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const isChecklistComplete = (checklist) => {
    if (!checklist) return false;
    return checklist.detailing?.completed &&
      checklist.photoshoot?.completed &&
      checklist.photoshootEdited?.completed &&
      checklist.metaAds?.completed &&
      checklist.onlineAds?.completed &&
      checklist.instagram?.completed;
  };

  // Calculate stats
  const totalVehicles = vehicles.length;
  const vehiclesInInventory = vehicles.filter(v => v.status === 'inventory' || v.status === 'in_inventory').length;
  const vehiclesReadyForSale = vehicles.filter(v => v.status === 'ready_for_sale').length;
  const vehiclesInProgress = vehicles.filter(v => {
    const checklist = v.operationalChecklist;
    return checklist && !isChecklistComplete(checklist);
  }).length;

  const getChecklistProgress = (vehicle) => {
    if (!vehicle || !vehicle.operationalChecklist) return 0;
    const checklist = vehicle.operationalChecklist;
    const items = ['detailing', 'photoshoot', 'photoshootEdited', 'metaAds', 'onlineAds', 'instagram'];
    const completed = items.filter(item => {
      const itemData = checklist[item];
      return itemData && (itemData.completed === true || itemData.completed === 'true');
    }).length;
    return Math.round((completed / items.length) * 100);
  };


  const handleMarkAsReady = async (vehicle) => {
    try {
      await axiosInstance.put(`/purchases/vehicles/${vehicle._id}/mark-ready`);
      await fetchInventory(); // Refresh inventory data
      alert('Vehicle marked as ready for sale!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark vehicle as ready');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVehicles(vehicles.map(vehicle => vehicle._id));
    } else {
      setSelectedVehicles([]);
    }
  };

  const handleSelectVehicle = (vehicleId) => {
    if (selectedVehicles.includes(vehicleId)) {
      setSelectedVehicles(selectedVehicles.filter(id => id !== vehicleId));
    } else {
      setSelectedVehicles([...selectedVehicles, vehicleId]);
    }
  };

  const handleViewVehicle = (vehicle) => {
    navigate(`/purchases/inventory/${vehicle._id}`);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesStatus = !filters.status || vehicle.status === filters.status;
    const matchesSearch = !filters.search ||
      vehicle.vehicleId?.toLowerCase().includes(filters.search.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(filters.search.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading inventory...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-blue-100 mt-1">Manage your vehicle inventory and operational tasks</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-semibold text-gray-900">{totalVehicles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Inventory</p>
                <p className="text-2xl font-semibold text-gray-900">{vehiclesInInventory}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ready for Sale</p>
                <p className="text-2xl font-semibold text-gray-900">{vehiclesReadyForSale}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{vehiclesInProgress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Vehicles
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by ID, make, or model..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
              />
            </div>

            <div className="sm:w-48">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
              >
                <option value="">All Statuses</option>
                <option value="inventory">In Inventory</option>
                <option value="consignment">Consignment</option>
                <option value="ready_for_sale">Ready for Sale</option>
                <option value="purchased">Purchased</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkBar && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-700">
                {selectedVehicles.length} vehicle(s) selected
              </span>
              <button
                onClick={() => setSelectedVehicles([])}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {/* Vehicles Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredVehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedVehicles.length === filteredVehicles.length && filteredVehicles.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedVehicles.includes(vehicle._id)}
                          onChange={() => handleSelectVehicle(vehicle._id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.make} {vehicle.model} {vehicle.year}
                          </div>
                          <div className="text-sm text-gray-500">ID: {vehicle.vehicleId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${vehicle.status === 'inventory' || vehicle.status === 'in_inventory' ? 'bg-blue-100 text-blue-800' :
                          vehicle.status === 'ready_for_sale' ? 'bg-green-100 text-green-800' :
                            vehicle.status === 'consignment' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {vehicle.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(0, Math.min(100, getChecklistProgress(vehicle)))}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 font-medium">{getChecklistProgress(vehicle)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${vehicle.purchasePrice?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleViewVehicle(vehicle)}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                          >
                            View Details
                          </button>
                          {isChecklistComplete(vehicle.operationalChecklist) && vehicle.status === 'in_inventory' && (
                            <button
                              onClick={() => handleMarkAsReady(vehicle)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Mark Ready
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
              <p className="text-gray-500 mb-4">
                {vehicles.length === 0
                  ? "You don't have any vehicles in your inventory yet."
                  : "No vehicles match your current filters."
                }
              </p>
              <p className="mt-1 text-sm text-gray-500">Get started by purchasing your first vehicle.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;