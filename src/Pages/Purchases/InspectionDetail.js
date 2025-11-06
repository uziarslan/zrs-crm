import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';
import SignedIcon from '../../assets/icons/signed.svg';
import PendingIcon from '../../assets/icons/pending.svg';
import ConfirmDialog from '../../Components/ConfirmDialog';
import InspectionReportIcon from '../../assets/icons/inspection-report.svg';
import RegistrationCardIcon from '../../assets/icons/registration-card.svg';
import CarPicturesIcon from '../../assets/icons/car-pictures.svg';
import OnlineHistoryCheckIcon from '../../assets/icons/online-history-check.svg';

const InspectionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('pricing');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notes, setNotes] = useState('');
    const [documents, setDocuments] = useState({
        inspectionReport: null,
        registrationCard: null,
        carPictures: [],
        onlineHistoryCheck: null
    });
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');
    const [deletingNoteId, setDeletingNoteId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState({
        minSellingPrice: '',
        maxSellingPrice: '',
        purchasedFinalPrice: ''
    });
    const [chassisNumber, setChassisNumber] = useState('');
    const [savingPrice, setSavingPrice] = useState(false);
    const [investors, setInvestors] = useState([]);
    const [assigningInvestor, setAssigningInvestor] = useState(false);
    const [submittingApproval, setSubmittingApproval] = useState(false);
    const [approving, setApproving] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedInvestor, setSelectedInvestor] = useState(null);
    const [showPOFieldsModal, setShowPOFieldsModal] = useState(false);
    const [savingPOFields, setSavingPOFields] = useState(false);
    const [poFields, setPOFields] = useState({
        transferCost: '',
        detailing_inspection_cost: '',
        agent_commision: '',
        car_recovery_cost: '',
        other_charges: '',
        total_investment: ''
    });
    const [viewingDocumentId, setViewingDocumentId] = useState(null);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoicePaymentDetails, setInvoicePaymentDetails] = useState({
        modeOfPayment: '',
        paymentReceivedBy: ''
    });
    const [admins, setAdmins] = useState([]);

    const documentCategories = [
        { key: 'inspectionReport', label: 'Inspection Report', accept: '.pdf', multiple: false, IconComponent: InspectionReportIcon },
        { key: 'registrationCard', label: 'Registration Card', accept: '.pdf,.png,.jpg,.jpeg', multiple: false, IconComponent: RegistrationCardIcon },
        { key: 'carPictures', label: 'Car Pictures', accept: '.png,.jpg,.jpeg', multiple: true, IconComponent: CarPicturesIcon },
        { key: 'onlineHistoryCheck', label: 'Online History Check', accept: '.pdf', multiple: false, IconComponent: OnlineHistoryCheckIcon }
    ];

    useEffect(() => {
        fetchLead();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        // Load investors list for admin
        const loadInvestors = async () => {
            try {
                if (user?.role === 'admin') {
                    const res = await axiosInstance.get('/purchases/investors');
                    setInvestors(res.data.data || []);
                }
            } catch (e) {
                // silent fail
            }
        };
        loadInvestors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Load admins list for invoice payment received by dropdown
        const loadAdmins = async () => {
            try {
                if (user?.role === 'admin') {
                    const res = await axiosInstance.get('/admin/admins');
                    setAdmins(res.data.data || []);
                }
            } catch (e) {
                // silent fail
            }
        };
        loadAdmins();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update selected investor when lead or investors change
    useEffect(() => {
        if (lead?.investor && investors.length > 0) {
            const assignedInvestor = investors.find(inv => inv._id === lead.investor);
            if (assignedInvestor) {
                setSelectedInvestor(assignedInvestor);
            }
        }
    }, [lead?.investor, investors]);

    const fetchLead = async () => {
        try {
            const response = await axiosInstance.get(`/purchases/leads/${id}`);
            const leadData = response.data.data;
            setLead(leadData);
            setChassisNumber(leadData?.vehicleInfo?.vin || '');

            if (leadData.priceAnalysis) {
                setPriceAnalysis({
                    minSellingPrice: leadData.priceAnalysis.minSellingPrice || '',
                    maxSellingPrice: leadData.priceAnalysis.maxSellingPrice || '',
                    purchasedFinalPrice: leadData.priceAnalysis.purchasedFinalPrice || ''
                });
            }

            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch lead');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (category, e) => {
        const files = Array.from(e.target.files);

        const validFiles = files.filter(file => {
            const isValid = file.type === 'application/pdf' ||
                file.type === 'image/png' ||
                file.type === 'image/jpeg' ||
                file.type === 'image/jpg';
            if (!isValid) {
                alert(`${file.name} is not a valid file type. Only PDF, PNG, and JPG are allowed.`);
            }
            return isValid;
        });

        const validSizeFiles = validFiles.filter(file => {
            const isValid = file.size <= 10 * 1024 * 1024;
            if (!isValid) {
                alert(`${file.name} is too large. Maximum file size is 10MB.`);
            }
            return isValid;
        });

        if (category === 'carPictures') {
            setDocuments({
                ...documents,
                [category]: [...documents[category], ...validSizeFiles]
            });
        } else {
            setDocuments({
                ...documents,
                [category]: validSizeFiles[0] || null
            });
        }
    };

    const removeFile = (category, index = null) => {
        if (category === 'carPictures' && index !== null) {
            const newPictures = documents.carPictures.filter((_, i) => i !== index);
            setDocuments({ ...documents, carPictures: newPictures });
        } else {
            setDocuments({ ...documents, [category]: null });
        }
    };

    const handleUpload = async () => {
        const hasFiles = documents.inspectionReport ||
            documents.registrationCard ||
            documents.carPictures.length > 0 ||
            documents.onlineHistoryCheck;

        if (!hasFiles) {
            alert('Please select at least one file to upload');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();

            if (documents.inspectionReport) {
                formData.append('inspectionReport', documents.inspectionReport);
            }
            if (documents.registrationCard) {
                formData.append('registrationCard', documents.registrationCard);
            }
            if (documents.onlineHistoryCheck) {
                formData.append('onlineHistoryCheck', documents.onlineHistoryCheck);
            }
            documents.carPictures.forEach((file) => {
                formData.append('carPictures', file);
            });

            await axiosInstance.post(`/purchases/leads/${id}/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });

            alert('Documents uploaded successfully!');
            setDocuments({
                inspectionReport: null,
                registrationCard: null,
                carPictures: [],
                onlineHistoryCheck: null
            });
            setUploadProgress(0);
            fetchLead();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to upload documents');
        } finally {
            setUploading(false);
        }
    };

    const handleViewDocument = async (doc) => {
        setViewingDocumentId(doc._id);
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
            alert(err.response?.data?.message || 'Failed to view document');
        } finally {
            setViewingDocumentId(null);
        }
    };

    const handleDownloadDocument = async (doc) => {
        setDownloadingDocumentId(doc._id);
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
            alert(err.response?.data?.message || 'Failed to download document');
        } finally {
            setDownloadingDocumentId(null);
        }
    };

    const handleViewSignedDocument = async (doc) => {
        const docId = doc.documentId || doc._id;
        setViewingDocumentId(docId);
        try {
            if (!lead?.purchaseOrder?._id) {
                alert('Purchase order not found');
                setViewingDocumentId(null);
                return;
            }

            const response = await axiosInstance.get(`/purchases/po/${lead.purchaseOrder._id}/documents/${doc.documentId}`, {
                responseType: 'arraybuffer',
                headers: { Accept: 'application/pdf' }
            });

            const contentTypeHeader = (response.headers?.['content-type'] || response.headers?.['Content-Type'] || '');
            const isPdf = contentTypeHeader.includes('application/pdf');

            const blob = new Blob([response.data], { type: isPdf ? 'application/pdf' : 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);

            // Try opening a blank tab and embed the PDF via iframe for better reliability
            const newWindow = window.open('', '_blank');
            if (newWindow && !newWindow.closed) {
                const safeTitle = (doc.name || doc.fileName || 'Document').replace(/[<>&]/g, '');
                const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>html,body{height:100%;margin:0} .frame{border:0;width:100%;height:100%;}</style>
</head>
<body>
  <iframe class="frame" src="${blobUrl}" type="application/pdf"></iframe>
  <noscript>
    <p>PDF viewer requires JavaScript. <a href="${blobUrl}" target="_blank" rel="noopener">Open PDF</a></p>
  </noscript>
</body>
</html>`;
                newWindow.document.open();
                newWindow.document.write(html);
                newWindow.document.close();
            } else {
                // Fallback: open via anchor click without forcing download
                const link = document.createElement('a');
                link.href = blobUrl;
                link.target = '_blank';
                link.rel = 'noopener';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to view signed document');
        } finally {
            setViewingDocumentId(null);
        }
    };

    const handleDeleteDocument = (docId, fileName) => {
        setDocumentToDelete({ id: docId, name: fileName });
        setShowDeleteDocModal(true);
    };


    // Preview invoice removed per requirements

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;

        setIsDeletingDoc(true);
        try {
            await axiosInstance.delete(`/purchases/leads/${id}/documents/${documentToDelete.id}`);
            setShowDeleteDocModal(false);
            setDocumentToDelete(null);
            fetchLead();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete document');
        } finally {
            setIsDeletingDoc(false);
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

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const getDocumentsByCategory = (category) => {
        if (!lead?.attachments) return [];
        return lead.attachments.filter(doc => doc.category === category);
    };

    const areRequiredDocsComplete = () => {
        if (!lead?.attachments) return false;
        const hasRegistrationCard = lead.attachments.some(d => d.category === 'registrationCard');
        const hasCarPictures = lead.attachments.some(d => d.category === 'carPictures');
        const hasOnlineHistoryCheck = lead.attachments.some(d => d.category === 'onlineHistoryCheck');
        return hasRegistrationCard && hasCarPictures && hasOnlineHistoryCheck;
    };

    const isPriceAnalysisComplete = () => {
        const pa = lead?.priceAnalysis || {};
        return Boolean(pa.minSellingPrice && pa.maxSellingPrice && pa.purchasedFinalPrice);
    };

    const canShowInvestorTab = () => {
        const hasInspectionReport = lead?.attachments?.some(d => d.category === 'inspectionReport');
        return areRequiredDocsComplete() && isPriceAnalysisComplete() && hasInspectionReport;
    };

    const approvalsCount = () => {
        const a = lead?.approval?.approvals || [];
        return a.length || 0;
    };

    const isSubmittedForApproval = () => (lead?.approval?.status === 'pending' || lead?.approval?.status === 'approved');
    const isDualApproved = () => lead?.approval?.status === 'approved';
    const isDocuSignSent = () => lead?.purchaseOrder?.docuSignEnvelopeId && lead?.purchaseOrder?.docuSignStatus && !isDocuSignFailed();
    const isDocuSignCompleted = () => lead?.purchaseOrder?.docuSignStatus === 'completed';
    const isDocuSignFailed = () => lead?.purchaseOrder?.docuSignStatus === 'failed' || lead?.purchaseOrder?.docuSignStatus === 'voided';

    const isLeadConverted = () => lead?.status === 'converted';

    const handleAssignInvestor = async (investorId) => {
        if (!investorId) {
            setSelectedInvestor(null);
            return;
        }
        setAssigningInvestor(true);
        try {
            await axiosInstance.put(`/purchases/leads/${id}/investor`, { investorId });
            // Find the selected investor details
            const investor = investors.find(inv => inv._id === investorId);
            setSelectedInvestor(investor);
            await fetchLead();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to assign investor');
        } finally {
            setAssigningInvestor(false);
        }
    };

    const handleSubmitForApproval = async () => {
        // Check if PO fields need to be filled before submitting for approval
        const po = lead?.purchaseOrder || {};
        const needPOFields = !po?.transferCost || !po?.detailing_inspection_cost || !po?.total_investment;

        if (user?.role === 'admin' && needPOFields) {
            // Show PO fields modal first
            setPOFields({
                transferCost: po?.transferCost ?? '',
                detailing_inspection_cost: po?.detailing_inspection_cost ?? '',
                agent_commision: po?.agent_commision ?? '',
                car_recovery_cost: po?.car_recovery_cost ?? '',
                other_charges: po?.other_charges ?? '',
                total_investment: po?.total_investment ?? ''
            });
            setShowPOFieldsModal(true);
            return;
        }

        setSubmittingApproval(true);
        try {
            await axiosInstance.post(`/purchases/leads/${id}/submit-approval`);
            await fetchLead();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to submit for approval');
        } finally {
            setSubmittingApproval(false);
        }
    };

    const handleApprove = async () => {
        setApproving(true);
        try {
            await axiosInstance.post(`/purchases/leads/${id}/approve`);
            await fetchLead();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to approve');
        } finally {
            setApproving(false);
        }
    };

    const submitPOFieldsAndSubmitForApproval = async () => {
        // Basic validation for required fields
        if (!poFields.transferCost || !poFields.detailing_inspection_cost) {
            alert('Please fill all required fields.');
            return;
        }
        setSavingPOFields(true);
        try {
            await axiosInstance.put(`/purchases/leads/${id}/purchase-order`, {
                transferCost: Number(poFields.transferCost),
                detailing_inspection_cost: Number(poFields.detailing_inspection_cost),
                // total_investment is auto-calculated on the server
                agent_commision: poFields.agent_commision !== '' ? Number(poFields.agent_commision) : undefined,
                car_recovery_cost: poFields.car_recovery_cost !== '' ? Number(poFields.car_recovery_cost) : undefined,
                other_charges: poFields.other_charges !== '' ? Number(poFields.other_charges) : undefined
            });
            setShowPOFieldsModal(false);
            // Now submit for approval
            await axiosInstance.post(`/purchases/leads/${id}/submit-approval`);
            await fetchLead();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to save PO fields and submit for approval');
        } finally {
            setSavingPOFields(false);
        }
    };

    const submitPOFieldsAndApprove = async () => {
        // Basic validation for required fields
        if (!poFields.transferCost || !poFields.detailing_inspection_cost) {
            alert('Please fill all required fields.');
            return;
        }
        setSavingPOFields(true);
        try {
            await axiosInstance.put(`/purchases/leads/${id}/purchase-order`, {
                transferCost: Number(poFields.transferCost),
                detailing_inspection_cost: Number(poFields.detailing_inspection_cost),
                // total_investment is auto-calculated on the server
                agent_commision: poFields.agent_commision !== '' ? Number(poFields.agent_commision) : undefined,
                car_recovery_cost: poFields.car_recovery_cost !== '' ? Number(poFields.car_recovery_cost) : undefined,
                other_charges: poFields.other_charges !== '' ? Number(poFields.other_charges) : undefined
            });
            setShowPOFieldsModal(false);
            await axiosInstance.post(`/purchases/leads/${id}/approve`);
            await fetchLead();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to save PO fields');
        } finally {
            setSavingPOFields(false);
        }
    };

    const handleDecline = async () => {
        setDeclining(true);
        try {
            await axiosInstance.post(`/purchases/leads/${id}/decline`);
            await fetchLead();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to decline');
        } finally {
            setDeclining(false);
        }
    };

    const handlePurchase = () => {
        // Reset payment details and show invoice modal
        setInvoicePaymentDetails({
            modeOfPayment: '',
            paymentReceivedBy: ''
        });
        setShowInvoiceModal(true);
    };

    const confirmPurchase = async () => {
        if (!invoicePaymentDetails.modeOfPayment) {
            alert('Please select mode of payment');
            return;
        }
        if (!invoicePaymentDetails.paymentReceivedBy) {
            alert('Please select who received the payment');
            return;
        }

        setPurchasing(true);
        try {
            const response = await axiosInstance.post(`/purchases/leads/${id}/purchase`, {
                modeOfPayment: invoicePaymentDetails.modeOfPayment,
                paymentReceivedBy: invoicePaymentDetails.paymentReceivedBy
            });
            if (response.data.success) {
                await fetchLead();
                setShowInvoiceModal(false);
                setInvoicePaymentDetails({
                    modeOfPayment: '',
                    paymentReceivedBy: ''
                });
                alert('Lead converted to vehicle successfully and invoice sent to investor');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert(error.response?.data?.message || 'Failed to convert lead to vehicle');
        } finally {
            setPurchasing(false);
        }
    };

    const hasCurrentAdminApproved = () => {
        const approvals = lead?.approval?.approvals || [];
        const uid = user?.id || user?._id;
        return approvals.some(a => (a.adminId?._id || a.adminId)?.toString() === uid?.toString());
    };

    const handlePriceAnalysisChange = (field, value) => {
        setPriceAnalysis({
            ...priceAnalysis,
            [field]: value
        });
    };

    const handleSavePriceAnalysis = async () => {
        if (!priceAnalysis.minSellingPrice && !priceAnalysis.maxSellingPrice) {
            alert('Please enter at least Minimum or Maximum Selling Price');
            return;
        }

        const minPrice = parseFloat(priceAnalysis.minSellingPrice);
        const maxPrice = parseFloat(priceAnalysis.maxSellingPrice);
        const finalPrice = parseFloat(priceAnalysis.purchasedFinalPrice);

        if (priceAnalysis.minSellingPrice && (isNaN(minPrice) || minPrice <= 0)) {
            alert('Minimum Selling Price must be a valid positive number');
            return;
        }

        if (priceAnalysis.maxSellingPrice && (isNaN(maxPrice) || maxPrice <= 0)) {
            alert('Maximum Selling Price must be a valid positive number');
            return;
        }

        if (priceAnalysis.purchasedFinalPrice && (isNaN(finalPrice) || finalPrice <= 0)) {
            alert('Purchased Final Price must be a valid positive number');
            return;
        }

        if (priceAnalysis.minSellingPrice && priceAnalysis.maxSellingPrice && minPrice > maxPrice) {
            alert('Minimum Selling Price cannot be greater than Maximum Selling Price');
            return;
        }

        setSavingPrice(true);
        try {
            await axiosInstance.put(`/purchases/leads/${id}/price-analysis`, {
                minSellingPrice: priceAnalysis.minSellingPrice ? parseFloat(priceAnalysis.minSellingPrice) : null,
                maxSellingPrice: priceAnalysis.maxSellingPrice ? parseFloat(priceAnalysis.maxSellingPrice) : null,
                purchasedFinalPrice: priceAnalysis.purchasedFinalPrice ? parseFloat(priceAnalysis.purchasedFinalPrice) : null
            });
            // Save chassis number (VIN) if changed
            if ((lead?.vehicleInfo?.vin || '') !== (chassisNumber || '')) {
                await axiosInstance.put(`/purchases/leads/${id}`, {
                    vehicleInfo: { vin: chassisNumber || null }
                });
            }
            alert('Price analysis saved successfully!');
            fetchLead();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save price analysis');
        } finally {
            setSavingPrice(false);
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

    const calculateProfit = (sellingPrice, purchasePrice) => {
        if (!sellingPrice || !purchasePrice) return null;
        const profit = parseFloat(sellingPrice) - parseFloat(purchasePrice);
        const margin = (profit / parseFloat(sellingPrice)) * 100;
        return { profit, margin };
    };

    if (loading) {
        return (
            <DashboardLayout title="Inspection Detail">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Inspection Detail">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </DashboardLayout>
        );
    }

    const minProfit = calculateProfit(priceAnalysis.minSellingPrice, priceAnalysis.purchasedFinalPrice);
    const maxProfit = calculateProfit(priceAnalysis.maxSellingPrice, priceAnalysis.purchasedFinalPrice);

    return (
        <DashboardLayout title={`Inspection ${lead?.leadId}`}>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate('/purchases/inspection')}
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Inspection
                    </button>
                    <a
                        href={`/purchases/inspection/${id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-md"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        View & Print Car Details
                    </a>
                </div>

                {/* Status Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">{lead?.leadId}</h1>
                            <p className="text-purple-100 text-sm">
                                {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} {lead?.vehicleInfo?.year}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm text-purple-100 mb-1">Status</div>
                                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                                    <span className="text-sm font-semibold">Under Inspection</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* Tabs */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="border-b border-gray-200">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('pricing')}
                                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Pricing & Chassis
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Documents
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                                            {lead?.attachments?.length || 0}
                                        </span>
                                    </div>
                                </button>
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        Notes
                                        {lead?.notes && lead.notes.length > 0 && (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                                                {lead.notes.length}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                {canShowInvestorTab() && (
                                    <button
                                        onClick={() => setActiveTab('investor')}
                                        className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'investor'
                                            ? 'border-primary-600 text-primary-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Investor
                                            {isSubmittedForApproval() && (
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                                                    {approvalsCount()}/2
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                )}
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'pricing' && (
                                <div className="space-y-6">
                                    {/* Price Input Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Minimum Selling Price
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={priceAnalysis.minSellingPrice}
                                                        onChange={(e) => handlePriceAnalysisChange('minSellingPrice', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-lg font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Minimum expected selling price</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Maximum Selling Price
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={priceAnalysis.maxSellingPrice}
                                                        onChange={(e) => handlePriceAnalysisChange('maxSellingPrice', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-lg font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Maximum expected selling price</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Chassis No. (VIN)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={chassisNumber}
                                                    onChange={(e) => setChassisNumber(e.target.value)}
                                                    disabled={isSubmittedForApproval()}
                                                    className={`w-full px-3 py-3 border-2 rounded-lg text-base ${isSubmittedForApproval()
                                                        ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                        : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                        }`}
                                                    placeholder="Enter chassis/VIN"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Vehicle chassis number (VIN), typically 17 characters.</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Purchased Final Price
                                                    <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={priceAnalysis.purchasedFinalPrice}
                                                        onChange={(e) => handlePriceAnalysisChange('purchasedFinalPrice', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-lg font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Final purchase price to calculate profit</p>
                                            </div>

                                            {/* Quick Tip moved below to full width */}
                                        </div>
                                    </div>

                                    {/* Quick Tip - Full Width */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                                <div className="text-xs font-medium text-blue-900 mb-1">Quick Tip</div>
                                                <div className="text-xs text-blue-700">
                                                    Enter the purchase price to see estimated profit margins and percentages
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profit Analysis Cards */}
                                    {priceAnalysis.purchasedFinalPrice && (priceAnalysis.minSellingPrice || priceAnalysis.maxSellingPrice) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {minProfit && (
                                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center shadow-lg">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-xs font-medium text-green-600 uppercase tracking-wider">Minimum Profit</div>
                                                            <div className="text-2xl font-bold text-green-700">
                                                                AED {minProfit.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="text-sm text-green-600 font-medium">
                                                                {minProfit.margin.toFixed(2)}% margin
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {maxProfit && (
                                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Maximum Profit</div>
                                                            <div className="text-2xl font-bold text-blue-700">
                                                                AED {maxProfit.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="text-sm text-blue-600 font-medium">
                                                                {maxProfit.margin.toFixed(2)}% margin
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Save Button */}
                                    {!isSubmittedForApproval() && (
                                        <button
                                            onClick={handleSavePriceAnalysis}
                                            disabled={savingPrice}
                                            className={`w-full inline-flex justify-center items-center px-6 py-3 text-sm font-semibold rounded-lg shadow-md transition-all ${savingPrice
                                                ? 'bg-primary-400 text-white cursor-not-allowed'
                                                : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg'
                                                }`}
                                        >
                                            {savingPrice ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Save Price Analysis
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="space-y-6">
                                    {documentCategories.map((category) => {
                                        const uploadedDocs = getDocumentsByCategory(category.key);
                                        const isComplete = uploadedDocs.length > 0;

                                        return (
                                            <div
                                                key={category.key}
                                                className={`border-2 rounded-lg p-5 transition-all ${isComplete ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                            }`}>
                                                            <img src={category.IconComponent} alt={category.label} className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900">{category.label}</h4>
                                                            <p className="text-xs text-gray-500">{category.multiple ? 'Multiple files' : 'Single file'}</p>
                                                        </div>
                                                    </div>
                                                    {isComplete && (
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            {uploadedDocs.length}
                                                        </div>
                                                    )}
                                                </div>

                                                {uploadedDocs.length > 0 && (
                                                    <div className="mb-4">
                                                        {category.key === 'carPictures' ? (
                                                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                                {uploadedDocs.map((doc) => (
                                                                    <div key={doc._id} className="group relative aspect-square">
                                                                        <img
                                                                            src={doc.url}
                                                                            alt={doc.fileName}
                                                                            className="w-full h-full object-cover rounded-lg border-2 border-gray-200 hover:border-primary-500 cursor-pointer"
                                                                            onClick={() => handleViewDocument(doc)}
                                                                        />
                                                                        {user?.role === 'admin' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteDocument(doc._id, doc.fileName);
                                                                                }}
                                                                                className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {uploadedDocs.map((doc) => (
                                                                    <div key={doc._id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</div>
                                                                                <div className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={() => handleViewDocument(doc)}
                                                                                disabled={viewingDocumentId === doc._id || downloadingDocumentId === doc._id}
                                                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                title="View"
                                                                            >
                                                                                {viewingDocumentId === doc._id ? (
                                                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                    </svg>
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDownloadDocument(doc)}
                                                                                disabled={viewingDocumentId === doc._id || downloadingDocumentId === doc._id}
                                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                title="Download"
                                                                            >
                                                                                {downloadingDocumentId === doc._id ? (
                                                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                                    </svg>
                                                                                )}
                                                                            </button>
                                                                            {user?.role === 'admin' && (
                                                                                <button
                                                                                    onClick={() => handleDeleteDocument(doc._id, doc.fileName)}
                                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                                                    title="Delete"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {documents[category.key] && (category.multiple ? documents[category.key].length > 0 : true) && (
                                                    <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <div className="text-xs font-medium text-blue-700 mb-2">Selected for upload:</div>
                                                        <div className="space-y-1">
                                                            {category.multiple ? (
                                                                documents[category.key].map((file, index) => (
                                                                    <div key={index} className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                                                                        <span className="text-xs text-gray-900 truncate flex-1">{file.name}</span>
                                                                        {!uploading && (
                                                                            <button onClick={() => removeFile(category.key, index)} className="ml-2 text-red-600 hover:text-red-800">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            ) : documents[category.key] && (
                                                                <div className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                                                                    <span className="text-xs text-gray-900 truncate flex-1">{documents[category.key].name}</span>
                                                                    {!uploading && (
                                                                        <button onClick={() => removeFile(category.key)} className="ml-2 text-red-600 hover:text-red-800">
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    id={`file-${category.key}`}
                                                    accept={category.accept}
                                                    multiple={category.multiple}
                                                    onChange={(e) => handleFileSelect(category.key, e)}
                                                    className="hidden"
                                                    disabled={uploading}
                                                />
                                                <label
                                                    htmlFor={`file-${category.key}`}
                                                    className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed rounded-lg transition-all ${uploading
                                                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                                        : isComplete
                                                            ? 'border-green-300 bg-green-50 hover:border-green-400'
                                                            : 'border-gray-300 bg-gray-50 hover:border-primary-500 hover:bg-primary-50'
                                                        }`}
                                                >
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {category.multiple ? 'Add Files' : 'Choose File'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        (Max 10MB • {category.accept.replace(/\./g, '').toUpperCase()})
                                                    </span>
                                                </label>
                                            </div>
                                        );
                                    })}

                                    {uploading && (
                                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-sm font-semibold text-blue-900">Uploading... {uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-3">
                                                <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    )}

                                    {(documents.inspectionReport || documents.registrationCard || documents.carPictures.length > 0 || documents.onlineHistoryCheck) && !uploading && (
                                        <button
                                            onClick={handleUpload}
                                            className="w-full inline-flex justify-center items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                        >
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            Upload Documents ({Object.values(documents).flat().filter(Boolean).length})
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTab === 'investor' && canShowInvestorTab() && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-blue-900">Investor Assignment</div>
                                                <div className="text-xs text-blue-700">Assign an investor and submit for dual approval</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-purple-700">
                                            Approvals: {approvalsCount()}/2
                                        </div>
                                    </div>

                                    {user?.role === 'admin' && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Investor</label>
                                            <div className="flex gap-3">
                                                <select
                                                    value={lead?.investor || ''}
                                                    onChange={(e) => handleAssignInvestor(e.target.value)}
                                                    disabled={assigningInvestor || isSubmittedForApproval()}
                                                    className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                                                >
                                                    <option value="">Choose investor...</option>
                                                    {investors.map(inv => (
                                                        <option key={inv._id} value={inv._id}>{inv.name} ({inv.email})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {lead?.investor && selectedInvestor && (
                                                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <div className="text-sm font-semibold text-blue-900 mb-2">Investor Details</div>
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        <div>
                                                            <span className="text-blue-700 font-medium">Credit Limit:</span>
                                                            <div className="text-blue-900 font-semibold">AED {selectedInvestor.creditLimit?.toLocaleString() || 'N/A'}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-blue-700 font-medium">Utilized:</span>
                                                            <div className="text-blue-900 font-semibold">AED {selectedInvestor.utilizedAmount?.toLocaleString() || '0'}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-blue-700 font-medium">Remaining:</span>
                                                            <div className="text-green-700 font-semibold">AED {selectedInvestor.remainingCredit?.toLocaleString() || 'N/A'}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-blue-700 font-medium">Purchase Price:</span>
                                                            <div className="text-purple-700 font-semibold">AED {lead?.priceAnalysis?.purchasedFinalPrice?.toLocaleString() || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                    {selectedInvestor.remainingCredit && lead?.priceAnalysis?.purchasedFinalPrice && (
                                                        <div className="mt-2 pt-2 border-t border-blue-200">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-blue-700">Sufficient Credit:</span>
                                                                <span className={`font-semibold ${selectedInvestor.remainingCredit >= lead.priceAnalysis.purchasedFinalPrice ? 'text-green-700' : 'text-red-700'}`}>
                                                                    {selectedInvestor.remainingCredit >= lead.priceAnalysis.purchasedFinalPrice ? '✓ Yes' : '✗ No'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* DocuSign Status Section */}
                                    {isDualApproved() && (
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-blue-900">DocuSign Status</div>
                                                    <div className="text-xs text-blue-700">Purchase Agreement for Investor</div>
                                                </div>
                                            </div>

                                            {!isDocuSignSent() && (
                                                <div className="bg-white border border-blue-200 rounded-lg p-4 mb-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <div className="text-sm font-semibold text-blue-900">Purchase Agreement</div>
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        Will be sent to investor after dual approval
                                                    </div>
                                                </div>
                                            )}

                                            {isDocuSignSent() && !isDocuSignFailed() && (
                                                <div className="bg-white border border-blue-200 rounded-lg p-4 mb-3">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="text-sm font-semibold text-blue-900">Purchase Agreement</div>
                                                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${lead.purchaseOrder?.docuSignStatus === 'completed'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {lead.purchaseOrder?.docuSignStatus === 'completed' ? (
                                                                <>
                                                                    <img src={SignedIcon} alt="Signed" className="w-3 h-3" />
                                                                    Signed
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <img src={PendingIcon} alt="Pending" className="w-3 h-3" />
                                                                    Pending
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {lead.purchaseOrder?.docuSignSignedAt && (
                                                        <div className="text-xs text-gray-600">
                                                            Signed on {new Date(lead.purchaseOrder.docuSignSignedAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isDocuSignFailed() && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                                    <div className="text-sm text-red-900 mb-2">
                                                        {lead?.purchaseOrder?.docuSignStatus === 'voided' ? '❌ DocuSign Voided' : '❌ DocuSign Failed'}
                                                    </div>
                                                    <div className="text-xs text-red-700 mb-2">
                                                        {lead?.purchaseOrder?.docuSignStatus === 'voided'
                                                            ? 'Purchase agreement has been voided/deleted in DocuSign. The approval process has been reset.'
                                                            : 'Failed to send agreement to investor. Please check DocuSign configuration.'
                                                        }
                                                    </div>
                                                    {lead.purchaseOrder?.docuSignError && (
                                                        <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                                                            Error: {lead.purchaseOrder.docuSignError}
                                                        </div>
                                                    )}
                                                    {lead.purchaseOrder?.docuSignFailedAt && (
                                                        <div className="text-xs text-red-600 mt-2">
                                                            Failed: {new Date(lead.purchaseOrder.docuSignFailedAt).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}


                                            {isLeadConverted() && (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                    <div className="text-sm text-green-900 mb-1">✅ Vehicle Created</div>
                                                    <div className="text-xs text-green-700">
                                                        This lead has been converted to a vehicle and added to inventory.
                                                    </div>
                                                </div>
                                            )}

                                            {/* Signed Documents Section */}
                                            {isDocuSignCompleted() && lead?.purchaseOrder?.docuSignDocuments && lead.purchaseOrder.docuSignDocuments.length > 0 && (
                                                <div className="bg-white border border-blue-200 rounded-lg p-4 mt-3">
                                                    <div className="text-sm font-semibold text-blue-900 mb-3">Signed Documents</div>
                                                    <div className="space-y-2">
                                                        {lead.purchaseOrder.docuSignDocuments.map((doc, index) => (
                                                            <div key={doc.documentId || index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2 2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'PDF Document'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleViewSignedDocument(doc)}
                                                                        disabled={viewingDocumentId === (doc.documentId || doc._id)}
                                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {viewingDocumentId === (doc.documentId || doc._id) ? (
                                                                            <span className="flex items-center gap-1">
                                                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Loading...
                                                                            </span>
                                                                        ) : (
                                                                            'View'
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!isDocuSignCompleted() && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 justify-between">
                                            <div className="text-sm text-gray-700">
                                                {isSubmittedForApproval() ? 'This lead has been submitted for approval.' : 'Ready to submit for approval.'}
                                            </div>
                                            <div className="flex gap-3">
                                                {user?.role === 'admin' && !isSubmittedForApproval() && lead?.investor && (
                                                    <button
                                                        onClick={handleSubmitForApproval}
                                                        disabled={submittingApproval}
                                                        className={`inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-semibold ${submittingApproval ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
                                                    >
                                                        {submittingApproval ? 'Submitting...' : 'Submit for Approval'}
                                                    </button>
                                                )}
                                                {user?.role === 'admin' && isSubmittedForApproval() && lead?.approval?.status === 'pending' && !hasCurrentAdminApproved() && (
                                                    <button
                                                        onClick={handleApprove}
                                                        disabled={approving}
                                                        className={`inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-semibold ${approving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                                    >
                                                        {approving ? 'Approving...' : 'Approve'}
                                                    </button>
                                                )}
                                                {user?.role === 'admin' && isSubmittedForApproval() && lead?.approval?.status === 'pending' && (
                                                    <button
                                                        onClick={handleDecline}
                                                        disabled={declining}
                                                        className={`inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-semibold ${declining ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                                                    >
                                                        {declining ? 'Declining...' : 'Decline'}
                                                    </button>
                                                )}
                                                {isDualApproved() && !isDocuSignSent() && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">Ready for DocuSign</span>
                                                )}
                                                {isDocuSignSent() && !isDocuSignCompleted() && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Awaiting Signature</span>
                                                )}
                                                {isDocuSignCompleted() && !isLeadConverted() && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">Signed</span>
                                                )}
                                                {isLeadConverted() && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Converted to Vehicle</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name</div>
                                                <div className="text-sm font-semibold text-gray-900">{lead?.contactInfo?.name || 'N/A'}</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</div>
                                                <div className="text-sm font-semibold text-gray-900">{lead?.contactInfo?.phone || 'Not provided'}</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</div>
                                                <div className="text-sm font-semibold text-gray-900 break-all">{lead?.contactInfo?.email || 'Not provided'}</div>
                                            </div>
                                            {lead?.contactInfo?.passportOrEmiratesId && (
                                                <div className="bg-gray-50 rounded-lg p-4 md:col-span-3">
                                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Passport No. / Emirates ID</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{lead.contactInfo.passportOrEmiratesId}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Vehicle Information */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                            </svg>
                                            <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                                        </div>
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
                                                <div className="text-sm font-bold text-gray-900">{lead?.vehicleInfo?.mileage ? `${lead.vehicleInfo.mileage.toLocaleString()} km` : 'N/A'}</div>
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
                                                <div className="text-xl font-bold text-green-700">{lead?.vehicleInfo?.askingPrice ? `AED ${lead.vehicleInfo.askingPrice.toLocaleString()}` : 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lead Metadata */}
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
                                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead?.status)}`}>{lead?.status}</span>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="text-xs font-medium text-gray-500 mb-1">Source</div>
                                                <div className="text-sm font-medium text-gray-900 capitalize">{lead?.source}</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="text-xs font-medium text-gray-500 mb-1">Priority</div>
                                                <div className={`text-sm font-bold capitalize ${getPriorityColor(lead?.priority)}`}>{lead?.priority}</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                                                <div className="text-sm font-medium text-gray-900">{lead?.createdBy?.name || 'N/A'}</div>
                                            </div>
                                            {user?.role === 'admin' && (
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs font-medium text-gray-500 mb-1">Assigned To</div>
                                                    <div className="text-sm font-medium text-gray-900">{lead?.assignedTo?.name || 'Unassigned'}</div>
                                                </div>
                                            )}
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="text-xs font-medium text-gray-500 mb-1">Created</div>
                                                <div className="text-sm font-medium text-gray-900">{lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div>
                                    {lead?.notes && lead.notes.length > 0 ? (
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
                                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                                        rows="3"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleSaveNoteEdit(note._id)}
                                                                            className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-green-600 hover:bg-green-700"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelNoteEdit}
                                                                            className="px-3 py-1.5 text-xs font-semibold rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-semibold text-gray-900">{note.addedBy?.name || 'Unknown'}</span>
                                                                            <span className="text-xs text-gray-500">{new Date(note.addedAt).toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            {canEditNote(note) && (
                                                                                <button onClick={() => handleEditNote(note)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                            {canDeleteNote(note) && (
                                                                                <button onClick={() => handleDeleteNote(note._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
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
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            <p className="text-gray-500 text-sm">No notes yet</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Agreement Signed Card */}
                    {isDocuSignCompleted() && !isLeadConverted() && (
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-green-100">Agreement Signed</div>
                                    <div className="text-lg font-bold">Ready to Purchase!</div>
                                </div>
                            </div>
                            <div className="text-sm text-green-100 mb-4">
                                The investor has signed the Purchase Agreement. You can now proceed with the purchase.
                            </div>
                            {user?.role === 'admin' && (
                                <button
                                    onClick={handlePurchase}
                                    disabled={purchasing}
                                    className="w-full inline-flex justify-center items-center px-4 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                    </svg>
                                    {purchasing ? 'Converting...' : 'Purchase Vehicle'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Price Summary Card */}
                    {(priceAnalysis.minSellingPrice || priceAnalysis.maxSellingPrice || priceAnalysis.purchasedFinalPrice) && (
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                            <h3 className="text-sm font-medium text-indigo-100 mb-4">Price Summary</h3>
                            <div className="space-y-3">
                                {priceAnalysis.purchasedFinalPrice && (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                        <div className="text-xs text-indigo-100 mb-1">Purchase Price</div>
                                        <div className="text-xl font-bold">
                                            AED {parseFloat(priceAnalysis.purchasedFinalPrice).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {priceAnalysis.minSellingPrice && (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                        <div className="text-xs text-indigo-100 mb-1">Min Selling</div>
                                        <div className="text-xl font-bold">
                                            AED {parseFloat(priceAnalysis.minSellingPrice).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {priceAnalysis.maxSellingPrice && (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                        <div className="text-xs text-indigo-100 mb-1">Max Selling</div>
                                        <div className="text-xl font-bold">
                                            AED {parseFloat(priceAnalysis.maxSellingPrice).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Add Note */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Add Note</h3>
                        <div className="space-y-3">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                rows="4"
                                placeholder="Add a note about this inspection..."
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={!notes.trim()}
                                className={`w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${notes.trim()
                                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
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


                </div>
            </div>

            {/* Modals */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={cancelDeleteNote}>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Delete Note</h3>
                                {!isDeleting && (
                                    <button onClick={cancelDeleteNote} className="text-gray-400 hover:text-gray-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-600">Are you sure you want to delete this note?</p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl">
                            <button onClick={cancelDeleteNote} disabled={isDeleting} className={`px-4 py-2 text-sm font-medium rounded-lg ${isDeleting ? 'bg-white text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                                Cancel
                            </button>
                            <button onClick={confirmDeleteNote} disabled={isDeleting} className={`px-4 py-2 text-sm font-medium rounded-lg ${isDeleting ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteDocModal}
                onClose={() => {
                    if (!isDeletingDoc) {
                        setShowDeleteDocModal(false);
                        setDocumentToDelete(null);
                    }
                }}
                onConfirm={confirmDeleteDocument}
                title="Delete Document"
                message={`Are you sure you want to delete "${documentToDelete?.name}"?`}
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeletingDoc}
                danger={true}
            />

            <ConfirmDialog
                isOpen={showPurchaseModal}
                onClose={() => {
                    if (!purchasing) {
                        setShowPurchaseModal(false);
                    }
                }}
                onConfirm={confirmPurchase}
                title="Purchase Vehicle"
                message={`Are you sure you want to convert lead ${lead?.leadId} to a vehicle? This will create a purchase order and move the vehicle to inventory. This action cannot be undone.`}
                confirmText="Purchase Vehicle"
                cancelText="Cancel"
                isLoading={purchasing}
                danger={false}
            />

            {showPOFieldsModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !savingPOFields && setShowPOFieldsModal(false)}>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Purchase Order Details</h3>
                                {!savingPOFields && (
                                    <button onClick={() => setShowPOFieldsModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">Provide the required details before final approval.</p>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Cost (RTA) <span className="text-red-500">*</span></label>
                                    <input type="number" min="0" onWheel={(e) => e.target.blur()} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" value={poFields.transferCost} onChange={(e) => setPOFields({ ...poFields, transferCost: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Detailing / Inspection Cost <span className="text-red-500">*</span></label>
                                    <input type="number" min="0" onWheel={(e) => e.target.blur()} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" value={poFields.detailing_inspection_cost} onChange={(e) => setPOFields({ ...poFields, detailing_inspection_cost: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent Commission (Optional)</label>
                                    <input type="number" min="0" onWheel={(e) => e.target.blur()} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" value={poFields.agent_commision} onChange={(e) => setPOFields({ ...poFields, agent_commision: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Car Recovery Cost (Optional)</label>
                                    <input type="number" min="0" onWheel={(e) => e.target.blur()} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" value={poFields.car_recovery_cost} onChange={(e) => setPOFields({ ...poFields, car_recovery_cost: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges (Optional)</label>
                                    <input type="number" min="0" onWheel={(e) => e.target.blur()} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" value={poFields.other_charges} onChange={(e) => setPOFields({ ...poFields, other_charges: e.target.value })} />
                                </div>
                                {/* Total Investment is auto-calculated on the server */}
                                {/* Prepared By is auto-detected from the current admin on the server */}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl">
                            <button onClick={() => setShowPOFieldsModal(false)} disabled={savingPOFields} className={`px-4 py-2 text-sm font-medium rounded-lg ${savingPOFields ? 'bg-white text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Cancel</button>
                            <button onClick={isSubmittedForApproval() ? submitPOFieldsAndApprove : submitPOFieldsAndSubmitForApproval} disabled={savingPOFields} className={`px-4 py-2 text-sm font-medium rounded-lg ${savingPOFields ? 'bg-primary-400 text-white cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>{savingPOFields ? 'Saving...' : isSubmittedForApproval() ? 'Save & Approve' : 'Save & Submit for Approval'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Payment Details Modal */}
            {showInvoiceModal && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => !purchasing && setShowInvoiceModal(false)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md"
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
                                    Mode of Payment <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={invoicePaymentDetails.modeOfPayment}
                                    onChange={(e) => setInvoicePaymentDetails({ ...invoicePaymentDetails, modeOfPayment: e.target.value })}
                                    disabled={purchasing}
                                    className={`w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${purchasing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">Select mode of payment...</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
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
                                disabled={purchasing || !invoicePaymentDetails.modeOfPayment || !invoicePaymentDetails.paymentReceivedBy}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${purchasing || !invoicePaymentDetails.modeOfPayment || !invoicePaymentDetails.paymentReceivedBy
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
        </DashboardLayout>
    );
};

export default InspectionDetail;
