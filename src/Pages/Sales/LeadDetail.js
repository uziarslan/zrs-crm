import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';

const SalesLeadDetail = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Sales Lead Detail">
      <button
        onClick={() => navigate('/sales/leads')}
        className="mb-4 text-primary-600 hover:text-primary-700 text-sm"
      >
        ← Back to Sales Leads
      </button>

      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Sales lead detail page - Expand with full lead information, follow-ups, and actions</p>
      </div>
    </DashboardLayout>
  );
};

export default SalesLeadDetail;
