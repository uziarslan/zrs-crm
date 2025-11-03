import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import PrivateRoute from './Components/Auth/PrivateRoute';

// Pages
import Login from './Pages/Auth/Login';
import RequestOTP from './Pages/Auth/RequestOTP';
import VerifyOTP from './Pages/Auth/VerifyOTP';
import AcceptInvite from './Pages/Auth/AcceptInvite';

// Admin Pages
import AdminDashboard from './Pages/Admin/Dashboard';
import AdminManagers from './Pages/Admin/Managers';
import AdminInvestors from './Pages/Admin/Investors';
import AdminLeadDetail from './Pages/Admin/LeadDetail';
import AuditLogs from './Pages/Admin/AuditLogs';

// Manager Pages
import ManagerDashboard from './Pages/Manager/Dashboard';

// Purchase Pages
import PurchaseLeads from './Pages/Purchases/Leads';
import Negotiation from './Pages/Purchases/Negotiation';
import NegotiationDetail from './Pages/Purchases/NegotiationDetail';
import Inspection from './Pages/Purchases/Inspection';
import InspectionDetail from './Pages/Purchases/InspectionDetail';
import LeadDetail from './Pages/Purchases/LeadDetail';
import CreateLead from './Pages/Purchases/CreateLead';
import Inventory from './Pages/Purchases/Inventory';
import InventoryDetail from './Pages/Purchases/InventoryDetail';
import PurchaseOrders from './Pages/Purchases/PurchaseOrders';

// Sales Pages
import SalesLeads from './Pages/Sales/Leads';
import SalesLeadDetail from './Pages/Sales/LeadDetail';
import CreateSale from './Pages/Sales/CreateSale';
import SalesReport from './Pages/Sales/Report';

// Investor Pages
import InvestorDashboard from './Pages/Investor/Dashboard';
import InvestorSOA from './Pages/Investor/SOA';
import InvestorInventory from './Pages/Investor/Inventory';

// CSA Pages
import CSADashboard from './Pages/CSA/Dashboard';
import CSATickets from './Pages/CSA/Tickets';
import TicketDetail from './Pages/CSA/TicketDetail';
import CreateTicket from './Pages/CSA/CreateTicket';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/request-otp" element={<RequestOTP />} />
                    <Route path="/verify-otp" element={<VerifyOTP />} />
                    <Route path="/invite/:token" element={<AcceptInvite />} />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/dashboard"
                        element={
                            <PrivateRoute roles={['admin']}>
                                <AdminDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin/managers"
                        element={
                            <PrivateRoute roles={['admin']}>
                                <AdminManagers />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin/investors"
                        element={
                            <PrivateRoute roles={['admin']}>
                                <AdminInvestors />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin/audit-logs"
                        element={
                            <PrivateRoute roles={['admin']}>
                                <AuditLogs />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin/leads/:id"
                        element={
                            <PrivateRoute roles={['admin']}>
                                <AdminLeadDetail />
                            </PrivateRoute>
                        }
                    />

                    {/* Manager Routes */}
                    <Route
                        path="/manager/dashboard"
                        element={
                            <PrivateRoute roles={['manager']}>
                                <ManagerDashboard />
                            </PrivateRoute>
                        }
                    />

                    {/* Purchase Routes */}
                    <Route
                        path="/purchases/leads"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <PurchaseLeads />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/negotiation"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <Negotiation />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/negotiation/:id"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <NegotiationDetail />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/inspection"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <Inspection />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/inspection/:id"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <InspectionDetail />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/leads/create"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <CreateLead />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/leads/:id"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <LeadDetail />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/inventory"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <Inventory />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/inventory/:id"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <InventoryDetail />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/purchases/po"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <PurchaseOrders />
                            </PrivateRoute>
                        }
                    />

                    {/* Sales Routes */}
                    <Route
                        path="/sales/leads"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <SalesLeads />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/sales/leads/:id"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <SalesLeadDetail />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/sales/create"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <CreateSale />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/sales/report"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <SalesReport />
                            </PrivateRoute>
                        }
                    />

                    {/* Investor Routes */}
                    <Route
                        path="/investor/dashboard"
                        element={
                            <PrivateRoute roles={['investor']}>
                                <InvestorDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/investor/soa"
                        element={
                            <PrivateRoute roles={['investor']}>
                                <InvestorSOA />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/investor/inventory"
                        element={
                            <PrivateRoute roles={['investor']}>
                                <InvestorInventory />
                            </PrivateRoute>
                        }
                    />

                    {/* CSA Routes */}
                    <Route
                        path="/csa/dashboard"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <CSADashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/csa/tickets"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <CSATickets />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/csa/tickets/create"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <CreateTicket />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/csa/tickets/:id"
                        element={
                            <PrivateRoute roles={['admin', 'manager']}>
                                <TicketDetail />
                            </PrivateRoute>
                        }
                    />

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;

