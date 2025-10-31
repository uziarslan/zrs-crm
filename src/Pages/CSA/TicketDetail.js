import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';

const TicketDetail = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Ticket Detail">
      <button
        onClick={() => navigate('/csa/tickets')}
        className="mb-4 text-primary-600 hover:text-primary-700 text-sm"
      >
        ← Back to Tickets
      </button>

      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Ticket detail page - Show ticket info, responses, and actions</p>
      </div>
    </DashboardLayout>
  );
};

export default TicketDetail;
