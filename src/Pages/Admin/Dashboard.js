import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState([]);
    const [groups, setGroups] = useState([]);
    const [savingGroups, setSavingGroups] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchRef = useRef(null);
    const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

    useEffect(() => {
        fetchDashboardStats();
        fetchAdmins();
        fetchGroups();
    }, []);

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

    // Search functionality
    useEffect(() => {
        const searchLeads = async () => {
            if (!searchQuery || searchQuery.trim().length < 2) {
                setSearchResults([]);
                setShowSearchResults(false);
                return;
            }

            setSearchLoading(true);
            try {
                const response = await axiosInstance.get(`/admin/search/leads?q=${encodeURIComponent(searchQuery.trim())}`);
                const results = response.data.data || [];
                setSearchResults(results);
                // Always show dropdown if we have results
                if (results.length > 0) {
                    setShowSearchResults(true);
                } else {
                    setShowSearchResults(false);
                }
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
                setShowSearchResults(false);
            } finally {
                setSearchLoading(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            searchLeads();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    // Close search dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const response = await axiosInstance.get('/admin/dashboard');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const res = await axiosInstance.get('/admin/admins');
            setAdmins(res.data.data || []);
        } catch (e) {
            // noop
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await axiosInstance.get('/admin/groups');
            const groupsData = res.data.data || [];
            // Convert populated members back to IDs for frontend state
            const processedGroups = groupsData.map(group => ({
                ...group,
                members: (group.members || []).map(member => member._id || member)
            }));
            setGroups(processedGroups);
        } catch (e) {
            console.error('Failed to fetch groups:', e);
        }
    };

    const onDragStart = (e, adminId) => {
        e.dataTransfer.setData('adminId', adminId);
    };

    const allowDrop = (e) => {
        e.preventDefault();
    };

    const onDropToGroup = (e, groupIndex) => {
        e.preventDefault();
        const adminId = e.dataTransfer.getData('adminId');
        if (!adminId) return;
        setGroups(prev => {
            const next = [...prev];
            // Remove from all groups first
            next.forEach(group => {
                group.members = group.members.filter(id => id !== adminId);
            });
            // Add to target group if capacity allows
            if (next[groupIndex].members.length < 2 && !next[groupIndex].members.includes(adminId)) {
                next[groupIndex].members.push(adminId);
            }
            // Auto-save after drag and drop
            autoSaveGroups(next);
            return next;
        });
    };

    const removeFromGroup = (groupIndex, adminId) => {
        setGroups(prev => {
            const next = [...prev];
            next[groupIndex].members = next[groupIndex].members.filter(id => id !== adminId);
            // Auto-save after removing member
            autoSaveGroups(next);
            return next;
        });
    };

    const updateGroupName = (groupIndex, newName) => {
        setGroups(prev => {
            const next = [...prev];
            next[groupIndex].name = newName;
            // Auto-save after name change
            autoSaveGroups(next);
            return next;
        });
    };

    const handleSearchResultClick = (lead) => {
        setSearchQuery('');
        setShowSearchResults(false);
        navigate(`/admin/leads/${lead._id}`);
    };

    const autoSaveGroups = async (updatedGroups) => {
        setSavingGroups(true);
        try {
            const cleanGroups = updatedGroups.map(g => ({
                id: g._id,
                name: g.name,
                members: (g.members || []).filter(id => admins.some(a => a._id === id))
            }));
            await axiosInstance.put('/admin/groups', { groups: cleanGroups });
        } catch (e) {
            console.error('Failed to save groups:', e);
            showError('Failed to save groups. Please try again.');
        } finally {
            setSavingGroups(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Admin Dashboard">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {notification.show && (
                        <div
                            className={`mb-4 border-l-4 p-4 rounded-r-lg ${
                                notification.type === 'success'
                                    ? 'bg-green-50 border-green-400'
                                    : notification.type === 'warning'
                                        ? 'bg-yellow-50 border-yellow-400'
                                        : 'bg-red-50 border-red-400'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <p
                                    className={`text-sm ${
                                        notification.type === 'success'
                                            ? 'text-green-700'
                                            : notification.type === 'warning'
                                                ? 'text-yellow-700'
                                                : 'text-red-700'
                                    }`}
                                >
                                    {notification.message}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setNotification({ show: false, type: 'success', message: '' })
                                    }
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
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
        <DashboardLayout title="Admin Dashboard">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                {notification.show && (
                    <div
                        className={`mb-4 border-l-4 p-4 rounded-r-lg ${
                            notification.type === 'success'
                                ? 'bg-green-50 border-green-400'
                                : notification.type === 'warning'
                                    ? 'bg-yellow-50 border-yellow-400'
                                    : 'bg-red-50 border-red-400'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <p
                                className={`text-sm ${
                                    notification.type === 'success'
                                        ? 'text-green-700'
                                        : notification.type === 'warning'
                                            ? 'text-yellow-700'
                                            : 'text-red-700'
                                }`}
                            >
                                {notification.message}
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    setNotification({ show: false, type: 'success', message: '' })
                                }
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Search Bar */}
            <div className="mb-8 relative" ref={searchRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search leads by ID, name, phone, email, vehicle make, model, VIN, etc..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                        }}
                        onFocus={() => {
                            setIsSearchFocused(true);
                            // Show dropdown if we have a valid query and results
                            if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
                                setShowSearchResults(true);
                            }
                        }}
                        onBlur={() => {
                            // Don't set focus to false immediately, let click-outside handle it
                            // This prevents dropdown from closing when clicking inside it
                            setTimeout(() => setIsSearchFocused(false), 200);
                        }}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
                    />
                    {searchLoading && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {searchQuery.trim().length >= 2 && searchResults.length > 0 && (showSearchResults || isSearchFocused) && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {searchResults.map((lead) => (
                            <div
                                key={lead._id}
                                onClick={() => handleSearchResultClick(lead)}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                                {/* Image or Placeholder */}
                                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden relative">
                                    {lead.imageUrl ? (
                                        <>
                                            <img
                                                src={lead.imageUrl}
                                                alt={`${lead.vehicleInfo?.make || ''} ${lead.vehicleInfo?.model || ''}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                                                    if (placeholder) placeholder.style.display = 'flex';
                                                }}
                                            />
                                            <div className="image-placeholder w-full h-full absolute inset-0 hidden items-center justify-center">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                </svg>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Vehicle Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-primary-600">{lead.leadId}</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                            lead.status === 'negotiation' ? 'bg-yellow-100 text-yellow-800' :
                                                lead.status === 'inspection' ? 'bg-purple-100 text-purple-800' :
                                                    lead.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        lead.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-gray-100 text-gray-800'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {lead.vehicleInfo?.make && lead.vehicleInfo?.model ? (
                                            <>
                                                {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                                                {lead.vehicleInfo.year && ` ${lead.vehicleInfo.year}`}
                                            </>
                                        ) : (
                                            <span className="text-gray-500">No vehicle info</span>
                                        )}
                                    </div>
                                    {lead.contactInfo?.name && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {lead.contactInfo.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results Message */}
                {showSearchResults && searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                        No leads found
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Managers" value={stats?.users?.totalManagers || 0} color="blue" />
                <StatCard title="Total Investors" value={stats?.users?.totalInvestors || 0} color="green" />
                <StatCard title="Total Vehicles" value={stats?.inventory?.totalVehicles || 0} color="purple" />
                <StatCard title="Total Sales" value={stats?.sales?.totalSales || 0} color="yellow" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Sales Performance</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Revenue:</span>
                            <span className="font-bold text-green-600">
                                AED {stats?.sales?.totalRevenue?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Profit:</span>
                            <span className="font-bold text-green-600">
                                AED {stats?.sales?.totalProfit?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Pending Approvals</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Purchase Orders:</span>
                            <button
                                type="button"
                                onClick={() => navigate('/purchases/inspection')}
                                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
                            >
                                {stats?.approvals?.pendingPOApprovals || 0}
                            </button>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Sales Invoices:</span>
                            <button
                                type="button"
                                onClick={() => navigate('/sales/leads')}
                                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
                            >
                                {stats?.approvals?.pendingSalesApprovals || 0}
                            </button>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Pending Dual Approval:</span>
                            <button
                                type="button"
                                onClick={() => navigate('/purchases/inspection')}
                                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
                            >
                                {stats?.approvals?.pendingDualApprovals || 0}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Investor Utilization</h3>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Credit Limit:</span>
                        <span className="font-bold">
                            AED {stats?.investors?.totalCreditLimit?.toLocaleString() || 0}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Utilized:</span>
                        <span className="font-bold">
                            AED {stats?.investors?.totalUtilized?.toLocaleString() || 0}
                        </span>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Utilization:</span>
                            <span className="font-bold">{stats?.investors?.utilizationPercentage?.toFixed(2) || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{ width: `${stats?.investors?.utilizationPercentage || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Inventory */}
            {stats?.inventory?.recentItems && stats.inventory.recentItems.length > 0 && (
                <div className="mt-8 bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b">
                        <h3 className="text-lg font-semibold">Recent Inventory</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Added</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.inventory.recentItems.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.images && item.images.length > 0 ? (
                                                    <img
                                                        src={item.images[0].url}
                                                        alt={item.vehicleDetails}
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.vehicleDetails || 'N/A'}
                                                    </div>
                                                    {item.vehicleId && (
                                                        <div className="text-xs text-gray-500">ID: {item.vehicleId}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {item.vehicleInfo ? (
                                                <div className="space-y-1">
                                                    {item.vehicleInfo.trim && (
                                                        <div className="text-xs text-gray-600">Trim: {item.vehicleInfo.trim}</div>
                                                    )}
                                                    {item.vehicleInfo.color && (
                                                        <div className="text-xs text-gray-600">Color: {item.vehicleInfo.color}</div>
                                                    )}
                                                    {item.vehicleInfo.region && (
                                                        <div className="text-xs text-gray-600">Region: {item.vehicleInfo.region}</div>
                                                    )}
                                                    {item.vehicleInfo.mileage && (
                                                        <div className="text-xs text-gray-600">Mileage: {item.vehicleInfo.mileage.toLocaleString()} km</div>
                                                    )}
                                                    {item.vehicleInfo.vin && (
                                                        <div className="text-xs text-gray-500 font-mono">VIN: {item.vehicleInfo.vin}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">No details available</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {item.investor ? (
                                                <div>
                                                    <div className="font-medium text-gray-900">{item.investor.name}</div>
                                                    <div className="text-xs text-gray-500">{item.investor.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.vehicleInfo?.purchasePrice ? (
                                                `AED ${item.vehicleInfo.purchasePrice.toLocaleString()}`
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Approval Groups (X/Y) */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Approval Groups (Dual Sign-Off)</h3>
                    {savingGroups && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            <span>Auto-saving...</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-600 mb-4">Drag admins into groups. Max 2 per group. An admin cannot be in multiple groups.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Admin Pool */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">All Admins</h4>
                        <div className="space-y-2">
                            {admins
                                .filter(a => !groups.some(g => g.members.includes(a._id)))
                                .map(admin => (
                                    <div
                                        key={admin._id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, admin._id)}
                                        className="flex items-center justify-between px-3 py-2 bg-white rounded border hover:shadow-sm cursor-move"
                                        title="Drag to a group"
                                    >
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                                            <div className="text-xs text-gray-500">{admin.email}</div>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M4 8h12v2H4V8zm0 4h12v2H4v-2z" />
                                        </svg>
                                    </div>
                                ))}
                            {admins.filter(a => !groups.some(g => g.members.includes(a._id))).length === 0 && (
                                <div className="text-xs text-gray-500">No unassigned admins</div>
                            )}
                        </div>
                    </div>

                    {/* Groups */}
                    {groups.map((group, groupIndex) => (
                        <div
                            key={group._id || groupIndex}
                            onDragOver={allowDrop}
                            onDrop={(e) => onDropToGroup(e, groupIndex)}
                            className={`rounded-lg p-4 border-2 ${group.members.length >= 2 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex-1 mr-3">
                                    <input
                                        type="text"
                                        value={group.name}
                                        onChange={(e) => updateGroupName(groupIndex, e.target.value)}
                                        className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-1.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-200 focus:outline-none transition-all hover:border-gray-400"
                                        placeholder="Enter group name"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                        {group.members.length} / 2
                                    </span>
                                    {group.members.length >= 2 && (
                                        <div className="flex items-center text-green-600">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 min-h-[48px]">
                                {group.members.map(adminId => {
                                    const admin = admins.find(a => a._id === adminId);
                                    if (!admin) {
                                        console.log('Admin not found for ID:', adminId, 'Available admins:', admins.map(a => a._id));
                                        return null;
                                    }
                                    return (
                                        <div key={adminId} className="flex items-center justify-between px-3 py-2 bg-white rounded border">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                                                <div className="text-xs text-gray-500">{admin.email}</div>
                                            </div>
                                            <button onClick={() => removeFromGroup(groupIndex, adminId)} className="text-xs text-gray-500 hover:text-gray-700">Remove</button>
                                        </div>
                                    );
                                })}
                                {group.members.length === 0 && (
                                    <div className="text-xs text-gray-500">Drag admins here</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">Approval rule: Need 1 from each group to approve a PO.</p>
            </div>
        </DashboardLayout>
    );
};

const StatCard = ({ title, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        yellow: 'bg-yellow-500',
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
                <div className={`${colorClasses[color]} p-3 rounded-lg`}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div className="ml-4">
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

