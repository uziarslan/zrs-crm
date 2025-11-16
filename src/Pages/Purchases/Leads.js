import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const PurchaseLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [parsedLeads, setParsedLeads] = useState([]);
  const [bulkAssignAll, setBulkAssignAll] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    setShowBulkBar(selectedLeads.length > 0);
  }, [selectedLeads]);

  const [managers, setManagers] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchManagers();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.relative')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const fetchManagers = async () => {
    try {
      const response = await axiosInstance.get('/admin/managers');
      setManagers(response.data.data.filter(m => m.status === 'active'));
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);

      const response = await axiosInstance.get(`/purchases/leads?${params}`);

      // Only show leads with status: new or cancelled
      const filteredLeads = response.data.data.filter(lead =>
        ['new', 'cancelled'].includes(lead.status)
      );

      // Apply status filter if selected
      const finalLeads = filters.status
        ? filteredLeads.filter(lead => lead.status === filters.status)
        : filteredLeads;

      setLeads(finalLeads);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const exportLeads = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'purchase');
      // Export both 'new' and 'cancelled' leads (matching what's displayed on the page)
      // If a specific status filter is selected, export only that status
      if (filters.status) {
        params.append('status', filters.status);
      } else {
        // Export both statuses that are shown on this page
        params.append('status', 'new,cancelled');
      }

      const response = await axiosInstance.get(`/export/leads?${params}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchase_leads_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setNotification({ show: true, message: 'Failed to export leads', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(leads.map(lead => lead._id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) {
      setNotification({ show: true, message: 'Please select a status', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      return;
    }

    if (selectedLeads.length === 0) {
      setNotification({ show: true, message: 'Please select at least one lead', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      return;
    }

    try {
      await axiosInstance.put('/purchases/leads/bulk-status', {
        leadIds: selectedLeads,
        status: bulkStatus
      });

      setNotification({ show: true, message: `Successfully updated ${selectedLeads.length} lead(s)`, type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      setSelectedLeads([]);
      setBulkStatus('');
      fetchLeads();
    } catch (err) {
      setNotification({ show: true, message: err.response?.data?.message || 'Failed to bulk update', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityIcon = (priority) => {
    const colors = {
      urgent: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-blue-600',
      low: 'text-gray-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const downloadSampleCSV = () => {
    // Format phone number with a leading tab to force Excel to treat it as text
    // This prevents Excel from converting long numbers to scientific notation
    // Headers are capitalized with proper spacing
    const headers = ['Full Name', '\tPhone', 'Make', 'Model', 'Year', 'Mileage', 'Color', 'Trim', 'Region', 'Asking Price', 'Source', 'Priority'];
    // Only include headers, no dummy data row
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase_leads_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDropdown(false);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Simple CSV parser that handles quoted values
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerLine = parseCSVLine(lines[0]);
    // Normalize headers: remove tabs and convert to lowercase for matching
    // Handle both "Full Name" and "Fullname" variations
    const headers = headerLine.map(h => {
      let normalized = h.replace(/^\t+/, '').trim().toLowerCase();
      // Normalize variations: "full name" -> "fullname", "asking price" -> "asking price"
      normalized = normalized.replace(/\s+/g, ' ');
      return normalized;
    });

    // Expected headers in normalized form (lowercase, spaces preserved for multi-word)
    const expectedHeaders = ['full name', 'phone', 'make', 'model', 'year', 'mileage', 'color', 'trim', 'region', 'asking price', 'source', 'priority'];

    // Validate headers (check normalized versions)
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const leads = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows

      const getValue = (headerName) => {
        // Normalize header name for matching (handle "full name" vs "fullname")
        const normalizedHeaderName = headerName.toLowerCase().replace(/\s+/g, ' ');
        const index = headers.indexOf(normalizedHeaderName);
        if (index >= 0 && index < values.length) {
          let value = values[index];
          // Remove leading tab character if present (used to force Excel text format)
          if (value && value.startsWith('\t')) {
            value = value.substring(1);
          }
          // For phone numbers, ensure it's treated as string and remove any scientific notation
          if (normalizedHeaderName === 'phone' && value) {
            // If value looks like scientific notation, try to convert it back
            if (value.includes('E+') || value.includes('e+')) {
              const num = parseFloat(value);
              if (!isNaN(num)) {
                value = num.toFixed(0); // Convert back to full number without decimals
              }
            }
          }
          return value || '';
        }
        return '';
      };

      const leadData = {
        contactInfo: {
          name: getValue('full name') || '',
          phone: getValue('phone') || ''
        },
        vehicleInfo: {
          make: getValue('make') || '',
          model: getValue('model') || '',
          year: parseInt(getValue('year')) || new Date().getFullYear(),
          mileage: parseInt(getValue('mileage')) || 0,
          color: getValue('color') || '',
          trim: getValue('trim') || '',
          region: getValue('region') || '',
          askingPrice: parseFloat(getValue('asking price')) || 0
        },
        source: getValue('source') || 'website',
        priority: getValue('priority') || 'medium',
        assignedTo: '' // Will be set in modal
      };

      // Validate required fields
      if (!leadData.contactInfo.name || !leadData.vehicleInfo.make || !leadData.vehicleInfo.model) {
        continue; // Skip invalid rows
      }

      leads.push(leadData);
    }

    return leads;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setNotification({ show: true, message: 'Please upload a CSV file', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        setNotification({ show: true, message: 'No valid leads found in CSV file', type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
        return;
      }

      setParsedLeads(parsed);
      setShowBulkUploadModal(true);
      setBulkAssignAll('');
    } catch (err) {
      setNotification({ show: true, message: err.message || 'Failed to parse CSV file', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkAssignChange = (index, managerId) => {
    const updated = [...parsedLeads];
    updated[index].assignedTo = managerId;
    setParsedLeads(updated);
  };

  const applyBulkAssign = () => {
    if (!bulkAssignAll) return;
    const updated = parsedLeads.map(lead => ({
      ...lead,
      assignedTo: bulkAssignAll
    }));
    setParsedLeads(updated);
  };

  const handleBulkUploadSubmit = async () => {
    if (parsedLeads.length === 0) {
      setNotification({ show: true, message: 'No leads to upload', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      return;
    }

    setUploading(true);
    try {
      // Prepare data for backend
      const leadsData = parsedLeads.map(lead => ({
        type: 'purchase',
        source: lead.source,
        contactInfo: lead.contactInfo,
        vehicleInfo: lead.vehicleInfo,
        priority: lead.priority,
        assignedTo: lead.assignedTo || undefined
      }));

      const response = await axiosInstance.post('/purchases/leads/bulk', { leads: leadsData });

      const { stats } = response.data;
      let message = `Successfully created ${stats.created} lead(s)`;
      if (stats.failed > 0) {
        message += `. ${stats.failed} lead(s) failed to create.`;
      }

      setNotification({ show: true, message, type: stats.failed > 0 ? 'warning' : 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      setShowBulkUploadModal(false);
      setParsedLeads([]);
      setBulkAssignAll('');
      fetchLeads();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload leads';
      setNotification({ show: true, message: errorMessage, type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Purchase Leads">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Leads</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage new leads and cancelled opportunities
            </p>
          </div>
          <Link
            to="/purchases/leads/create"
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Lead
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">New Leads</p>
                <p className="text-2xl font-bold text-blue-900">
                  {leads.filter(l => l.status === 'new').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Cancel</p>
                <p className="text-2xl font-bold text-red-900">
                  {leads.filter(l => l.status === 'cancelled').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
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

      {notification.show && (
        <div className={`mb-4 border-l-4 p-4 rounded-r-lg ${notification.type === 'success' ? 'bg-green-50 border-green-400' :
            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
              'bg-red-50 border-red-400'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : notification.type === 'warning' ? (
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className={`ml-3 text-sm ${notification.type === 'success' ? 'text-green-700' :
                  notification.type === 'warning' ? 'text-yellow-700' :
                    'text-red-700'
                }`}>{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {showBulkBar && user?.role === 'admin' && (
        <div className="mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border-l-4 border-primary-600 rounded-r-lg shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg shadow">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedLeads.length} Lead{selectedLeads.length !== 1 ? 's' : ''} Selected
                    </div>
                    <div className="text-xs text-gray-500">Ready for bulk action</div>
                  </div>
                </div>

                <div className="h-12 w-px bg-gray-300"></div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Change Status:</label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                  >
                    <option value="">Choose...</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="cancelled">Cancel</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                  className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg shadow-md transition-all ${bulkStatus
                    ? 'text-white bg-primary-600 hover:bg-primary-700 hover:shadow-lg'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                    }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply
                </button>
                <button
                  onClick={() => setSelectedLeads([])}
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
            placeholder="Search by name, phone, vehicle..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="cancelled">Cancel</option>
        </select>
        {user?.role === 'admin' && (
          <div className="relative">
            <div className="inline-flex rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-green-600 text-white font-medium rounded-l-lg hover:bg-green-700 transition-all border-r border-green-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Import
              </button>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center justify-center px-3 py-2.5 bg-green-600 text-white font-medium rounded-r-lg hover:bg-green-700 transition-all"
              >
                <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={downloadSampleCSV}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Sample CSV
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
        <button
          onClick={exportLeads}
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
                {user?.role === 'admin' && (
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                  {user?.role === 'admin' && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => handleSelectLead(lead._id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary-600">{lead.leadId}</span>
                      <span className="text-xs text-gray-500 capitalize">({lead.source})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{lead.contactInfo.name}</div>
                      <div className="text-xs text-gray-500">{lead.contactInfo.phone}</div>
                    </div>
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
                      <span className="text-sm text-gray-400">Not specified</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.vehicleInfo?.askingPrice ? (
                      <div className="text-sm font-semibold text-gray-900">
                        AED {lead.vehicleInfo.askingPrice.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <svg className={`w-4 h-4 ${getPriorityIcon(lead.priority)}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-xs font-medium capitalize ${getPriorityIcon(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      to={`/purchases/leads/${lead._id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      View
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leads.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {filters.search || filters.status ? 'Try adjusting your filters' : 'Create your first lead to get started'}
            </p>
            {!filters.search && !filters.status && (
              <Link
                to="/purchases/leads/create"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Lead
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Review and assign managers to {parsedLeads.length} lead(s) before submitting
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setParsedLeads([]);
                  setBulkAssignAll('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bulk Assign Section */}
            {user?.role === 'admin' && managers.length > 0 && (
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Assign All Leads To:
                  </label>
                  <select
                    value={bulkAssignAll}
                    onChange={(e) => setBulkAssignAll(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Leave Unassigned</option>
                    {managers.map((manager) => (
                      <option key={manager._id} value={manager._id}>
                        {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={applyBulkAssign}
                    disabled={!bulkAssignAll}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${bulkAssignAll
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    Apply to All
                  </button>
                </div>
              </div>
            )}

            {/* Table Container */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Mileage
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Asking Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Priority
                      </th>
                      {user?.role === 'admin' && managers.length > 0 && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Assign To
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedLeads.map((lead, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lead.contactInfo.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {lead.contactInfo.phone || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {lead.vehicleInfo.year}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {lead.vehicleInfo.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {lead.vehicleInfo.askingPrice ? `AED ${lead.vehicleInfo.askingPrice.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {lead.source}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {lead.priority}
                        </td>
                        {user?.role === 'admin' && managers.length > 0 && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={lead.assignedTo || ''}
                              onChange={(e) => handleBulkAssignChange(index, e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Unassigned</option>
                              {managers.map((manager) => (
                                <option key={manager._id} value={manager._id}>
                                  {manager.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{parsedLeads.length}</span> lead(s) ready to upload
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setParsedLeads([]);
                    setBulkAssignAll('');
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUploadSubmit}
                  disabled={uploading || parsedLeads.length === 0}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${uploading || parsedLeads.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                >
                  {uploading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    `Submit ${parsedLeads.length} Lead(s)`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PurchaseLeads;
