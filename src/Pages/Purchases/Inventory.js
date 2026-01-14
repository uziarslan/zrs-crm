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
  const [showProgressWarningModal, setShowProgressWarningModal] = useState(false);
  const [vehiclesNotReady, setVehiclesNotReady] = useState([]);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  const exportInventoryData = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'purchase');

      // If a status is selected, export only that status; otherwise export inventory + consignment
      if (filters.status) {
        params.append('status', filters.status);
      } else {
        params.append('status', 'inventory,consignment');
      }

      const response = await axiosInstance.get(`/export/leads?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const statusSlug = filters.status || 'inventory_consignment';
      link.href = url;
      link.setAttribute('download', `inventory_${statusSlug}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      // Fail silently to avoid alert popups; errors will appear in console
      // eslint-disable-next-line no-console
      console.error('Failed to export inventory', e);
    }
  };

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
  const vehiclesReadyForSale = vehicles.filter(v => v.status === 'sale').length;
  const vehiclesInProgress = vehicles.filter(v => {
    const checklist = v.operationalChecklist;
    return checklist && !isChecklistComplete(checklist);
  }).length;

  const getChecklistProgress = (vehicle) => {
    if (!vehicle) return 0;

    // Operational checklist items
    const checklist = vehicle.operationalChecklist || {};
    const operationalItems = ['detailing', 'photoshoot', 'photoshootEdited', 'metaAds', 'onlineAds', 'instagram'];
    let operationalCompleted = 0;

    operationalItems.forEach(item => {
      const itemData = checklist[item];
      if (itemData && (itemData.completed === true || itemData.completed === 'true')) {
        operationalCompleted += 1;
      }
    });

    // Financial checklist items (job costing evidence)
    // For consignment leads, financial evidence is optional and NOT required for readiness.
    let financialTotal = 0;
    let financialCompleted = 0;
    if (vehicle.status !== 'consignment') {
      financialTotal = vehicle.financialChecklist?.totalItems || 0;
      financialCompleted = vehicle.financialChecklist?.completedItems || 0;
    }

    // Document requirements: Only check for showroom registration card (new registration card)
    // Customer registration card is not counted in progress
    const attachments = vehicle.attachments || [];
    const hasNewRegistrationCard = attachments.some(doc => doc.category === 'registrationCardNew');
    
    let documentTotal = 1; // Only showroom registration card is required
    let documentCompleted = hasNewRegistrationCard ? 1 : 0;

    const totalItems = operationalItems.length + financialTotal + documentTotal;
    const totalCompleted = operationalCompleted + financialCompleted + documentCompleted;

    if (totalItems === 0) return 0;
    return Math.round((totalCompleted / totalItems) * 100);
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
          <div className="mb-0 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search inventory..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="w-40">
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="inventory">Inventory</option>
                  <option value="consignment">Consignment</option>
                </select>
              </div>
              <button
                type="button"
                onClick={exportInventoryData}
                className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkBar && (
          <div className="mb-4 bg-gradient-to-r from-primary-50 to-blue-50 border-l-4 border-primary-600 rounded-r-lg shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg shadow">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {selectedVehicles.length} Vehicle{selectedVehicles.length !== 1 ? 's' : ''} Selected
                      </div>
                      <div className="text-xs text-gray-500">Ready for bulk action</div>
                    </div>
                  </div>

                  <div className="h-12 w-px bg-gray-300" />

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Bulk Actions:</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isBulkMoving) return;

                        const selected = vehicles.filter(v => selectedVehicles.includes(v._id));
                        // Consider only inventory / in_inventory / consignment vehicles for move to sales
                        const inventoryVehicles = selected.filter(
                          v =>
                            v.status === 'inventory' ||
                            v.status === 'in_inventory' ||
                            v.status === 'consignment'
                        );

                        if (inventoryVehicles.length === 0) {
                          // Nothing to move; just return silently as per UX preference (no alerts)
                          return;
                        }

                        const notReady = inventoryVehicles.filter(v => getChecklistProgress(v) < 100);

                        if (notReady.length > 0) {
                          setVehiclesNotReady(notReady);
                          setShowProgressWarningModal(true);
                          return;
                        }

                        // All selected inventory vehicles are ready
                        setIsBulkMoving(true);
                        try {
                          for (const vehicle of inventoryVehicles) {
                            await axiosInstance.put(`/purchases/vehicles/${vehicle._id}/mark-ready`);
                          }
                          await fetchInventory();
                          setSelectedVehicles([]);
                        } finally {
                          setIsBulkMoving(false);
                        }
                      }}
                      className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg shadow-md transition-all ${isBulkMoving
                        ? 'text-white bg-primary-400 cursor-not-allowed'
                        : 'text-white bg-primary-600 hover:bg-primary-700 hover:shadow-lg'
                        }`}
                    >
                      {isBulkMoving ? (
                        <>
                          <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Moving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                            />
                          </svg>
                          Move to Sales
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVehicles([])}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              </div>
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
                      Color
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
                      Job Costing Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
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
                        {vehicle.color ? (
                          <span className="text-sm text-gray-900 capitalize">{vehicle.color}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${vehicle.status === 'inventory' || vehicle.status === 'in_inventory' ? 'bg-blue-100 text-blue-800' :
                          vehicle.status === 'sale' ? 'bg-green-100 text-green-800' :
                            vehicle.status === 'consignment' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {vehicle.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-start">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                              <div
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(0, Math.min(100, getChecklistProgress(vehicle)))}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 font-medium">{getChecklistProgress(vehicle)}%</span>
                          </div>
                          {getChecklistProgress(vehicle) === 100 &&
                            (vehicle.status === 'inventory' || vehicle.status === 'in_inventory' || vehicle.status === 'consignment') && (
                              <button
                                onClick={() => handleMarkAsReady(vehicle)}
                                className="mt-2 inline-flex items-center px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-md transition-colors"
                              >
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                                  />
                                </svg>
                                Move to Sales
                              </button>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.purchasePrice != null
                          ? `AED ${vehicle.purchasePrice.toLocaleString()}`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const jc = vehicle.jobCosting || {};
                          const jobTotal =
                            (jc.transferCost || 0) +
                            (jc.detailing_cost || 0) +
                            (jc.agent_commision || 0) +
                            (jc.car_recovery_cost || 0) +
                            (jc.inspection_cost || 0) +
                            (jc.additionalAmount || 0);
                          return jobTotal > 0 ? `AED ${jobTotal.toLocaleString()}` : '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const purchase = vehicle.purchasePrice || 0;
                          const jc = vehicle.jobCosting || {};
                          const jobTotal =
                            (jc.transferCost || 0) +
                            (jc.detailing_cost || 0) +
                            (jc.agent_commision || 0) +
                            (jc.car_recovery_cost || 0) +
                            (jc.inspection_cost || 0) +
                            (jc.additionalAmount || 0);
                          const total = purchase + jobTotal;
                          return total > 0 ? `AED ${total.toLocaleString()}` : '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleViewVehicle(vehicle)}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                          >
                            View Details
                          </button>
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

      {/* Progress Warning Modal for Bulk Move */}
      {showProgressWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cannot Move All Vehicles</h3>
                  <p className="text-sm text-gray-600">Some vehicles are not ready to be moved to sales</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  The following vehicles cannot be moved because their overall progress is below 100%:
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {vehiclesNotReady.map(vehicle => (
                    <div
                      key={vehicle._id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-2"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {vehicle.make} {vehicle.model} {vehicle.year}
                      </span>
                      <span className="text-xs text-gray-600">
                        Progress: {getChecklistProgress(vehicle)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (isBulkMoving) return;
                    setShowProgressWarningModal(false);
                    setVehiclesNotReady([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (isBulkMoving) return;

                    setShowProgressWarningModal(false);

                    const selected = vehicles.filter(v => selectedVehicles.includes(v._id));
                    const inventoryVehicles = selected.filter(
                      v =>
                        v.status === 'inventory' ||
                        v.status === 'in_inventory' ||
                        v.status === 'consignment'
                    );
                    const readyVehicles = inventoryVehicles.filter(v => getChecklistProgress(v) === 100);

                    if (readyVehicles.length === 0) {
                      setVehiclesNotReady([]);
                      return;
                    }

                    setIsBulkMoving(true);
                    try {
                      for (const vehicle of readyVehicles) {
                        await axiosInstance.put(`/purchases/vehicles/${vehicle._id}/mark-ready`);
                      }
                      await fetchInventory();
                      setSelectedVehicles([]);
                    } finally {
                      setIsBulkMoving(false);
                      setVehiclesNotReady([]);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Move Ready Vehicles Only
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Inventory;