import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    contactInfo: { name: '', phone: '', email: '', passportOrEmiratesId: '' },
    vehicleInfo: { make: '', model: '', year: '', mileage: '', askingPrice: '', trim: '', color: '', region: '' },
    source: '',
    priority: ''
  });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLead();
    if (user?.role === 'admin') {
      fetchManagers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchLead = async () => {
    try {
      const response = await axiosInstance.get(`/purchases/leads/${id}`);
      const leadData = response.data.data;
      setLead(leadData);
      setNewStatus(leadData.status);
      setSelectedManager(leadData.assignedTo?._id || '');

      setEditData({
        contactInfo: {
          name: leadData.contactInfo?.name || '',
          phone: leadData.contactInfo?.phone || '',
          email: leadData.contactInfo?.email || '',
          passportOrEmiratesId: leadData.contactInfo?.passportOrEmiratesId || ''
        },
        vehicleInfo: {
          make: leadData.vehicleInfo?.make || '',
          model: leadData.vehicleInfo?.model || '',
          year: leadData.vehicleInfo?.year || new Date().getFullYear(),
          mileage: leadData.vehicleInfo?.mileage || '',
          askingPrice: leadData.vehicleInfo?.askingPrice || '',
          trim: leadData.vehicleInfo?.trim || '',
          color: leadData.vehicleInfo?.color || '',
          region: leadData.vehicleInfo?.region || ''
        },
        source: leadData.source || 'website',
        priority: leadData.priority || 'medium'
      });

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await axiosInstance.get('/admin/managers');
      setManagers(response.data.data.filter(m => m.status === 'active'));
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await axiosInstance.put(`/purchases/leads/${id}/status`, {
        status: newStatus,
        notes
      });
      alert('Lead status updated!');
      setNotes('');
      fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!notes.trim()) {
      alert('Please enter a note');
      return;
    }

    try {
      await axiosInstance.put(`/purchases/leads/${id}/status`, {
        status: lead.status,
        notes: notes.trim()
      });
      alert('Note added successfully!');
      setNotes('');
      fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add note');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await axiosInstance.put(`/purchases/leads/${id}`, editData);

      if (user?.role === 'admin' && selectedManager !== (lead?.assignedTo?._id || '')) {
        await axiosInstance.put(`/purchases/leads/${id}/assign`, {
          assignedTo: selectedManager || null
        });
      }

      alert('Lead updated successfully!');
      setEditMode(false);
      fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update lead');
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({
      contactInfo: {
        name: lead.contactInfo?.name || '',
        phone: lead.contactInfo?.phone || '',
        email: lead.contactInfo?.email || '',
        passportOrEmiratesId: lead.contactInfo?.passportOrEmiratesId || ''
      },
      vehicleInfo: {
        make: lead.vehicleInfo?.make || '',
        model: lead.vehicleInfo?.model || '',
        year: lead.vehicleInfo?.year || new Date().getFullYear(),
        mileage: lead.vehicleInfo?.mileage || '',
        askingPrice: lead.vehicleInfo?.askingPrice || '',
        trim: lead.vehicleInfo?.trim || '',
        color: lead.vehicleInfo?.color || '',
        region: lead.vehicleInfo?.region || ''
      },
      source: lead.source || 'website',
      priority: lead.priority || 'medium'
    });
    setSelectedManager(lead.assignedTo?._id || '');
  };

  const canEdit = () => {
    if (user?.role === 'manager' && lead?.status === 'new') return true;
    if (user?.role === 'admin') return true;
    return false;
  };

  const canEditNote = (note) => {
    const userId = user?.id || user?._id;
    const noteAuthorId = note.addedBy?._id || note.addedBy?.id || note.addedBy;
    if (userId && noteAuthorId) {
      return userId.toString() === noteAuthorId.toString();
    }
    return false;
  };

  const canDeleteNote = (note) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'manager') {
      const userId = user?.id || user?._id;
      const noteAuthorId = note.addedBy?._id || note.addedBy?.id || note.addedBy;
      if (userId && noteAuthorId) {
        return userId.toString() === noteAuthorId.toString();
      }
    }
    return false;
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note._id);
    setEditingNoteContent(note.content);
  };

  const handleSaveNoteEdit = async (noteId) => {
    if (!editingNoteContent.trim()) {
      alert('Note content cannot be empty');
      return;
    }

    try {
      await axiosInstance.put(`/purchases/leads/${id}/notes/${noteId}`, {
        content: editingNoteContent.trim()
      });
      alert('Note updated successfully!');
      setEditingNoteId(null);
      setEditingNoteContent('');
      fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update note');
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = (noteId) => {
    setDeletingNoteId(noteId);
    setShowDeleteModal(true);
  };

  const confirmDeleteNote = async () => {
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/purchases/leads/${id}/notes/${deletingNoteId}`);
      setShowDeleteModal(false);
      setDeletingNoteId(null);
      fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteNote = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setDeletingNoteId(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-indigo-100 text-indigo-800',
      qualified: 'bg-cyan-100 text-cyan-800',
      negotiation: 'bg-yellow-100 text-yellow-800',
      inspection: 'bg-purple-100 text-purple-800',
      under_review: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      converted: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  if (loading) {
    return (
      <DashboardLayout title="Lead Detail">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Lead Detail">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Lead ${lead?.leadId}`}>
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/purchases/leads')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Leads
          </button>

          {canEdit() && lead?.status === 'new' && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg transition-all ${editMode
                ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                : 'border-transparent bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {editMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                )}
              </svg>
              {editMode ? 'Cancel' : 'Edit Lead'}
            </button>
          )}
        </div>

        {/* Lead Header Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{lead?.leadId}</h1>
              <p className="text-primary-100 text-sm">
                {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} {lead?.vehicleInfo?.year}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead?.status)} bg-white`}>
                  {lead?.status}
                </span>
              </div>
              <div className="mt-2 text-sm text-primary-100">
                Created {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {user?.role === 'manager' && lead?.status !== 'new' && !editMode && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                You can only edit leads when status is "new". This lead is currently "{lead?.status}".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Details
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Activity & Notes
                    {lead?.notes && lead.notes.length > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                        {lead.notes.length}
                      </span>
                    )}
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                    </div>

                    {editMode ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editData.contactInfo.name}
                            onChange={(e) => setEditData({
                              ...editData,
                              contactInfo: { ...editData.contactInfo, name: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="e.g., Ahmed Khan"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={editData.contactInfo.phone}
                            onChange={(e) => setEditData({
                              ...editData,
                              contactInfo: { ...editData.contactInfo, phone: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="+971 5X XXX XXXX"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Passport No. / Emirates ID</label>
                          <input
                            type="text"
                            value={editData.contactInfo.passportOrEmiratesId || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              contactInfo: { ...editData.contactInfo, passportOrEmiratesId: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Enter EID or Passport No."
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editData.contactInfo.email}
                            onChange={(e) => setEditData({
                              ...editData,
                              contactInfo: { ...editData.contactInfo, email: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name</div>
                          <div className="text-sm font-semibold text-gray-900">{lead?.contactInfo.name}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</div>
                          <div className="text-sm font-semibold text-gray-900">{lead?.contactInfo.phone || 'Not provided'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</div>
                          <div className="text-sm font-semibold text-gray-900 break-all">{lead?.contactInfo.email || 'Not provided'}</div>
                        </div>
                        {lead?.contactInfo?.passportOrEmiratesId && (
                          <div className="bg-gray-50 rounded-lg p-4 md:col-span-3">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Passport No. / Emirates ID</div>
                            <div className="text-sm font-semibold text-gray-900 break-all">{lead.contactInfo.passportOrEmiratesId}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vehicle Information */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                    </div>

                    {editMode ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Make <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editData.vehicleInfo.make}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, make: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Toyota"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editData.vehicleInfo.model}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, model: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Camry"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Year <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            value={editData.vehicleInfo.year}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, year: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            placeholder={new Date().getFullYear().toString()}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mileage (km) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            value={editData.vehicleInfo.mileage}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, mileage: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="50,000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
                          <input
                            type="text"
                            value={editData.vehicleInfo.trim}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, trim: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="e.g., XLE"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                          <input
                            type="text"
                            value={editData.vehicleInfo.color}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, color: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="e.g., White"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                          <input
                            type="text"
                            value={editData.vehicleInfo.region}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, region: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="e.g., GCC"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Asking Price (AED) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            value={editData.vehicleInfo.askingPrice}
                            onChange={(e) => setEditData({
                              ...editData,
                              vehicleInfo: { ...editData.vehicleInfo, askingPrice: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="75,000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Source <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={editData.source}
                            onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="website">Website</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="walk-in">Walk-in</option>
                            <option value="referral">Referral</option>
                            <option value="social-media">Social Media</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={editData.priority}
                            onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        {user?.role === 'admin' && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Assigned To Manager
                            </label>
                            <select
                              value={selectedManager}
                              onChange={(e) => setSelectedManager(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Unassigned</option>
                              {managers.map((manager) => (
                                <option key={manager._id} value={manager._id}>
                                  {manager.name} ({manager.email})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Make</div>
                          <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.make || 'N/A'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Model</div>
                          <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.model || 'N/A'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Year</div>
                          <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.year || 'N/A'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                          <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Mileage</div>
                          <div className="text-sm font-bold text-gray-900">
                            {lead?.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Trim</div>
                          <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.trim || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Color</div>
                          <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.color || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Region</div>
                          <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.region || 'N/A'}</div>
                        </div>
                        {lead?.vehicleInfo?.vin && (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 md:col-span-2">
                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">VIN</div>
                            <div className="text-sm font-mono text-gray-900">{lead.vehicleInfo.vin}</div>
                          </div>
                        )}
                        <div className="md:col-span-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                          <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Asking Price</div>
                          <div className="text-xl font-bold text-green-700">
                            {lead?.vehicleInfo?.askingPrice ? `AED ${lead.vehicleInfo.askingPrice.toLocaleString()}` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Information */}
                  {!editMode && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900">Lead Metadata</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Lead ID</div>
                          <div className="text-sm font-medium text-gray-900">{lead?.leadId}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Type</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{lead?.type}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead?.status)}`}>
                            {lead?.status}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Source</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{lead?.source}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Priority</div>
                          <div className={`text-sm font-bold capitalize ${getPriorityColor(lead?.priority)}`}>
                            {lead?.priority}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead?.createdBy?.name || 'N/A'}
                          </div>
                        </div>
                        {user?.role === 'admin' && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 mb-1">Assigned To</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead?.assignedTo?.name || 'Unassigned'}
                            </div>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Created</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Sticky Actions */}
                  {editMode && (
                    <div className="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-gray-200 py-4 mt-2">
                      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 px-2">
                        <button
                          onClick={handleSaveEdit}
                          className="sm:flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm transition-all"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="sm:w-40 inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-sm transition-all"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-6">
                  {/* Activity Timeline */}
                  {lead?.notes && lead.notes.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                      <div className="space-y-4">
                        {lead.notes.map((note, index) => (
                          <div key={note._id} className="relative">
                            {index !== lead.notes.length - 1 && (
                              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                            )}
                            <div className="flex gap-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              </div>
                              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                {editingNoteId === note._id ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={editingNoteContent}
                                      onChange={(e) => setEditingNoteContent(e.target.value)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                      rows="3"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSaveNoteEdit(note._id)}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-green-600 hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={handleCancelNoteEdit}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                          {note.addedBy?.name || 'Unknown'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(note.addedAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex gap-1">
                                        {canEditNote(note) && (
                                          <button
                                            onClick={() => handleEditNote(note)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        )}
                                        {canDeleteNote(note) && (
                                          <button
                                            onClick={() => handleDeleteNote(note._id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                    {note.editedAt && (
                                      <div className="mt-2 text-xs text-gray-500 italic">
                                        Edited {new Date(note.editedAt).toLocaleString()}
                                        {note.editedBy?.name && ` by ${note.editedBy.name}`}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p className="text-gray-500 text-sm">No activity yet. Add a note to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {user?.role === 'admin' && !editMode && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add Note (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows="3"
                    placeholder="Add a note about this status change..."
                  />
                </div>
                <button
                  onClick={handleStatusUpdate}
                  disabled={newStatus === lead?.status}
                  className={`w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all ${newStatus === lead?.status
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md'
                    }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Update Status
                </button>
              </div>
            </div>
          )}

          {/* Add Note Card - Manager */}
          {user?.role === 'manager' && !editMode && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Add Note</h3>
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows="4"
                  placeholder="Add a note about this lead..."
                />
                <button
                  onClick={handleAddNote}
                  disabled={!notes.trim()}
                  className={`w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all ${notes.trim()
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Note
                </button>
              </div>
            </div>
          )}

          {/* Lead Summary Card removed; information moved under Lead Metadata */}

          {/* Next Steps Card */}
          {lead?.status === 'new' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Next Steps</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Contact the customer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Verify vehicle details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Move to negotiation when ready</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={cancelDeleteNote}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Delete Note</h3>
                {!isDeleting && (
                  <button
                    onClick={cancelDeleteNote}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl">
              <button
                onClick={cancelDeleteNote}
                disabled={isDeleting}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDeleting
                  ? 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNote}
                disabled={isDeleting}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDeleting
                  ? 'bg-red-400 text-white cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin inline-block -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default LeadDetail;
