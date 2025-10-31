import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';

const CreateTicket = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'customer_query',
    priority: 'medium',
    subject: '',
    description: '',
    customerInfo: {
      name: '',
      phone: '',
      email: ''
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axiosInstance.post('/csa/ticket', formData);
      alert('Ticket created successfully!');
      navigate('/csa/tickets');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Create CSA Ticket">
      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="customer_query">Customer Query</option>
                  <option value="vehicle_issue">Vehicle Issue</option>
                  <option value="document_request">Document Request</option>
                  <option value="complaint">Complaint</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows="4"
              placeholder="Detailed description of the issue"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.customerInfo.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerInfo: { ...formData.customerInfo, name: e.target.value }
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.customerInfo.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerInfo: { ...formData.customerInfo, phone: e.target.value }
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.customerInfo.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerInfo: { ...formData.customerInfo, email: e.target.value }
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/csa/tickets')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateTicket;
