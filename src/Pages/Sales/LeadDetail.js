import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import ConfirmDialog from '../../Components/ConfirmDialog';

const SalesLeadDetail = ({ isSoldView = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);
  const [photoViewer, setPhotoViewer] = useState({
    isOpen: false,
    index: 0,
    zoom: 1
  });
  const [isFinancialOpen, setIsFinancialOpen] = useState(false);
  const [showSellOrderModal, setShowSellOrderModal] = useState(false);
  const [sellOrderError, setSellOrderError] = useState('');
  const [sellOrderSubmitting, setSellOrderSubmitting] = useState(false);
  const [sellOrderDownloading, setSellOrderDownloading] = useState(false);
  const [sellOrderCancelling, setSellOrderCancelling] = useState(false);
  const [showCancelSellOrderModal, setShowCancelSellOrderModal] = useState(false);
  const [showSellInvoiceModal, setShowSellInvoiceModal] = useState(false);
  const [sellInvoiceError, setSellInvoiceError] = useState('');
  const [sellInvoiceSubmitting, setSellInvoiceSubmitting] = useState(false);
  const [sellInvoiceDownloading, setSellInvoiceDownloading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

  const backPath = isSoldView ? '/sales/sold' : '/sales/leads';
  const pageTitle = isSoldView ? 'Sold Lead Detail' : 'Sales Lead Detail';
  const [sellOrderForm, setSellOrderForm] = useState({
    customerName: '',
    customerContact: '',
    customerEmail: '',
    customerIdDocument: '',
    customerAddress: '',
    sellingPrice: '',
    transferCostInclusion: 'included',
    transferCostAmount: '',
    insuranceInclusion: 'included',
    insuranceAmount: '',
    bankFinanceFee: '',
    inspectionCost: '',
    paymentMode: 'Cash',
    bookingAmount: ''
  });

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/purchases/leads/${id}`);
      setLead(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const showNotification = useCallback((type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  }, []);

  const showError = useCallback(
    (message) => showNotification('error', message),
    [showNotification]
  );

  const showSuccess = useCallback(
    (message) => showNotification('success', message),
    [showNotification]
  );

  // Lock background scroll when photo viewer is open
  useEffect(() => {
    if (photoViewer.isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [photoViewer.isOpen]);

  const handleViewDocument = async (doc) => {
    const docId = doc._id || doc.url || `${doc.fileName}_${doc.category}`;
    setViewingDocumentId(docId);
    try {
      if (doc.fileType !== 'application/pdf') {
        window.open(doc.url, '_blank');
        setViewingDocumentId(null);
        return;
      }

      const response = await axiosInstance.get(doc.viewUrl || doc.url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to view document');
    } finally {
      setViewingDocumentId(null);
    }
  };

  const handleDownloadDocument = async (doc) => {
    const docId = doc._id || doc.url || `${doc.fileName}_${doc.category}`;
    setDownloadingDocumentId(docId);
    try {
      const response = await axiosInstance.get(doc.viewUrl || doc.url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: doc.fileType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to download document');
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const calculateTotalCost = () => {
    const purchase = lead?.priceAnalysis?.purchasedFinalPrice || 0;
    const jc = lead?.jobCosting || {};
    const jobTotal =
      (jc.transferCost || 0) +
      (jc.detailing_cost || 0) +
      (jc.agent_commision || 0) +
      (jc.car_recovery_cost || 0) +
      (jc.inspection_cost || 0);
    return purchase + jobTotal;
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
      return 'AED 0.00';
    }
    return `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const downloadPdfBlob = (blob, filename) => {
    if (!blob) return;
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
  };

  const numericFieldNames = [
    'sellingPrice',
    'transferCostAmount',
    'insuranceAmount',
    'bankFinanceFee',
    'inspectionCost',
    'bookingAmount'
  ];

  const formatNumericString = (rawValue) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return '';
    const cleaned = String(rawValue)
      .replace(/,/g, '')
      .replace(/[^0-9.]/g, '');

    const [integerPart = '', decimalPart] = cleaned.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (decimalPart !== undefined) {
      const sanitizedDecimal = decimalPart.replace(/[^0-9]/g, '');
      return `${formattedInteger || '0'}.${sanitizedDecimal}`;
    }
    return formattedInteger;
  };

  const parseNumericInput = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const numericString = String(value).replace(/,/g, '');
    const parsed = Number(numericString);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sellOrderTotals = useMemo(() => {
    const selling = parseNumericInput(sellOrderForm.sellingPrice);
    const transferCost = parseNumericInput(sellOrderForm.transferCostAmount);
    const insurance = parseNumericInput(sellOrderForm.insuranceAmount);
    const bankFee = parseNumericInput(sellOrderForm.bankFinanceFee);
    const inspectionCost = parseNumericInput(sellOrderForm.inspectionCost);
    const booking = parseNumericInput(sellOrderForm.bookingAmount);
    const total = selling + transferCost + insurance + bankFee + inspectionCost;
    return {
      totalPayable: total,
      balanceDue: Math.max(total - booking, 0)
    };
  }, [sellOrderForm]);

  const handlePhotoWheelZoom = (event) => {
    if (!photoViewer.isOpen) return;
    event.preventDefault();
    const delta = event.deltaY;
    if (!delta) return;
    setPhotoViewer((prev) => {
      const direction = delta > 0 ? -1 : 1;
      const step = 0.1 * direction;
      const nextZoom = Math.min(5, Math.max(0.5, prev.zoom + step));
      if (nextZoom === prev.zoom) return prev;
      return {
        ...prev,
        zoom: nextZoom
      };
    });
  };

  const openSellOrderModal = () => {
    if (!lead) return;
    setSellOrderError('');
    setSellOrderForm({
      customerName: '',
      customerContact: '',
      customerEmail: '',
      customerIdDocument: '',
      customerAddress: '',
      sellingPrice: '',
      transferCostInclusion: 'included',
      transferCostAmount: '',
      insuranceInclusion: 'included',
      insuranceAmount: '',
      bankFinanceFee: '',
      inspectionCost: '',
      paymentMode: 'Cash',
      bookingAmount: ''
    });
    setShowSellOrderModal(true);
  };

  const closeSellOrderModal = () => {
    if (sellOrderSubmitting) return;
    setShowSellOrderModal(false);
  };

  const handleSellOrderInputChange = (event) => {
    const { name, value } = event.target;
    const isNumericField = numericFieldNames.includes(name);
    const nextValue = isNumericField ? formatNumericString(value) : value;

    setSellOrderForm((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleSellOrderSubmit = async (event) => {
    event.preventDefault();
    if (!lead) return;
    setSellOrderError('');
    setSellOrderSubmitting(true);
    try {
      const payload = {
        customerName: sellOrderForm.customerName?.trim(),
        customerContact: sellOrderForm.customerContact?.trim(),
        customerEmail: sellOrderForm.customerEmail?.trim(),
        customerIdDocument: sellOrderForm.customerIdDocument?.trim(),
        customerAddress: sellOrderForm.customerAddress?.trim(),
        sellingPrice: parseNumericInput(sellOrderForm.sellingPrice),
        transferCostInclusion: sellOrderForm.transferCostInclusion || 'included',
        transferCostAmount: parseNumericInput(sellOrderForm.transferCostAmount),
        insuranceInclusion: sellOrderForm.insuranceInclusion || 'included',
        insuranceAmount: parseNumericInput(sellOrderForm.insuranceAmount),
        bankFinanceFee: parseNumericInput(sellOrderForm.bankFinanceFee),
        inspectionCost: parseNumericInput(sellOrderForm.inspectionCost),
        paymentMode: sellOrderForm.paymentMode || 'Cash',
        bookingAmount: parseNumericInput(sellOrderForm.bookingAmount)
      };

      const response = await axiosInstance.post(`/sell-order/${lead._id}`, payload);

      if (response.data?.downloadUrl) {
        const downloadResponse = await axiosInstance.get(response.data.downloadUrl, {
          responseType: 'blob'
        });
        const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
        const fileName = `${response.data?.sellOrder?.salesOrderNumber || lead.leadId || 'Sell_Order'}.pdf`;
        downloadPdfBlob(blob, fileName);
      }

      showSuccess('Sell Order generated successfully.');
      setShowSellOrderModal(false);
      await fetchLead();
    } catch (err) {
      setSellOrderError(err.response?.data?.message || 'Failed to generate Sell Order');
      showError(err.response?.data?.message || 'Failed to generate Sell Order');
    } finally {
      setSellOrderSubmitting(false);
    }
  };

  const handleDownloadSellOrder = async () => {
    if (!lead?.sellOrder?._id) return;
    setSellOrderDownloading(true);
    try {
      const response = await axiosInstance.get(`/sell-order/${lead.sellOrder._id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileName = `${lead.sellOrder.salesOrderNumber || lead.leadId || 'Sell_Order'}.pdf`;
      downloadPdfBlob(blob, fileName);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to download Sell Order');
    } finally {
      setSellOrderDownloading(false);
    }
  };

  const handleCancelSellOrder = () => {
    if (!lead?._id) return;
    setShowCancelSellOrderModal(true);
  };

  const confirmCancelSellOrder = async () => {
    if (!lead?._id) return;
    setSellOrderCancelling(true);
    try {
      await axiosInstance.delete(`/sell-order/${lead._id}`);
      showSuccess('Sell Order cancelled successfully.');
      setShowCancelSellOrderModal(false);
      await fetchLead();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel Sell Order');
    } finally {
      setSellOrderCancelling(false);
    }
  };

  const [sellInvoiceForm, setSellInvoiceForm] = useState({
    balancePaymentReceived: '',
    paymentMode: 'Cash'
  });

  const openSellInvoiceModal = () => {
    if (!lead?.sellOrder) return;
    const sellOrder = lead.sellOrder;
    setSellInvoiceError('');
    setSellInvoiceForm({
      balancePaymentReceived: sellOrder.balanceAmount ? String(sellOrder.balanceAmount) : '',
      paymentMode: sellOrder.paymentMode || 'Cash'
    });
    setShowSellInvoiceModal(true);
  };

  const closeSellInvoiceModal = () => {
    if (sellInvoiceSubmitting) return;
    setShowSellInvoiceModal(false);
  };

  const handleSellInvoiceInputChange = (event) => {
    const { name, value } = event.target;
    setSellInvoiceForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSellInvoiceSubmit = async (event) => {
    event.preventDefault();
    if (!lead?._id) return;
    setSellInvoiceError('');
    setSellInvoiceSubmitting(true);
    try {
      const payload = {
        balancePaymentReceived: parseNumericInput(sellInvoiceForm.balancePaymentReceived),
        paymentMode: sellInvoiceForm.paymentMode
      };

      const response = await axiosInstance.post(`/sell-invoice/${lead._id}`, payload);

      if (response.data?.downloadUrl) {
        const downloadResponse = await axiosInstance.get(response.data.downloadUrl, {
          responseType: 'blob'
        });
        const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
        const fileName = `${response.data?.sellInvoice?.invoiceNumber || lead.leadId || 'Sell_Invoice'}.pdf`;
        downloadPdfBlob(blob, fileName);
      }

      showSuccess('Sell Invoice generated successfully. Vehicle marked as sold.');
      setShowSellInvoiceModal(false);
      await fetchLead();
    } catch (err) {
      setSellInvoiceError(err.response?.data?.message || 'Failed to generate Sell Invoice');
      showError(err.response?.data?.message || 'Failed to generate Sell Invoice');
    } finally {
      setSellInvoiceSubmitting(false);
    }
  };

  const handleDownloadSellInvoice = async () => {
    if (!lead?.sellInvoice?._id) return;
    setSellInvoiceDownloading(true);
    try {
      const response = await axiosInstance.get(`/sell-invoice/${lead.sellInvoice._id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileName = `${lead.sellInvoice.invoiceNumber || lead.leadId || 'Sell_Invoice'}.pdf`;
      downloadPdfBlob(blob, fileName);
      showSuccess('Sell Invoice downloaded successfully.');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to download Sell Invoice');
    } finally {
      setSellInvoiceDownloading(false);
    }
  };

  const handleGenerateSellInvoice = () => {
    openSellInvoiceModal();
  };

  if (loading) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate(backPath)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isSoldView ? 'Back to Sold' : 'Back to Sales Leads'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
            <p className="text-gray-600 mb-4">The requested sales lead could not be found.</p>
            <button
              onClick={() => navigate(backPath)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isSoldView ? 'Back to Sold' : 'Back to Sales Leads'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalCost = calculateTotalCost();
  const { totalPayable: sellOrderTotal, balanceDue: sellOrderBalance } = sellOrderTotals;
  const carPhotos = (lead?.attachments || []).filter(
    (a) => a.category === 'carPictures'
  );
  const hasSellOrder = Boolean(lead?.sellOrder);
  const hasSellInvoice = Boolean(lead?.sellInvoice);
  const sellOrderDetails = lead?.sellOrder || null;
  const paymentModeOptions = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Bank Finance', label: 'Bank Finance' },
    { value: 'Cheque', label: 'Cheque' }
  ];
  const toNumberValue = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const priceAnalysisData = lead?.priceAnalysis || {};
  const jobCostingData = lead?.jobCosting || {};
  const minSellingPriceValue =
    priceAnalysisData.minSellingPrice !== undefined && priceAnalysisData.minSellingPrice !== null
      ? toNumberValue(priceAnalysisData.minSellingPrice)
      : null;
  const maxSellingPriceValue =
    priceAnalysisData.maxSellingPrice !== undefined && priceAnalysisData.maxSellingPrice !== null
      ? toNumberValue(priceAnalysisData.maxSellingPrice)
      : null;
  const purchasedBaseValue =
    priceAnalysisData.purchasedFinalPrice !== undefined && priceAnalysisData.purchasedFinalPrice !== null
      ? toNumberValue(priceAnalysisData.purchasedFinalPrice)
      : null;
  const jobCostingTotalValue = ['transferCost', 'detailing_cost', 'agent_commision', 'car_recovery_cost', 'inspection_cost'].reduce(
    (sum, key) => sum + toNumberValue(jobCostingData[key]),
    0
  );
  const purchasedPriceValue = (purchasedBaseValue || 0) + jobCostingTotalValue;

  return (
    <DashboardLayout title={`${isSoldView ? 'Sold Lead' : 'Sales Lead'} ${lead.leadId || ''}`}>
      <div className="space-y-6">
        {notification.show && (
          <div
            className={`border-l-4 p-4 rounded-r-lg ${notification.type === 'success'
              ? 'bg-green-50 border-green-400'
              : notification.type === 'info'
                ? 'bg-blue-50 border-blue-400'
                : 'bg-red-50 border-red-400'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className={`h-5 w-5 ${notification.type === 'success'
                    ? 'text-green-400'
                    : notification.type === 'info'
                      ? 'text-blue-400'
                      : 'text-red-400'
                    }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 002 0V7zm0 6a1 1 0 10-2 0 1 1 0 002 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <p
                  className={`ml-3 text-sm ${notification.type === 'success'
                    ? 'text-green-700'
                    : notification.type === 'info'
                      ? 'text-blue-700'
                      : 'text-red-700'
                    }`}
                >
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification({ show: false, type: 'success', message: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {lead.vehicleInfo?.make} {lead.vehicleInfo?.model} {lead.vehicleInfo?.year}
              </h1>
              <p className="text-blue-100">
                Lead ID: {lead.leadId} • Type: {lead.type?.toUpperCase()} • Status:{' '}
                {lead.status?.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => navigate(backPath)}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              >
                ← {isSoldView ? 'Back to Sold' : 'Back to Sales Leads'}
              </button>
            </div>
          </div>
        </div>

        {/* Sell Order / Invoice Section (only for Sales tab, not Sold view) */}
        {!isSoldView && (
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-1">
                  Sales Order / Invoice
                </p>
                {!hasSellOrder ? (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900">Generate the Sales Order PDF</h2>
                    <p className="text-sm text-gray-600">
                      Fill in customer and transaction details to create the official Sales Order document.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900">Sales Order Generated</h2>
                    <p className="text-sm text-gray-600">
                      Order Number: <span className="font-semibold">{sellOrderDetails?.salesOrderNumber}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!hasSellOrder && (
                  <button
                    type="button"
                    onClick={openSellOrderModal}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={sellOrderSubmitting}
                  >
                    {sellOrderSubmitting ? 'Preparing...' : 'Generate Sell Order'}
                  </button>
                )}
                {hasSellOrder && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadSellOrder}
                      disabled={sellOrderDownloading}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sellOrderDownloading ? 'Downloading…' : 'Download Sell Order'}
                    </button>
                    {!hasSellInvoice && (
                      <button
                        type="button"
                        onClick={handleGenerateSellInvoice}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm shadow hover:bg-green-700 transition-colors"
                      >
                        Generate Sell Invoice
                      </button>
                    )}
                    {hasSellInvoice && (
                      <button
                        type="button"
                        onClick={handleDownloadSellInvoice}
                        disabled={sellInvoiceDownloading}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm shadow hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sellInvoiceDownloading ? 'Downloading…' : 'Download Sell Invoice'}
                      </button>
                    )}
                    {!hasSellInvoice && (
                      <button
                        type="button"
                        onClick={handleCancelSellOrder}
                        disabled={sellOrderCancelling}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-red-500 text-white font-semibold text-sm shadow hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sellOrderCancelling ? 'Cancelling…' : 'Cancel Sell Order'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'documents', label: 'Documents' },
                    { id: 'financial', label: 'Financial' },
                    { id: 'activity', label: 'Notes' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Contact & Vehicle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{lead.contactInfo?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{lead.contactInfo?.phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium break-all">{lead.contactInfo?.email || 'N/A'}</span>
                          </div>
                          {lead.contactInfo?.passportOrEmiratesId && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Passport/Emirates ID:</span>
                              <span className="font-medium">{lead.contactInfo.passportOrEmiratesId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Make:</span>
                            <span className="font-medium">{lead.vehicleInfo?.make || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Model:</span>
                            <span className="font-medium">{lead.vehicleInfo?.model || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Year:</span>
                            <span className="font-medium">{lead.vehicleInfo?.year || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Mileage:</span>
                            <span className="font-medium">
                              {lead.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}
                            </span>
                          </div>
                          {lead.vehicleInfo?.color && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Color:</span>
                              <span className="font-medium">{lead.vehicleInfo.color}</span>
                            </div>
                          )}
                          {lead.vehicleInfo?.vin && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">VIN:</span>
                              <span className="font-medium">{lead.vehicleInfo.vin}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasSellOrder && sellOrderDetails && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-blue-100 font-medium mb-1">
                                {isSoldView && lead.sellInvoice ? 'Sell Invoice No.' : 'Sales Order No.'}
                              </p>
                              <p className="text-2xl font-bold text-white">
                                {isSoldView && lead.sellInvoice
                                  ? lead.sellInvoice.invoiceNumber
                                  : sellOrderDetails.salesOrderNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-wider text-blue-100 font-medium mb-1">
                                {isSoldView && lead.sellInvoice ? 'Final Payment On' : 'Generated On'}
                              </p>
                              <p className="text-sm font-semibold text-white">
                                {isSoldView && lead.sellInvoice
                                  ? (lead.sellInvoice.dateOfFinalPayment
                                    ? new Date(lead.sellInvoice.dateOfFinalPayment).toLocaleString('en-GB', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })
                                    : 'N/A')
                                  : (sellOrderDetails.date
                                    ? new Date(sellOrderDetails.date).toLocaleString('en-GB', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })
                                    : new Date(sellOrderDetails.createdAt || Date.now()).toLocaleString('en-GB', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    }))}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 space-y-6">
                          {isSoldView && lead.sellInvoice ? (
                            <>
                              {/* Sell Invoice Summary inside Overview tab for Sold view */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                                    Total Payable
                                  </p>
                                  <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(lead.sellInvoice.totalInvoiceValue)}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                                    Total Received
                                  </p>
                                  <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(lead.sellInvoice.totalAmountReceived)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Customer (from invoice) */}
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Customer</h4>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{lead.sellInvoice.customerName}</p>
                                    </div>
                                    {lead.sellInvoice.customerContact && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{lead.sellInvoice.customerContact}</span>
                                      </div>
                                    )}
                                    {lead.sellInvoice.customerEmail && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="break-all">{lead.sellInvoice.customerEmail}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Summary (from invoice) */}
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Payment Summary</h4>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Payment Mode</p>
                                      <p className="text-base font-semibold text-gray-900 capitalize">
                                        {lead.sellInvoice.paymentMode?.replace(/-/g, ' ')}
                                      </p>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200 space-y-1">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Booking Amount Received</span>
                                        <span className="font-semibold">
                                          {formatCurrency(lead.sellInvoice.bookingAmountReceived)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Balance Payment Received</span>
                                        <span className="font-semibold">
                                          {formatCurrency(lead.sellInvoice.balancePaymentReceived)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Financial Summary (Sell Order) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                                    Total Payable
                                  </p>
                                  <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(sellOrderDetails.totalPayable)}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                                    Balance Due
                                  </p>
                                  <p className="text-2xl font-bold text-orange-600">
                                    {formatCurrency(sellOrderDetails.balanceAmount)}
                                  </p>
                                </div>
                              </div>

                              {/* Customer & Payment Info (Sell Order) */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Customer Information */}
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Customer</h4>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{sellOrderDetails.customerName}</p>
                                    </div>
                                    {sellOrderDetails.customerContact && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{sellOrderDetails.customerContact}</span>
                                      </div>
                                    )}
                                    {sellOrderDetails.customerEmail && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="break-all">{sellOrderDetails.customerEmail}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Summary */}
                                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Payment Summary</h4>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Payment Mode</p>
                                      <p className="text-base font-semibold text-gray-900 capitalize">
                                        {sellOrderDetails.paymentMode?.replace(/-/g, ' ')}
                                      </p>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200">
                                      <p className="text-xs text-gray-500 mb-1">Booking Amount Received</p>
                                      <p className="text-lg font-bold text-green-600">
                                        {formatCurrency(sellOrderDetails.bookingAmount)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Car Pictures */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Car Pictures</h3>
                      {(() => {
                        const photos = (lead.attachments || []).filter(
                          (a) => a.category === 'carPictures'
                        );
                        if (photos.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <svg
                                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="text-gray-500 text-sm">No car pictures uploaded yet</p>
                            </div>
                          );
                        }

                        return (
                          <div className="flex gap-4 overflow-x-auto pb-2">
                            {photos.map((photo, index) => (
                              <button
                                key={photo._id || photo.url || index}
                                type="button"
                                onClick={() =>
                                  setPhotoViewer({
                                    isOpen: true,
                                    index,
                                    zoom: 1
                                  })
                                }
                                className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 w-56"
                              >
                                <div className="aspect-video bg-gray-100">
                                  <img
                                    src={photo.url}
                                    alt={photo.fileName || `Car picture ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors" />
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Financial Overview (accordion) */}
                    <div className="bg-gray-50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setIsFinancialOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between px-4 py-3"
                      >
                        <h3 className="font-semibold text-gray-900">Financial Overview</h3>
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${isFinancialOpen ? 'rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      <div
                        className={`px-4 overflow-hidden transition-all duration-300 ease-in-out ${isFinancialOpen ? 'max-h-[1000px] pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'
                          }`}
                      >
                        <div className="border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Asking Price</p>
                              <p className="text-lg font-semibold">
                                AED {lead.vehicleInfo?.askingPrice?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Purchase Price</p>
                              <p className="text-lg font-semibold text-green-600">
                                AED {lead.priceAnalysis?.purchasedFinalPrice?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Min Selling Price</p>
                              <p className="text-lg font-semibold text-blue-600">
                                AED {lead.priceAnalysis?.minSellingPrice?.toLocaleString() || 'N/A'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Max Selling Price</p>
                              <p className="text-lg font-semibold text-purple-600">
                                AED {lead.priceAnalysis?.maxSellingPrice?.toLocaleString() || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {lead.jobCosting && (
                            <div className="mt-6 border-t border-gray-200 pt-4">
                              <h4 className="font-semibold text-gray-900 mb-3">Job Costings</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transfer Cost (RTA)</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.transferCost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Detailing Cost</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.detailing_cost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Agent Commission</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.agent_commision || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Car Recovery Cost</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.car_recovery_cost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Inspection Cost</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    AED {(lead.jobCosting.inspection_cost || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost (Purchase + Job)</p>
                                  <p className="text-sm font-bold text-gray-900">
                                    AED {totalCost.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Lead Metadata</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Source</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{lead.source}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Priority</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{lead.priority}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Assigned To</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.createdBy?.name || 'N/A'}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">Created</div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      {lead.attachments && lead.attachments.length > 0 ? (
                        <div className="space-y-4">
                          {(() => {
                            const grouped = lead.attachments.reduce((groups, attachment) => {
                              const category = attachment.category;
                              if (!groups[category]) {
                                groups[category] = [];
                              }
                              groups[category].push(attachment);
                              return groups;
                            }, {});

                            const categoryNames = {
                              inspectionReport: 'Inspection Report',
                              registrationCard: 'Registration Card',
                              carPictures: 'Car Pictures',
                              onlineHistoryCheck: 'Suggested History Check'
                            };

                            return Object.entries(grouped).map(([category, attachments]) => (
                              <div key={category} className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                                  {categoryNames[category] || category}
                                </h4>
                                <div className="space-y-2">
                                  {attachments.map((attachment, index) => {
                                    const keyId =
                                      attachment._id ||
                                      attachment.url ||
                                      `${attachment.fileName}_${attachment.category}_${index}`;
                                    const isViewing = viewingDocumentId === keyId;
                                    const isDownloading = downloadingDocumentId === keyId;
                                    return (
                                      <div
                                        key={keyId}
                                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-500 hover:shadow-sm transition-all"
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            {attachment.fileType === 'application/pdf' ? (
                                              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                              </svg>
                                            ) : (
                                              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                              {attachment.fileName || 'Document'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {attachment.category} •{' '}
                                              {attachment.fileSize ? formatFileSize(attachment.fileSize) : 'Unknown size'}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-3">
                                          <button
                                            onClick={() => handleViewDocument(attachment)}
                                            disabled={isViewing || isDownloading}
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="View"
                                          >
                                            {isViewing ? (
                                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path
                                                  className="opacity-75"
                                                  fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                              </svg>
                                            ) : (
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                              </svg>
                                            )}
                                          </button>
                                          <button
                                            onClick={() => handleDownloadDocument(attachment)}
                                            disabled={isViewing || isDownloading}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Download"
                                          >
                                            {isDownloading ? (
                                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path
                                                  className="opacity-75"
                                                  fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                              </svg>
                                            ) : (
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                                />
                                              </svg>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg
                            className="w-16 h-16 mx-auto text-gray-300 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-gray-500 text-sm">No documents available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-6">
                    {/* Investor Allocations */}
                    {lead.investorAllocations && lead.investorAllocations.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Investor Allocations</h3>
                        <div className="space-y-3">
                          {lead.investorAllocations.map((allocation, index) => (
                            <div
                              key={allocation._id || index}
                              className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {allocation.investorId?.name || 'Investor'}
                                </div>
                                {allocation.investorId?.email && (
                                  <div className="text-xs text-gray-500">{allocation.investorId.email}</div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500 mr-1">Ownership:</span>
                                  <span className="font-semibold">
                                    {allocation.ownershipPercentage ?? allocation.percentage ?? 0}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 mr-1">Amount:</span>
                                  <span className="font-semibold">
                                    AED {(allocation.amount || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 mr-1">Profit %:</span>
                                  <span className="font-semibold">
                                    {allocation.profitPercentage != null ? allocation.profitPercentage : 'N/A'}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invoices Summary */}
                    {lead.invoices && lead.invoices.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Invoices</h3>
                        <div className="space-y-3">
                          {lead.invoices.map((invoice) => (
                            <div
                              key={invoice._id || invoice.invoiceNo}
                              className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  Invoice #{invoice.invoiceNo}
                                </div>
                                {invoice.investorId?.name && (
                                  <div className="text-xs text-gray-500">
                                    Investor: {invoice.investorId.name} ({invoice.investorId.email})
                                  </div>
                                )}
                                {invoice.sentAt && (
                                  <div className="text-xs text-gray-500">
                                    Sent: {new Date(invoice.sentAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-900">
                                <div>
                                  <span className="text-gray-500 mr-1">Total Payable:</span>
                                  <span className="font-semibold">
                                    AED {invoice.totals?.total_amount_payable?.toLocaleString() || '0'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div>
                    {lead?.notes && lead.notes.length > 0 ? (
                      <div className="space-y-4">
                        {lead.notes.map((note, index) => (
                          <div key={note._id || index} className="relative">
                            {index !== lead.notes.length - 1 && (
                              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                            )}
                            <div className="flex gap-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 8h.01M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {note.addedBy?.name || 'Unknown'}
                                    </span>
                                    {note.addedAt && (
                                      <span className="text-xs text-gray-500">
                                        {new Date(note.addedAt).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                {note.editedAt && (
                                  <div className="mt-2 text-xs text-gray-500 italic">
                                    Edited {new Date(note.editedAt).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <svg
                          className="w-16 h-16 mx-auto text-gray-300 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <p className="text-gray-500 text-sm">No notes yet</p>
                      </div>
                    )}
                  </div>
                )}

                {showSellOrderModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
                      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Generate Sell Order</h3>
                          <p className="text-sm text-gray-500">
                            Fill the customer & transaction details to create the Sales Order PDF.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeSellOrderModal}
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="Close"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {sellOrderError && (
                        <div className="px-6 py-3 bg-red-50 text-sm text-red-700 border-b border-red-100">
                          {sellOrderError}
                        </div>
                      )}
                      <form onSubmit={handleSellOrderSubmit} className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">
                        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                          <div>
                            <p className="text-xs uppercase text-gray-500">Vehicle</p>
                            <p className="font-semibold text-gray-900">
                              {lead.vehicleInfo?.make} {lead.vehicleInfo?.model} {lead.vehicleInfo?.year}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">VIN / Chassis</p>
                            <p className="font-semibold text-gray-900">{lead.vehicleInfo?.vin || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Mileage</p>
                            <p className="font-semibold text-gray-900">
                              {lead.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Color</p>
                            <p className="font-semibold text-gray-900">{lead.vehicleInfo?.color || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                            <input
                              type="text"
                              name="customerName"
                              required
                              value={sellOrderForm.customerName}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                            <input
                              type="text"
                              name="customerContact"
                              required
                              value={sellOrderForm.customerContact}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                              type="email"
                              name="customerEmail"
                              value={sellOrderForm.customerEmail}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Emirates ID / Passport</label>
                            <input
                              type="text"
                              name="customerIdDocument"
                              required
                              value={sellOrderForm.customerIdDocument}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                              name="customerAddress"
                              required
                              value={sellOrderForm.customerAddress}
                              onChange={handleSellOrderInputChange}
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                              <span>Selling Price (AED)</span>
                              {(purchasedBaseValue !== null || jobCostingTotalValue > 0) && (
                                <span className="text-[11px] text-gray-500">
                                  Cost:{' '}
                                  <span className="font-semibold text-gray-800">
                                    {formatCurrency(purchasedPriceValue)}
                                  </span>
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="sellingPrice"
                              required
                              value={sellOrderForm.sellingPrice}
                              onWheel={(event) => event.currentTarget.blur()}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                            />
                            {(minSellingPriceValue !== null || maxSellingPriceValue !== null) && (
                              <div className="mt-2 text-[10px] sm:text-[11px] text-gray-600 whitespace-nowrap">
                                Min:{' '}
                                <span className="font-semibold text-gray-900">
                                  {minSellingPriceValue !== null ? formatCurrency(minSellingPriceValue) : 'Not set'}
                                </span>{' '}
                                • Max:{' '}
                                <span className="font-semibold text-gray-900">
                                  {maxSellingPriceValue !== null ? formatCurrency(maxSellingPriceValue) : 'Not set'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Transfer Cost</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                name="transferCostAmount"
                                value={sellOrderForm.transferCostAmount}
                                onWheel={(event) => event.currentTarget.blur()}
                                onChange={handleSellOrderInputChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                              />
                              <select
                                name="transferCostInclusion"
                                value={sellOrderForm.transferCostInclusion}
                                onChange={handleSellOrderInputChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="included">Included</option>
                                <option value="excluded">Excluded</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Insurance</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                name="insuranceAmount"
                                value={sellOrderForm.insuranceAmount}
                                onWheel={(event) => event.currentTarget.blur()}
                                onChange={handleSellOrderInputChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                              />
                              <select
                                name="insuranceInclusion"
                                value={sellOrderForm.insuranceInclusion}
                                onChange={handleSellOrderInputChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="included">Included</option>
                                <option value="excluded">Excluded</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Bank Finance Fees (AED)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="bankFinanceFee"
                              value={sellOrderForm.bankFinanceFee}
                              onWheel={(event) => event.currentTarget.blur()}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Inspection Cost (AED)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="inspectionCost"
                              value={sellOrderForm.inspectionCost}
                              onWheel={(event) => event.currentTarget.blur()}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                            <select
                              name="paymentMode"
                              required
                              value={sellOrderForm.paymentMode}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              {paymentModeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Booking Amount Received (AED)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="bookingAmount"
                              value={sellOrderForm.bookingAmount}
                              onWheel={(event) => event.currentTarget.blur()}
                              onChange={handleSellOrderInputChange}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs uppercase text-gray-500">Total Payable</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(sellOrderTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Balance Due</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(sellOrderBalance)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={closeSellOrderModal}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={sellOrderSubmitting}
                            className="px-5 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {sellOrderSubmitting ? 'Generating…' : 'Generate & Download'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Global car picture viewer overlay */}
                {photoViewer.isOpen && carPhotos.length > 0 && carPhotos[photoViewer.index] && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
                    <div
                      className="absolute inset-0"
                      onClick={() => setPhotoViewer({ isOpen: false, index: 0, zoom: 1 })}
                    />
                    <div className="relative z-10 w-full h-full flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-70">
                        <div className="text-sm text-white">
                          {photoViewer.index + 1} / {carPhotos.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoViewer((prev) => ({
                                ...prev,
                                zoom: Math.max(0.5, prev.zoom - 0.25)
                              }))
                            }
                            className="px-2 py-1 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                          >
                            -
                          </button>
                          <span className="text-xs text-white w-10 text-center">
                            {Math.round(photoViewer.zoom * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoViewer((prev) => ({
                                ...prev,
                                zoom: Math.min(5, prev.zoom + 0.25)
                              }))
                            }
                            className="px-2 py-1 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoViewer({ isOpen: false, index: 0, zoom: 1 })}
                            className="ml-4 px-3 py-1 text-xs rounded bg-white text-gray-900 hover:bg-gray-100"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div
                        className="flex-1 flex items-center justify-center overflow-hidden"
                        onWheel={handlePhotoWheelZoom}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index: prev.index === 0 ? carPhotos.length - 1 : prev.index - 1
                            }));
                          }}
                          className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-black bg-opacity-40 text-white hover:bg-opacity-60 absolute left-4"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>

                        <div className="max-w-5xl max-h-full px-4">
                          <img
                            src={carPhotos[photoViewer.index].url}
                            alt={
                              carPhotos[photoViewer.index].fileName ||
                              `Car picture ${photoViewer.index + 1}`
                            }
                            className="max-h-[80vh] mx-auto"
                            style={{ transform: `scale(${photoViewer.zoom})` }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index:
                                prev.index === carPhotos.length - 1 ? 0 : prev.index + 1
                            }));
                          }}
                          className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-black bg-opacity-40 text-white hover:bg-opacity-60 absolute right-4"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Mobile next/prev under image */}
                      <div className="flex sm:hidden items-center justify-between px-4 py-3 bg-black bg-opacity-70">
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index: prev.index === 0 ? carPhotos.length - 1 : prev.index - 1
                            }))
                          }
                          className="px-3 py-2 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoViewer((prev) => ({
                              ...prev,
                              index:
                                prev.index === carPhotos.length - 1 ? 0 : prev.index + 1
                            }))
                          }
                          className="px-3 py-2 text-xs rounded bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500 mr-1">Status:</span>
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {lead.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 mr-1">Priority:</span>
                  <span className="font-semibold capitalize">{lead.priority}</span>
                </div>
                <div>
                  <span className="text-gray-500 mr-1">Type:</span>
                  <span className="font-semibold uppercase">{lead.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sell Invoice Modal */}
      {showSellInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Generate Sell Invoice</h3>
                <p className="text-sm text-gray-500">
                  Complete payment details to generate the Sales Invoice. This will mark the vehicle as sold.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSellInvoiceModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sellInvoiceError && (
              <div className="px-6 py-3 bg-red-50 text-sm text-red-700 border-b border-red-100">
                {sellInvoiceError}
              </div>
            )}
            <form onSubmit={handleSellInvoiceSubmit} className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">
              {sellOrderDetails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Sales Order No:</span>
                    <span className="font-semibold text-gray-900">{sellOrderDetails.salesOrderNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Payable:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(sellOrderDetails.totalPayable)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Booking Amount Received:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(sellOrderDetails.bookingAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Balance Amount:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(sellOrderDetails.balanceAmount)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Balance Payment Received (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="balancePaymentReceived"
                    required
                    value={sellInvoiceForm.balancePaymentReceived}
                    onWheel={(event) => event.currentTarget.blur()}
                    onChange={handleSellInvoiceInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 number-input-no-spin"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the balance payment amount received</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mode of Payment <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMode"
                    required
                    value={sellInvoiceForm.paymentMode}
                    onChange={handleSellInvoiceInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">Important Notice</p>
                    <p className="text-xs text-yellow-700">
                      Generating the Sell Invoice will mark this vehicle as <strong>sold</strong> and calculate profits for investors.
                      This action cannot be undone. Please ensure all payment details are correct.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeSellInvoiceModal}
                  disabled={sellInvoiceSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sellInvoiceSubmitting}
                  className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sellInvoiceSubmitting ? 'Generating…' : 'Generate & Download Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showCancelSellOrderModal}
        onClose={() => {
          if (!sellOrderCancelling) {
            setShowCancelSellOrderModal(false);
          }
        }}
        onConfirm={confirmCancelSellOrder}
        title="Cancel Sell Order"
        message="Are you sure you want to cancel this Sell Order? This action cannot be undone."
        confirmText="Cancel Sell Order"
        cancelText="Keep Sell Order"
        isLoading={sellOrderCancelling}
        danger
      />
    </DashboardLayout >
  );
};

export default SalesLeadDetail;
