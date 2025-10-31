import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';

const CreateSale = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Create Sale">
      <button
        onClick={() => navigate('/sales/leads')}
        className="mb-4 text-primary-600 hover:text-primary-700 text-sm"
      >
        ← Back to Sales
      </button>

      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Create sale form - Select vehicle, enter customer info, selling price</p>
      </div>
    </DashboardLayout>
  );
};

export default CreateSale;
