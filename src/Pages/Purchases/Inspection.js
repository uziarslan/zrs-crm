import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';

const Inspection = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '' });
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [bulkStatus, setBulkStatus] = useState('');
    const [showBulkBar, setShowBulkBar] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [leadToPurchase, setLeadToPurchase] = useState(null);
    const [showDocumentWarningModal, setShowDocumentWarningModal] = useState(false);
    const [leadsWithoutDocs, setLeadsWithoutDocs] = useState([]);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showBulkInvoiceModal, setShowBulkInvoiceModal] = useState(false);
    const [invoicePaymentDetails, setInvoicePaymentDetails] = useState({
        paymentReceivedBy: ''
    });
    const [perInvestorPayments, setPerInvestorPayments] = useState({});
    const [leadInvoiceData, setLeadInvoiceData] = useState({});
    const [isBulkPurchasing, setIsBulkPurchasing] = useState(false);
    const [admins, setAdmins] = useState([]);
    const [investors, setInvestors] = useState([]);

    useEffect(() => {
        fetchLeads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        setShowBulkBar(selectedLeads.length > 0);
    }, [selectedLeads]);

    useEffect(() => {
        // Load admins list for invoice payment received by dropdown
        const loadAdminsAndInvestors = async () => {
            try {
                if (user?.role === 'admin') {
                    const [adminRes, investorRes] = await Promise.all([
                        axiosInstance.get('/admin/admins'),
                        axiosInstance.get('/purchases/investors')
                    ]);
                    setAdmins(adminRes.data.data || []);
                    setInvestors(investorRes.data.data || []);
                }
            } catch (e) {
                // silent fail
            }
        };
        loadAdminsAndInvestors();
    }, [user]);

    useEffect(() => {
        if (user?.role !== 'admin') {
            const loadInvestorsForManagers = async () => {
                try {
                    const res = await axiosInstance.get('/purchases/investors');
                    setInvestors(res.data.data || []);
                } catch (e) {
                    // silent fail
                }
            };
            loadInvestorsForManagers();
        }
    }, [user]);

    useEffect(() => {
        if (!showInvoiceModal) {
            setPerInvestorPayments({});
        }
    }, [showInvoiceModal]);

    const fetchLeads = async () => {
        try {
            const params = new URLSearchParams();
            params.append('status', 'inspection');
            if (filters.search) params.append('search', filters.search);

            const response = await axiosInstance.get(`/purchases/leads?${params}`);
            setLeads(response.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch inspection leads');
        } finally {
            setLoading(false);
        }
    };

    const exportLeads = async () => {
        try {
            const params = new URLSearchParams();
            params.append('type', 'purchase');
            params.append('status', 'inspection');

            const response = await axiosInstance.get(`/export/leads?${params}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inspection_leads_${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Failed to export leads');
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
            alert('Please select a status');
            return;
        }

        if (selectedLeads.length === 0) {
            alert('Please select at least one lead');
            return;
        }

        // If status is inventory, show bulk invoice modal
        if (bulkStatus === 'inventory') {
            // Initialize invoice data for each selected lead
            const initialData = {};
            selectedLeads.forEach(leadId => {
                initialData[leadId] = {
                    modeOfPayment: '',
                    paymentReceivedBy: ''
                };
            });
            setLeadInvoiceData(initialData);
            setShowBulkInvoiceModal(true);
            return;
        }

        // Check if any selected leads don't meet the requirements for the target status
        if (bulkStatus === 'converted') {
            const selectedLeadObjects = leads.filter(lead => selectedLeads.includes(lead._id));
            const leadsNotReadyForConversion = selectedLeadObjects.filter(lead => {
                const progress = getProgressInfo(lead);
                return progress.percentage < 100;
            });

            if (leadsNotReadyForConversion.length > 0) {
                setLeadsWithoutDocs(leadsNotReadyForConversion);
                setShowDocumentWarningModal(true);
                return;
            }
        }

        try {
            await axiosInstance.put('/purchases/leads/bulk-status', {
                leadIds: selectedLeads,
                status: bulkStatus
            });

            alert(`Successfully updated ${selectedLeads.length} lead(s)`);
            setSelectedLeads([]);
            setBulkStatus('');
            fetchLeads();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to bulk update');
        }
    };

    const handlePurchase = (leadId) => {
        if (user?.role !== 'admin') {
            alert('Only admins can purchase vehicles');
            return;
        }

        setLeadToPurchase(leadId);
        setInvoicePaymentDetails({
            paymentReceivedBy: ''
        });
        setPerInvestorPayments({});
        setShowInvoiceModal(true);
    };

    const resolveInvestorDetails = useCallback((allocation) => {
        if (!allocation) {
            return { id: undefined, name: 'Investor', email: '' };
        }
        let investorDoc = null;
        if (allocation.investorId && typeof allocation.investorId === 'object' && '_id' in allocation.investorId) {
            investorDoc = allocation.investorId;
        }
        const investorId = investorDoc?._id
            ? investorDoc._id.toString()
            : allocation.investorId != null && typeof allocation.investorId !== 'object'
                ? allocation.investorId.toString()
                : undefined;
        const fromList = investorId ? investors.find(inv => inv._id === investorId) : null;
        const fallback = investorDoc || allocation.investor || {};
        return {
            id: investorId,
            name: fromList?.name || fallback?.name || allocation?.name || 'Investor',
            email: fromList?.email || fallback?.email || allocation?.email || ''
        };
    }, [investors]);

    const confirmPurchase = async () => {
        if (!invoicePaymentDetails.paymentReceivedBy) {
            alert('Please select who received the payment');
            return;
        }

        const lead = leads.find(l => l._id === leadToPurchase);
        if (!lead) {
            alert('Lead not found');
            return;
        }

        const allocations = Array.isArray(lead.investorAllocations) ? lead.investorAllocations : [];

        if (allocations.length === 0) {
            alert('No investors assigned to this lead.');
            return;
        }

        const perInvestorPayload = allocations
            .map((allocation) => {
                const details = resolveInvestorDetails(allocation);
                if (!details.id) return null;
                return {
                    investorId: details.id,
                    modeOfPayment: perInvestorPayments[details.id]?.modeOfPayment || '',
                    paymentReceivedBy: invoicePaymentDetails.paymentReceivedBy || ''
                };
            })
            .filter(Boolean);

        if (perInvestorPayload.some(entry => !entry.modeOfPayment || !entry.paymentReceivedBy)) {
            alert('Please ensure every investor has a mode of payment and payment received by.');
            return;
        }

        setPurchasing(true);
        try {
            await axiosInstance.post(`/purchases/leads/${leadToPurchase}/purchase`, {
                paymentReceivedBy: invoicePaymentDetails.paymentReceivedBy,
                investorPayments: perInvestorPayload
            });
            alert('Lead successfully converted to vehicle and invoice sent to investor!');
            setShowInvoiceModal(false);
            setLeadToPurchase(null);
            setInvoicePaymentDetails({
                paymentReceivedBy: ''
            });
            setPerInvestorPayments({});
            fetchLeads(); // Refresh the list
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to purchase vehicle');
        } finally {
            setPurchasing(false);
        }
    };

    const handleLeadInvoiceChange = (leadId, field, value) => {
        setLeadInvoiceData(prev => ({
            ...prev,
            [leadId]: {
                ...prev[leadId],
                [field]: value
            }
        }));
    };

    const handleBulkPurchase = async () => {
        // Filter only leads with 100% progress
        const readyLeads = selectedLeads.filter(leadId => {
            const lead = leads.find(l => l._id === leadId);
            const progress = getProgressInfo(lead);
            return progress.percentage === 100;
        });

        if (readyLeads.length === 0) {
            alert('No leads are ready for purchase. All selected leads must have 100% progress (4/4 steps completed).');
            return;
        }

        // Validate all ready leads have payment details
        const missingFields = [];
        readyLeads.forEach(leadId => {
            const data = leadInvoiceData[leadId] || {};
            if (!data.modeOfPayment || !data.paymentReceivedBy) {
                const lead = leads.find(l => l._id === leadId);
                missingFields.push(lead?.leadId || leadId);
            }
        });

        if (missingFields.length > 0) {
            alert(`Please fill in payment details for all ready leads. Missing: ${missingFields.join(', ')}`);
            return;
        }

        setIsBulkPurchasing(true);
        try {
            const leadsData = readyLeads.map(leadId => ({
                leadId,
                modeOfPayment: leadInvoiceData[leadId]?.modeOfPayment,
                paymentReceivedBy: leadInvoiceData[leadId]?.paymentReceivedBy
            }));

            const response = await axiosInstance.post('/purchases/leads/bulk-purchase', {
                leads: leadsData
            });

            if (response.data.success) {
                const successCount = response.data.data?.successful?.length || 0;
                const errorCount = response.data.data?.errors?.length || 0;
                const skippedCount = selectedLeads.length - readyLeads.length;
                let message = `Successfully purchased ${successCount} lead(s)`;
                if (errorCount > 0) message += `, ${errorCount} failed`;
                if (skippedCount > 0) message += `, ${skippedCount} skipped (not ready)`;
                alert(message);
                setShowBulkInvoiceModal(false);
                setLeadInvoiceData({});
                setSelectedLeads([]);
                setBulkStatus('');
                fetchLeads();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to bulk purchase');
        } finally {
            setIsBulkPurchasing(false);
        }
    };

    const hasPriceAnalysis = (lead) => {
        return lead.priceAnalysis &&
            (lead.priceAnalysis.minSellingPrice || lead.priceAnalysis.maxSellingPrice);
    };

    // Progress steps mapping (labels describe the next action when not completed):
    // 1. Pricing & Job Costing
    // 2. Inspection Report
    // 3. Submit for Approval (first group)
    // 4. Final Approval (second group)
    const getProgressInfo = (lead) => {
        const approvalStatus = lead?.approval?.status;
        const hasSubmittedForApproval = approvalStatus === 'pending' || approvalStatus === 'approved';
        const isDualApproved = approvalStatus === 'approved';

        const steps = [
            {
                key: 'priceAnalysis',
                label: 'Pricing & Job Costing',
                completed: hasPriceAnalysis(lead)
            },
            {
                key: 'inspectionReport',
                label: 'Inspection Report',
                completed: lead?.attachments?.some(d => d.category === 'inspectionReport')
            },
            {
                key: 'firstGroupApproval',
                label: 'Submit for Approval',
                completed: !!hasSubmittedForApproval
            },
            {
                key: 'secondGroupApproval',
                label: 'Final Approval',
                completed: !!isDualApproved
            }
        ];

        const completedSteps = steps.filter(step => step.completed).length;
        const totalSteps = steps.length;
        const percentage = Math.round((completedSteps / totalSteps) * 100);

        const currentStep = steps.find(step => !step.completed) || steps[steps.length - 1];

        return {
            percentage,
            completedSteps,
            totalSteps,
            currentStep: currentStep?.label || 'Complete',
            steps
        };
    };

    const modalLead = showInvoiceModal ? leads.find(lead => lead._id === leadToPurchase) : null;
    const modalInvestorAllocations = modalLead?.investorAllocations || [];
    const hasModalInvestors = modalInvestorAllocations.length > 0;
    const allModalInvestorsHavePayment = hasModalInvestors && modalInvestorAllocations.every((allocation) => {
        const details = resolveInvestorDetails(allocation);
        if (!details.id) return false;
        return Boolean(perInvestorPayments[details.id]?.modeOfPayment);
    });
    const canSubmitSinglePurchase = hasModalInvestors
        && Boolean(invoicePaymentDetails.paymentReceivedBy)
        && allModalInvestorsHavePayment
        && !purchasing;

    if (loading) {
        return (
            <DashboardLayout title="Inspection">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    // Stats calculations - focusing on what's pending/waiting
    const leadsWaitingPriceAnalysis = leads.filter(lead => !hasPriceAnalysis(lead)).length;

    const leadsWaitingInspectionReport = leads.filter(lead =>
        !lead?.attachments?.some(d => d.category === 'inspectionReport')
    ).length;

    const leadsWaitingApprovals = leads.filter(lead =>
        lead?.approval?.status === 'pending'
    ).length;

    const totalUnderInspection = leads.length;

    return (
        <DashboardLayout>
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Inspection Leads</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Price analysis and final inspection before approval
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Total</p>
                                <p className="text-2xl font-bold text-green-900">{totalUnderInspection}</p>
                                <p className="text-xs text-green-600 mt-1">Total leads</p>
                            </div>
                            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">Waiting Price Analysis</p>
                                <p className="text-2xl font-bold text-purple-900">{leadsWaitingPriceAnalysis}</p>
                                <p className="text-xs text-purple-600 mt-1">Need pricing data</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Waiting Inspection Report</p>
                                <p className="text-2xl font-bold text-blue-900">{leadsWaitingInspectionReport}</p>
                                <p className="text-xs text-blue-600 mt-1">Need inspection report</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600">Waiting Approvals</p>
                                <p className="text-2xl font-bold text-orange-900">{leadsWaitingApprovals}</p>
                                <p className="text-xs text-orange-600 mt-1">Pending approval</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                                        <option value="inventory">Move to Inventory</option>
                                        <option value="negotiation">Rollback to Negotiation</option>
                                        <option value="cancelled">Cancel Lead</option>
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
                        placeholder="Search inspection leads..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
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
                                    Asking Price
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Progress
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leads.map((lead) => {
                                return (
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
                                            {(() => {
                                                const progress = getProgressInfo(lead);
                                                return (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-600">{progress.completedSteps}/{progress.totalSteps}</span>
                                                            <span className="font-semibold text-gray-800">{progress.percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${progress.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            {progress.percentage === 100 ? (
                                                                <span className="text-green-600 font-semibold">Complete</span>
                                                            ) : (
                                                                <span>Awaiting: {progress.currentStep}</span>
                                                            )}
                                                        </div>
                                                        {progress.percentage === 100 && (
                                                            <button
                                                                onClick={() => handlePurchase(lead._id)}
                                                                disabled={purchasing}
                                                                className="w-full inline-flex justify-center items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                                                </svg>
                                                                {purchasing ? 'Purchasing...' : 'Purchase'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
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
                                                to={`/purchases/inspection/${lead._id}`}
                                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all"
                                            >
                                                View
                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {leads.length === 0 && (
                    <div className="text-center py-16">
                        <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No leads in inspection</h3>
                        <p className="text-sm text-gray-500">
                            {filters.search ? 'Try adjusting your search' : 'Leads will appear here when moved from negotiation'}
                        </p>
                    </div>
                )}
            </div>

            {/* Document Warning Modal */}
            {showDocumentWarningModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Cannot Convert Selected Leads</h3>
                                    <p className="text-sm text-gray-600">Some leads are not ready for conversion</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    The following leads cannot be converted because they don't have 100% progress:
                                </p>
                                <div className="max-h-32 overflow-y-auto">
                                    {leadsWithoutDocs.map((lead) => (
                                        <div key={lead._id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-2">
                                            <span className="text-sm font-medium text-gray-900">{lead.leadId}</span>
                                            <span className="text-xs text-gray-600">
                                                {lead.vehicleInfo?.make} {lead.vehicleInfo?.model}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowDocumentWarningModal(false);
                                        setLeadsWithoutDocs([]);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDocumentWarningModal(false);
                                        setLeadsWithoutDocs([]);
                                        // Proceed with conversion of ready leads only
                                        const readyLeads = selectedLeads.filter(leadId => {
                                            const lead = leads.find(l => l._id === leadId);
                                            const progress = getProgressInfo(lead);
                                            return progress.percentage === 100;
                                        });
                                        setSelectedLeads(readyLeads);
                                        handleBulkStatusUpdate();
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Convert Ready Leads Only
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Purchase Invoice Modal */}
            {showInvoiceModal && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => !purchasing && setShowInvoiceModal(false)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Invoice Payment Details</h3>
                                {!purchasing && (
                                    <button
                                        onClick={() => setShowInvoiceModal(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">Please provide payment details for the invoice.</p>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Received By <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={invoicePaymentDetails.paymentReceivedBy}
                                    onChange={(e) => setInvoicePaymentDetails({ ...invoicePaymentDetails, paymentReceivedBy: e.target.value })}
                                    disabled={purchasing}
                                    className={`w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${purchasing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">Select admin...</option>
                                    {admins.map(admin => (
                                        <option key={admin._id} value={admin.name || admin.email}>
                                            {admin.name || admin.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {modalInvestorAllocations.length > 0 && (
                                <div className="border border-gray-200 rounded-lg bg-gray-50">
                                    <div className="px-3 py-2 text-xs text-gray-600">
                                        Select a mode of payment for each investor. All rows must be filled before purchasing.
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 bg-white">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Investor
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Mode of Payment <span className="text-red-500">*</span>
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Allocation
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Amount (AED)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 text-sm">
                                                {modalInvestorAllocations.map((allocation, index) => {
                                                    const details = resolveInvestorDetails(allocation);
                                                    const investorKey = details.id || `idx-${index}`;
                                                    const payment = details.id ? (perInvestorPayments[details.id] || { modeOfPayment: '' }) : { modeOfPayment: '' };
                                                    return (
                                                        <tr key={investorKey}>
                                                            <td className="px-4 py-3">
                                                                <div className="font-semibold text-gray-900">
                                                                    {details.name || details.email || 'Investor'}
                                                                </div>
                                                                {details.email && (
                                                                    <div className="text-xs text-gray-500">{details.email}</div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <select
                                                                    value={payment.modeOfPayment}
                                                                    onChange={(e) => {
                                                                        if (!details.id) return;
                                                                        const value = e.target.value;
                                                                        setPerInvestorPayments((prev) => {
                                                                            if (!value) {
                                                                                const next = { ...prev };
                                                                                delete next[details.id];
                                                                                return next;
                                                                            }
                                                                            return {
                                                                                ...prev,
                                                                                [details.id]: {
                                                                                    ...(prev[details.id] || {}),
                                                                                    modeOfPayment: value
                                                                                }
                                                                            };
                                                                        });
                                                                    }}
                                                                    disabled={purchasing}
                                                                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                                >
                                                                    <option value="">Select...</option>
                                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                                    <option value="Cash">Cash</option>
                                                                    <option value="Cheque">Cheque</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-gray-700">
                                                                {allocation.percentage}%
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-gray-700">
                                                                AED {Number(allocation.amount || 0).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl">
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                disabled={purchasing}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${purchasing
                                    ? 'bg-white text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPurchase}
                                disabled={!canSubmitSinglePurchase}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${!canSubmitSinglePurchase
                                    ? 'bg-primary-400 text-white cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                                    }`}
                            >
                                {purchasing ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    'Purchase Vehicle'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Purchase Invoice Modal */}
            {showBulkInvoiceModal && (() => {
                const readyLeadsCount = selectedLeads.filter(leadId => {
                    const lead = leads.find(l => l._id === leadId);
                    const progress = getProgressInfo(lead);
                    return progress.percentage === 100;
                }).length;
                const totalCount = selectedLeads.length;

                return (
                    <div
                        className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => !isBulkPurchasing && setShowBulkInvoiceModal(false)}
                    >
                        <div
                            className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-5 border-b border-gray-200 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Invoice Payment Details for Bulk Purchase</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {readyLeadsCount === totalCount
                                                ? `Enter payment details for ${readyLeadsCount} selected lead(s)`
                                                : `Enter payment details for ${readyLeadsCount} ready lead(s) (${totalCount - readyLeadsCount} not ready)`
                                            }
                                        </p>
                                    </div>
                                    {!isBulkPurchasing && (
                                        <button
                                            onClick={() => setShowBulkInvoiceModal(false)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <div className="text-xs text-blue-700">
                                            <strong>Note:</strong> Please fill in the payment details for each lead. All fields are required. Once all required fields are filled, click "Purchase All Leads" to convert them to inventory.
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead & Vehicle</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode of Payment <span className="text-red-500">*</span></th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Received By <span className="text-red-500">*</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedLeads.map((leadId) => {
                                                    const lead = leads.find(l => l._id === leadId);
                                                    const leadData = leadInvoiceData[leadId] || { modeOfPayment: '', paymentReceivedBy: '' };
                                                    const progress = getProgressInfo(lead);
                                                    const isComplete = progress.percentage === 100;

                                                    return (
                                                        <tr key={leadId} className={isComplete ? "hover:bg-gray-50" : "bg-yellow-50"}>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div>
                                                                    <div className="text-sm font-semibold text-primary-600">{lead?.leadId || 'N/A'}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} {lead?.vehicleInfo?.year}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {isComplete ? (
                                                                <>
                                                                    <td className="px-4 py-3">
                                                                        <select
                                                                            value={leadData.modeOfPayment || ''}
                                                                            onChange={(e) => handleLeadInvoiceChange(leadId, 'modeOfPayment', e.target.value)}
                                                                            disabled={isBulkPurchasing}
                                                                            className={`w-full px-2 py-1.5 text-xs border rounded ${isBulkPurchasing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                        >
                                                                            <option value="">Select...</option>
                                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                                            <option value="Cash">Cash</option>
                                                                            <option value="Cheque">Cheque</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <select
                                                                            value={leadData.paymentReceivedBy || ''}
                                                                            onChange={(e) => handleLeadInvoiceChange(leadId, 'paymentReceivedBy', e.target.value)}
                                                                            disabled={isBulkPurchasing}
                                                                            className={`w-full px-2 py-1.5 text-xs border rounded ${isBulkPurchasing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                        >
                                                                            <option value="">Select admin...</option>
                                                                            {admins.map(admin => (
                                                                                <option key={admin._id} value={admin.name || admin.email}>
                                                                                    {admin.name || admin.email}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <td colSpan="2" className="px-4 py-3">
                                                                    <div className="flex items-center gap-2 text-xs text-yellow-700">
                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                        </svg>
                                                                        <span className="font-medium">Not ready for purchase</span>
                                                                        <span className="text-yellow-600">({progress.completedSteps}/{progress.totalSteps} steps completed - Awaiting: {progress.currentStep})</span>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl flex-shrink-0">
                                <button
                                    onClick={() => {
                                        if (!isBulkPurchasing) {
                                            setShowBulkInvoiceModal(false);
                                            setLeadInvoiceData({});
                                            setBulkStatus('');
                                        }
                                    }}
                                    disabled={isBulkPurchasing}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg ${isBulkPurchasing
                                        ? 'bg-white text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkPurchase}
                                    disabled={isBulkPurchasing || readyLeadsCount === 0}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg ${isBulkPurchasing || readyLeadsCount === 0
                                        ? 'bg-primary-400 text-white cursor-not-allowed'
                                        : 'bg-primary-600 text-white hover:bg-primary-700'
                                        }`}
                                >
                                    {isBulkPurchasing ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        readyLeadsCount > 0 ? `Purchase ${readyLeadsCount} Lead(s)` : 'No Leads Ready'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </DashboardLayout>
    );
};

export default Inspection;
