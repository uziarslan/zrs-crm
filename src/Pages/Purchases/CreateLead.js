import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const CreateLead = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    type: 'purchase', // Required by backend validation
    source: 'website',
    contactInfo: {
      name: '',
      phone: '',
      email: '',
      passportOrEmiratesId: ''
    },
    vehicleInfo: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      mileage: '',
      color: '',
      trim: '',
      region: '',
      askingPrice: ''
    },
    priority: 'medium',
    assignedTo: '' // For admin assignment
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchManagers();
    }
  }, [user]);

  const fetchManagers = async () => {
    try {
      const response = await axiosInstance.get('/admin/managers');
      setManagers(response.data.data.filter(m => m.status === 'active'));
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Remove assignedTo if empty (let backend handle auto-assignment)
      const submitData = { ...formData };
      if (!submitData.assignedTo) {
        delete submitData.assignedTo;
      }

      await axiosInstance.post('/purchases/leads', submitData);
      alert('Lead created successfully!');
      navigate('/purchases/leads');
    } catch (err) {
      // Show detailed validation errors if available
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(e => e.msg || e).join('\n');
        alert(`Validation errors:\n${errorMessages}`);
      } else {
        alert(err.response?.data?.message || 'Failed to create lead');
      }
      console.error('Create lead error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white shadow">
          <h1 className="text-2xl font-bold">Create New Purchase Lead</h1>
          <p className="text-primary-100 mt-1 text-sm">Provide customer and vehicle details to register a new lead.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border border-gray-200 p-6">
          {/* Contact Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactInfo.name}
                  onChange={(e) => handleChange('contactInfo', 'name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Ahmed Khan"
                />
                <p className="text-xs text-gray-500 mt-1">Person we will communicate with</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.contactInfo.phone}
                  onChange={(e) => handleChange('contactInfo', 'phone', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+971 5X XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport No. / Emirates ID</label>
                <input
                  type="text"
                  value={formData.contactInfo.passportOrEmiratesId}
                  onChange={(e) => handleChange('contactInfo', 'passportOrEmiratesId', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter EID or Passport No."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => handleChange('contactInfo', 'email', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l4-4 4 4m0 0l4-4 4 4M4 7h16" /></svg>
              </span>
              Vehicle Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make *</label>
                <input
                  type="text"
                  required
                  value={formData.vehicleInfo.make}
                  onChange={(e) => handleChange('vehicleInfo', 'make', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Toyota"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                <input
                  type="text"
                  required
                  value={formData.vehicleInfo.model}
                  onChange={(e) => handleChange('vehicleInfo', 'model', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Camry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                <input
                  type="number"
                  required
                  value={formData.vehicleInfo.year}
                  onChange={(e) => handleChange('vehicleInfo', 'year', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mileage (km) *</label>
                <input
                  type="number"
                  required
                  value={formData.vehicleInfo.mileage}
                  onChange={(e) => handleChange('vehicleInfo', 'mileage', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="50,000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <input
                  type="text"
                  value={formData.vehicleInfo.color}
                  onChange={(e) => handleChange('vehicleInfo', 'color', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Black, White, Silver"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trim</label>
                <input
                  type="text"
                  value={formData.vehicleInfo.trim}
                  onChange={(e) => handleChange('vehicleInfo', 'trim', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., SE, LE, XLE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                <input
                  type="text"
                  value={formData.vehicleInfo.region}
                  onChange={(e) => handleChange('vehicleInfo', 'region', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Dubai, Abu Dhabi"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Asking Price (AED) *</label>
                <input
                  type="number"
                  required
                  value={formData.vehicleInfo.askingPrice}
                  onChange={(e) => handleChange('vehicleInfo', 'askingPrice', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="75,000"
                />
                <p className="text-xs text-gray-500 mt-1">Requested purchase price for this vehicle</p>
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M4 7h16M4 17h16" /></svg>
              </span>
              Lead Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
                <select
                  value={formData.source}
                  onChange={(e) => handleChange(null, 'source', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange(null, 'priority', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              {user?.role === 'admin' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To Manager (Optional)
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => handleChange(null, 'assignedTo', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Leave Unassigned</option>
                    {managers.map((manager) => (
                      <option key={manager._id} value={manager._id}>
                        {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Leave unassigned to keep it visible for all managers.</p>
                </div>
              )}
            </div>
          </div>
          {/* Sticky Actions */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t border-gray-200 py-4 mt-2">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 px-2">
              <button
                type="submit"
                disabled={loading}
                className="sm:flex-1 inline-flex justify-center items-center bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Creating...</span>
                ) : 'Create Lead'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/purchases/leads')}
                className="sm:w-40 inline-flex justify-center items-center bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateLead;
