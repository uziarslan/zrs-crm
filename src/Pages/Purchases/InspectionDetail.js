import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Utility functions for number formatting with commas
const formatNumberWithCommas = (value) => {
    if (!value && value !== 0) return '';
    // Remove any existing commas and parse
    const numStr = String(value).replace(/,/g, '');
    // Handle empty string
    if (numStr === '' || numStr === '.') return numStr;
    // Split by decimal point if exists
    const parts = numStr.split('.');
    // Format the integer part with commas (only if there's a number)
    if (parts[0]) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    // Return formatted number (handle case where user is typing just a decimal point)
    return parts.length > 1 ? parts.join('.') : parts[0];
};

const parseFormattedNumber = (value) => {
    if (!value) return '';
    // Remove commas and return the numeric string
    return value.replace(/,/g, '');
};

const InspectionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'error' });

    // Helper functions to show notifications
    const showError = useCallback((message) => {
        setNotification({ show: true, message, type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'error' }), 5000);
    }, []);

    const showSuccess = useCallback((message) => {
        setNotification({ show: true, message, type: 'success' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    }, []);

    const showWarning = useCallback((message) => {
        setNotification({ show: true, message, type: 'warning' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'warning' }), 5000);
    }, []);
    const [activeTab, setActiveTab] = useState('pricing');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notes, setNotes] = useState('');
    const [documents, setDocuments] = useState({
        inspectionReport: [],
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
    const [jobCosting, setJobCosting] = useState({
        transferCost: '',
        detailing_cost: '',
        agent_commision: '',
        car_recovery_cost: '',
        inspection_cost: ''
    });
    const [chassisNumber, setChassisNumber] = useState('');
    const [savingPrice, setSavingPrice] = useState(false);
    const [investors, setInvestors] = useState([]);
    const [submittingApproval, setSubmittingApproval] = useState(false);
    const [approving, setApproving] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [investorAllocations, setInvestorAllocations] = useState([]);
    const [savingInvestorAllocations, setSavingInvestorAllocations] = useState(false);
    const [newInvestorId, setNewInvestorId] = useState('');
    const [newInvestorOwnershipPercentage, setNewInvestorOwnershipPercentage] = useState('');
    const [newInvestorAmount, setNewInvestorAmount] = useState('');
    const [newInvestorProfitPercentage, setNewInvestorProfitPercentage] = useState('');
    const [viewingDocumentId, setViewingDocumentId] = useState(null);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoicePaymentDetails, setInvoicePaymentDetails] = useState({
        paymentReceivedBy: ''
    });
    const [perInvestorPayments, setPerInvestorPayments] = useState({});
    const [admins, setAdmins] = useState([]);

    const lastNewInvestorInputRef = useRef(null);

    const documentCategories = [
        { key: 'inspectionReport', label: 'Inspection Report', accept: '.pdf,.png,.jpg,.jpeg', multiple: true, IconComponent: InspectionReportIcon },
        { key: 'registrationCard', label: 'Registration Card', accept: '.pdf,.png,.jpg,.jpeg', multiple: false, IconComponent: RegistrationCardIcon },
        { key: 'carPictures', label: 'Car Pictures', accept: '.png,.jpg,.jpeg', multiple: true, IconComponent: CarPicturesIcon },
        { key: 'onlineHistoryCheck', label: 'Online History Check', accept: '.pdf', multiple: false, IconComponent: OnlineHistoryCheckIcon }
    ];

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

    useEffect(() => {
        if (!showInvoiceModal) {
            setPerInvestorPayments({});
        }
    }, [showInvoiceModal]);

    // Scroll to top of page when notification appears
    useEffect(() => {
        if (notification.show) {
            // Small delay to ensure the notification is rendered
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }, [notification.show]);


    // Update selected investor when lead or investors change
    const fetchLead = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`/purchases/leads/${id}`);
            const leadData = response.data.data;
            setLead(leadData);
            setChassisNumber(leadData?.vehicleInfo?.vin || '');
            if (Array.isArray(leadData?.investorAllocations) && leadData.investorAllocations.length > 0) {
                setInvestorAllocations(
                    leadData.investorAllocations.map((allocation) => ({
                        investorId: allocation.investorId?._id || allocation.investorId,
                        ownershipPercentage: allocation.ownershipPercentage != null ? allocation.ownershipPercentage.toString() : (allocation.percentage != null ? allocation.percentage.toString() : ''),
                        amount: allocation.amount != null ? allocation.amount.toString() : '',
                        profitPercentage: allocation.profitPercentage != null ? allocation.profitPercentage.toString() : ''
                    }))
                );
            } else {
                setInvestorAllocations([]);
            }

            if (leadData.priceAnalysis) {
                setPriceAnalysis({
                    minSellingPrice: leadData.priceAnalysis.minSellingPrice || '',
                    maxSellingPrice: leadData.priceAnalysis.maxSellingPrice || '',
                    purchasedFinalPrice: leadData.priceAnalysis.purchasedFinalPrice || ''
                });
            }

            if (leadData.jobCosting) {
                setJobCosting({
                    transferCost: leadData.jobCosting.transferCost || '',
                    detailing_cost: leadData.jobCosting.detailing_cost || '',
                    agent_commision: leadData.jobCosting.agent_commision || '',
                    car_recovery_cost: leadData.jobCosting.car_recovery_cost || '',
                    inspection_cost: leadData.jobCosting.inspection_cost || ''
                });
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to fetch lead';
            showError(errorMessage);
        } finally {
            setLoading(false);
            setSavingInvestorAllocations(false);
        }
    }, [id, showError]);

    useEffect(() => {
        fetchLead();
    }, [fetchLead]);

    const handleFileSelect = (category, e) => {
        const files = Array.from(e.target.files);

        const validFiles = files.filter(file => {
            const isValid = file.type === 'application/pdf' ||
                file.type === 'image/png' ||
                file.type === 'image/jpeg' ||
                file.type === 'image/jpg';
            if (!isValid) {
                showError(`${file.name} is not a valid file type. Only PDF, PNG, and JPG are allowed.`);
            }
            return isValid;
        });

        const validSizeFiles = validFiles.filter(file => {
            const isValid = file.size <= 10 * 1024 * 1024;
            if (!isValid) {
                showError(`${file.name} is too large. Maximum file size is 10MB.`);
            }
            return isValid;
        });

        if (category === 'carPictures' || category === 'inspectionReport') {
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
        if ((category === 'carPictures' || category === 'inspectionReport') && index !== null) {
            const newFiles = documents[category].filter((_, i) => i !== index);
            setDocuments({ ...documents, [category]: newFiles });
        } else {
            setDocuments({ ...documents, [category]: null });
        }
    };

    const handleUpload = async () => {
        const hasFiles = documents.inspectionReport.length > 0 ||
            documents.registrationCard ||
            documents.carPictures.length > 0 ||
            documents.onlineHistoryCheck;

        if (!hasFiles) {
            showWarning('Please select at least one file to upload');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();

            documents.inspectionReport.forEach((file) => {
                formData.append('inspectionReport', file);
            });
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

            showSuccess('Documents uploaded successfully!');
            setDocuments({
                inspectionReport: [],
                registrationCard: null,
                carPictures: [],
                onlineHistoryCheck: null
            });
            setUploadProgress(0);
            fetchLead();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to upload documents');
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
            showError(err.response?.data?.message || 'Failed to view document');
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
            showError(err.response?.data?.message || 'Failed to download document');
        } finally {
            setDownloadingDocumentId(null);
        }
    };

    const handleViewDocuSignDocument = useCallback(async (doc) => {
        if (!doc?.documentId) {
            showError('Document not available');
            return;
        }
        if (!lead?.purchaseOrder?._id) {
            showError('Purchase order not found');
            return;
        }
        const docId = doc._id || doc.documentId;
        setViewingDocumentId(docId);
        try {
            const response = await axiosInstance.get(
                `/purchases/po/${lead.purchaseOrder._id}/documents/${docId}`,
                {
                    responseType: 'arraybuffer',
                    headers: { Accept: 'application/pdf' }
                }
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);

            const newWindow = window.open('', '_blank');
            if (newWindow && !newWindow.closed) {
                const safeTitle = (doc.name || 'Document').replace(/[<>&]/g, '');
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
            showError(err.response?.data?.message || 'Failed to view signed document');
        } finally {
            setViewingDocumentId(null);
        }
    }, [lead?.purchaseOrder?._id, showError]);

    const handleDownloadDocuSignDocument = useCallback(async (doc) => {
        if (!doc?.documentId) {
            showError('Document not available');
            return;
        }
        if (!lead?.purchaseOrder?._id) {
            showError('Purchase order not found');
            return;
        }
        const docId = doc._id || doc.documentId;
        setDownloadingDocumentId(docId);
        try {
            const response = await axiosInstance.get(
                `/purchases/po/${lead.purchaseOrder._id}/documents/${docId}`,
                {
                    responseType: 'arraybuffer',
                    headers: { Accept: 'application/pdf' }
                }
            );
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = doc.name || 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to download signed document');
        } finally {
            setDownloadingDocumentId(null);
        }
    }, [lead?.purchaseOrder?._id, showError]);

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
            showError(err.response?.data?.message || 'Failed to delete document');
        } finally {
            setIsDeletingDoc(false);
        }
    };

    const handleAddNote = async () => {
        if (!notes.trim()) {
            showWarning('Please enter a note');
            return;
        }

        try {
            await axiosInstance.put(`/purchases/leads/${id}/status`, {
                status: lead.status,
                notes: notes.trim()
            });
            showSuccess('Note added successfully!');
            setNotes('');
            fetchLead();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to add note');
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
            showWarning('Note content cannot be empty');
            return;
        }

        try {
            await axiosInstance.put(`/purchases/leads/${id}/notes/${noteId}`, {
                content: editingNoteContent.trim()
            });
            showSuccess('Note updated successfully!');
            setEditingNoteId(null);
            setEditingNoteContent('');
            fetchLead();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to update note');
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
            showError(err.response?.data?.message || 'Failed to delete note');
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
        const jc = lead?.jobCosting || {};
        return Boolean(pa.minSellingPrice && pa.maxSellingPrice && pa.purchasedFinalPrice && jc.transferCost && jc.detailing_cost);
    };

    const getInvestorDetails = useCallback((investorId) => {
        if (!investorId) return null;
        const fromList = investors.find(inv => inv._id === investorId);
        if (fromList) return fromList;
        const fromLead = lead?.investorAllocations?.find((allocation) => {
            const id = allocation.investorId?._id || allocation.investorId;
            return id === investorId;
        });
        if (fromLead) {
            const investorDoc = fromLead.investorId && typeof fromLead.investorId === 'object' && '_id' in fromLead.investorId
                ? fromLead.investorId
                : {};
            const remainingCredit =
                investorDoc?.creditLimit != null && investorDoc?.utilizedAmount != null
                    ? investorDoc.creditLimit - investorDoc.utilizedAmount
                    : undefined;
            return {
                _id: investorId,
                name: investorDoc?.name || fromLead.name || 'Investor',
                email: investorDoc?.email || fromLead.email,
                creditLimit: investorDoc?.creditLimit,
                utilizedAmount: investorDoc?.utilizedAmount,
                remainingCredit,
                decidedPercentageMin: investorDoc?.decidedPercentageMin ?? fromLead.decidedPercentageMin,
                decidedPercentageMax: investorDoc?.decidedPercentageMax ?? fromLead.decidedPercentageMax
            };
        }
        return null;
    }, [investors, lead]);

    const getInvestorRange = useCallback((investorId) => {
        const details = getInvestorDetails(investorId);
        return {
            min: details?.decidedPercentageMin ?? 0,
            max: details?.decidedPercentageMax ?? 100
        };
    }, [getInvestorDetails]);

    const getInvestorFundingStats = (investorId, requestedAmount) => {
        const details = getInvestorDetails(investorId);
        if (!details) return null;
        const creditLimit = Number(details.creditLimit || 0);
        const utilized = Number(details.utilizedAmount || 0);
        const remaining = creditLimit - utilized;
        const requested = Number(requestedAmount || 0);
        const remainingAfter = remaining - requested;
        return {
            creditLimit,
            utilized,
            remaining,
            requested,
            remainingAfter,
            name: details.name
        };
    };

    const getInvestorInitials = useCallback((investorId) => {
        const details = getInvestorDetails(investorId);
        const source = details?.name || details?.email || 'Investor';
        return source
            .split(/[\s@.]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || 'IN';
    }, [getInvestorDetails]);

    const docuSignEnvelopesByInvestor = useMemo(() => {
        const envelopes = lead?.purchaseOrder?.docuSignEnvelopes || [];
        return envelopes.reduce((acc, envelope) => {
            const investorKey = envelope?.investorId?._id || envelope?.investorId;
            if (investorKey) {
                acc[investorKey.toString()] = envelope;
            }
            return acc;
        }, {});
    }, [lead?.purchaseOrder?.docuSignEnvelopes]);



    const docuSignEnvelopeIdToInvestorMap = useMemo(() => {
        const envelopes = lead?.purchaseOrder?.docuSignEnvelopes || [];
        return envelopes.reduce((acc, envelope) => {
            if (envelope?.envelopeId) {
                const investorKey = envelope?.investorId?._id || envelope?.investorId;
                if (investorKey) {
                    acc[envelope.envelopeId] = investorKey.toString();
                }
            }
            return acc;
        }, {});
    }, [lead?.purchaseOrder?.docuSignEnvelopes]);

    const docuSignDocumentsByInvestor = useMemo(() => {
        const documents = lead?.purchaseOrder?.docuSignDocuments || [];
        return documents.reduce((acc, document) => {
            let investorKey = document?.investorId?._id || document?.investorId;
            if (!investorKey && document?.sourceEnvelopeId) {
                const mappedInvestor = docuSignEnvelopeIdToInvestorMap[document.sourceEnvelopeId];
                if (mappedInvestor) {
                    investorKey = mappedInvestor;
                }
            }
            if (investorKey) {
                const key = investorKey.toString();
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(document);
            }
            return acc;
        }, {});
    }, [lead?.purchaseOrder?.docuSignDocuments, docuSignEnvelopeIdToInvestorMap]);

    const getDocuSignEnvelopeForInvestor = useCallback((investorId) => {
        if (!investorId) return null;
        const key = investorId?._id ? investorId._id.toString() : investorId.toString();
        return docuSignEnvelopesByInvestor[key] || null;
    }, [docuSignEnvelopesByInvestor]);

    const getDocuSignDocumentsForInvestor = useCallback((investorId) => {
        if (!investorId) return [];
        const key = investorId?._id ? investorId._id.toString() : investorId.toString();
        return docuSignDocumentsByInvestor[key] || [];
    }, [docuSignDocumentsByInvestor]);

    const getDocuSignStatusMeta = useCallback((status) => {
        if (!status) return null;
        const normalized = status.toLowerCase();
        const statusConfig = {
            completed: {
                label: 'Signed',
                tone: 'success',
                icon: SignedIcon,
                description: 'Investor has signed the agreement.'
            },
            sent: {
                label: 'Pending Signature',
                tone: 'warning',
                icon: PendingIcon,
                description: 'Awaiting investor signature.'
            },
            delivered: {
                label: 'Viewed',
                tone: 'info',
                icon: PendingIcon,
                description: 'Investor has viewed the agreement.'
            },
            created: {
                label: 'Draft',
                tone: 'default',
                description: 'Envelope prepared in DocuSign.'
            },
            declined: {
                label: 'Declined',
                tone: 'danger',
                description: 'Investor declined to sign.'
            },
            voided: {
                label: 'Voided',
                tone: 'danger',
                description: 'Envelope was voided.'
            },
            failed: {
                label: 'Failed',
                tone: 'danger',
                description: 'Sending to investor failed.'
            }
        };

        const toneClasses = {
            success: 'bg-green-100 text-green-800 border-green-200',
            warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            info: 'bg-blue-100 text-blue-800 border-blue-200',
            danger: 'bg-red-100 text-red-800 border-red-200',
            default: 'bg-gray-100 text-gray-700 border-gray-200'
        };

        const config = statusConfig[normalized] || {
            label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
            tone: 'default',
            description: 'Envelope status updated.'
        };

        return {
            ...config,
            badgeClass: `inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold ${toneClasses[config.tone] || toneClasses.default}`,
            normalized
        };
    }, []);

    const formatDateTime = useCallback((value) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleString();
    }, []);

    const totalAmount = investorAllocations.reduce((sum, allocation) => {
        const value = parseFloat(allocation.amount);
        return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);

    // Calculate final price: purchasedFinalPrice + all job costs
    // Use state values if available (for real-time calculation), otherwise fall back to lead data
    // Ensure proper number conversion by converting to string first, removing commas, then parsing
    const purchasedFinalPriceFromState = priceAnalysis.purchasedFinalPrice
        ? parseFloat(String(priceAnalysis.purchasedFinalPrice).replace(/,/g, '').trim())
        : null;
    const purchasedFinalPriceFromLead = lead?.priceAnalysis?.purchasedFinalPrice
        ? parseFloat(String(lead.priceAnalysis.purchasedFinalPrice).replace(/,/g, '').trim())
        : 0;
    const purchasedFinalPrice = purchasedFinalPriceFromState !== null && !isNaN(purchasedFinalPriceFromState)
        ? purchasedFinalPriceFromState
        : (!isNaN(purchasedFinalPriceFromLead) ? purchasedFinalPriceFromLead : 0);

    // Use state values if available, otherwise fall back to lead data
    const jobCostingFromState = jobCosting;
    const jobCostingFromLead = lead?.jobCosting || {};
    const parseJobCostValue = (stateVal, leadVal) => {
        if (stateVal !== '' && stateVal != null) {
            const parsed = parseFloat(String(stateVal).replace(/,/g, '').trim());
            return !isNaN(parsed) ? parsed : 0;
        }
        if (leadVal !== '' && leadVal != null) {
            const parsed = parseFloat(String(leadVal).replace(/,/g, '').trim());
            return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
    };

    const jobCostingData = {
        transferCost: parseJobCostValue(jobCostingFromState.transferCost, jobCostingFromLead.transferCost),
        detailing_cost: parseJobCostValue(jobCostingFromState.detailing_cost, jobCostingFromLead.detailing_cost),
        agent_commision: parseJobCostValue(jobCostingFromState.agent_commision, jobCostingFromLead.agent_commision),
        car_recovery_cost: parseJobCostValue(jobCostingFromState.car_recovery_cost, jobCostingFromLead.car_recovery_cost),
        inspection_cost: parseJobCostValue(jobCostingFromState.inspection_cost, jobCostingFromLead.inspection_cost)
    };

    const finalPrice = purchasedFinalPrice +
        jobCostingData.transferCost +
        jobCostingData.detailing_cost +
        jobCostingData.agent_commision +
        jobCostingData.car_recovery_cost +
        jobCostingData.inspection_cost;
    const remainingPurchaseAmount = finalPrice > 0 ? Math.max(finalPrice - totalAmount, 0) : null;

    const formatCurrency = (value) => {
        if (value == null || Number.isNaN(Number(value))) return 'N/A';
        return Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const selectedInvestorIds = investorAllocations.map((allocation) => allocation.investorId);
    const availableInvestors = investors.filter((investor) => !selectedInvestorIds.includes(investor._id));

    const saveInvestorAllocations = useCallback(async (allocations) => {
        if (!Array.isArray(allocations)) {
            return;
        }

        try {
            setSavingInvestorAllocations(true);

            if (allocations.length === 0) {
                await axiosInstance.put(`/purchases/leads/${id}/investor`, {
                    investorAllocations: []
                });
                setLead((prev) => (prev ? { ...prev, investorAllocations: [] } : prev));
                return;
            }

            let runningAmount = 0;
            let runningPercentage = 0;

            // Calculate final price for validation (use same logic as getCurrentFinalPrice)
            const parseCost = (val) => {
                if (val !== '' && val != null) {
                    const parsed = parseFloat(String(val).replace(/,/g, '').trim());
                    return !isNaN(parsed) ? parsed : 0;
                }
                return 0;
            };

            const purchasedFinalPriceForValidation = priceAnalysis.purchasedFinalPrice
                ? parseFloat(String(priceAnalysis.purchasedFinalPrice).replace(/,/g, '').trim())
                : (lead?.priceAnalysis?.purchasedFinalPrice
                    ? parseFloat(String(lead.priceAnalysis.purchasedFinalPrice).replace(/,/g, '').trim())
                    : 0);

            const finalPriceForValidation = (isNaN(purchasedFinalPriceForValidation) ? 0 : purchasedFinalPriceForValidation) +
                parseCost(jobCosting.transferCost || lead?.jobCosting?.transferCost) +
                parseCost(jobCosting.detailing_cost || lead?.jobCosting?.detailing_cost) +
                parseCost(jobCosting.agent_commision || lead?.jobCosting?.agent_commision) +
                parseCost(jobCosting.car_recovery_cost || lead?.jobCosting?.car_recovery_cost) +
                parseCost(jobCosting.inspection_cost || lead?.jobCosting?.inspection_cost);

            const payload = allocations.map((allocation) => {
                // Ownership percentage (for calculating amount)
                const ownershipPercentageStr = allocation.ownershipPercentage || allocation.percentage || '';
                const ownershipPercentage = ownershipPercentageStr !== '' ? parseFloat(String(ownershipPercentageStr).replace(/,/g, '').trim()) : 0;
                if (Number.isNaN(ownershipPercentage) || ownershipPercentage <= 0) {
                    throw new Error('Each investor allocation must have a valid ownership percentage greater than 0.');
                }
                if (ownershipPercentage > 100) {
                    throw new Error('Ownership percentage cannot exceed 100%.');
                }

                // Calculate amount based on ownership percentage and final price
                // Use more precise calculation to avoid rounding errors
                let amount = 0;
                const amountStr = allocation.amount || '';
                if (amountStr !== '' && amountStr !== null && amountStr !== undefined) {
                    amount = parseFloat(String(amountStr).replace(/,/g, '').trim());
                    if (Number.isNaN(amount)) {
                        // If amount is invalid, calculate from percentage
                        amount = finalPriceForValidation > 0 ? Math.round(((ownershipPercentage / 100) * finalPriceForValidation) * 100) / 100 : 0;
                    }
                } else {
                    // Calculate from percentage if amount not provided
                    amount = finalPriceForValidation > 0 ? Math.round(((ownershipPercentage / 100) * finalPriceForValidation) * 100) / 100 : 0;
                }

                if (amount <= 0) {
                    throw new Error('Each investor allocation must have a valid amount greater than 0.');
                }
                if (finalPriceForValidation > 0 && amount > finalPriceForValidation) {
                    throw new Error('Investor amount cannot exceed the final price.');
                }

                runningAmount += amount;
                runningPercentage += ownershipPercentage;

                return {
                    investorId: allocation.investorId,
                    ownershipPercentage,
                    amount,
                    profitPercentage: allocation.profitPercentage != null && allocation.profitPercentage !== '' ? parseFloat(allocation.profitPercentage) : undefined
                };
            });

            if (runningPercentage > 100.0001) {
                throw new Error('Total ownership percentage cannot exceed 100%.');
            }

            if (finalPriceForValidation > 0 && runningAmount > finalPriceForValidation + 0.0001) {
                throw new Error('Total investor amount cannot exceed the final price.');
            }

            await axiosInstance.put(`/purchases/leads/${id}/investor`, {
                investorAllocations: payload.map(({ investorId, ownershipPercentage, amount, profitPercentage }) => ({
                    investorId,
                    ownershipPercentage,
                    amount,
                    profitPercentage: profitPercentage !== undefined ? profitPercentage : null
                }))
            });
            setLead((prev) => {
                if (!prev) {
                    return prev;
                }
                const previousAllocations = Array.isArray(prev.investorAllocations) ? prev.investorAllocations : [];
                const merged = payload.map((item) => {
                    const existing = previousAllocations.find((existingAllocation) => {
                        const existingId = existingAllocation?.investorId?._id || existingAllocation?.investorId;
                        return existingId === item.investorId;
                    });
                    if (existing && existing.investorId && typeof existing.investorId === 'object') {
                        return {
                            ...existing,
                            percentage: item.percentage,
                            amount: item.amount
                        };
                    }
                    return { ...item };
                });
                return {
                    ...prev,
                    investorAllocations: merged
                };
            });
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to save investor allocations');
        } finally {
            setSavingInvestorAllocations(false);
        }
    }, [id, priceAnalysis.purchasedFinalPrice, jobCosting, lead, showError]);

    // Helper to get the latest final price for investor calculations
    const getCurrentFinalPrice = useCallback(() => {
        const currentPurchasedFinalPrice = priceAnalysis.purchasedFinalPrice
            ? parseFloat(String(priceAnalysis.purchasedFinalPrice).replace(/,/g, '').trim())
            : (lead?.priceAnalysis?.purchasedFinalPrice
                ? parseFloat(String(lead.priceAnalysis.purchasedFinalPrice).replace(/,/g, '').trim())
                : 0);

        const parseCost = (val) => {
            if (val !== '' && val != null) {
                const parsed = parseFloat(String(val).replace(/,/g, '').trim());
                return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
        };

        return (isNaN(currentPurchasedFinalPrice) ? 0 : currentPurchasedFinalPrice) +
            parseCost(jobCosting.transferCost || lead?.jobCosting?.transferCost) +
            parseCost(jobCosting.detailing_cost || lead?.jobCosting?.detailing_cost) +
            parseCost(jobCosting.agent_commision || lead?.jobCosting?.agent_commision) +
            parseCost(jobCosting.car_recovery_cost || lead?.jobCosting?.car_recovery_cost) +
            parseCost(jobCosting.inspection_cost || lead?.jobCosting?.inspection_cost);
    }, [priceAnalysis.purchasedFinalPrice, jobCosting, lead]);


    const handleRemoveInvestor = (investorId) => {
        // Normalize investorId for comparison (handle both object and string)
        const normalizedId = investorId?._id ? investorId._id.toString() : investorId?.toString();

        // Calculate the updated allocations
        const updated = investorAllocations.filter((allocation) => {
            const allocationId = allocation.investorId?._id ? allocation.investorId._id.toString() : allocation.investorId?.toString();
            return allocationId !== normalizedId;
        });

        // Update state
        setInvestorAllocations(updated);

        // Save the updated allocations to backend
        saveInvestorAllocations(updated);
    };

    const handleNewInvestorOwnershipPercentageChange = (value) => {
        const cleanValue = value.replace(/[^\d.]/g, '');
        lastNewInvestorInputRef.current = 'percentage';
        setNewInvestorOwnershipPercentage(cleanValue);
    };

    const handleNewInvestorAmountChange = (value) => {
        // Parse the formatted value (remove commas) before storing
        const parsedValue = parseFormattedNumber(value);
        lastNewInvestorInputRef.current = 'amount';
        setNewInvestorAmount(parsedValue);
    };

    const handleAddInvestor = () => {
        if (!newInvestorId) {
            showError('Please select an investor to add.');
            return;
        }
        if (investorAllocations.some((allocation) => allocation.investorId === newInvestorId)) {
            showError('Investor already added.');
            return;
        }

        // Use the same final price calculation as the save function
        const currentFinalPrice = getCurrentFinalPrice();

        // Calculate ownership percentage and amount
        let ownershipPercentageValue = 0;
        let amountValue = 0;

        if (newInvestorOwnershipPercentage !== '' && !Number.isNaN(parseFloat(newInvestorOwnershipPercentage))) {
            ownershipPercentageValue = parseFloat(newInvestorOwnershipPercentage);
            if (currentFinalPrice > 0) {
                // Use more precise calculation to avoid rounding errors
                // Ensure we're working with actual numbers
                const ownershipPerc = Number(ownershipPercentageValue);
                const finalPriceNum = Number(currentFinalPrice);
                amountValue = Math.round(((ownershipPerc / 100) * finalPriceNum) * 100) / 100;
            } else {
                showError('Final price must be greater than 0 to calculate amount from percentage.');
                return;
            }
        } else if (newInvestorAmount !== '' && !Number.isNaN(parseFloat(newInvestorAmount))) {
            amountValue = parseFloat(newInvestorAmount);
            if (currentFinalPrice > 0) {
                const amountNum = Number(amountValue);
                const finalPriceNum = Number(currentFinalPrice);
                ownershipPercentageValue = Number(((amountNum / finalPriceNum) * 100).toFixed(2));
            } else {
                showError('Final price must be greater than 0 to calculate percentage from amount.');
                return;
            }
        } else {
            showError('Please enter either ownership percentage or amount.');
            return;
        }

        if (ownershipPercentageValue <= 0 || ownershipPercentageValue > 100) {
            showError('Ownership percentage must be between 0 and 100.');
            return;
        }

        if (amountValue <= 0) {
            showError('Amount must be greater than 0.');
            return;
        }

        if (currentFinalPrice > 0) {
            if (amountValue > currentFinalPrice) {
                showError('Investor amount cannot exceed the final price.');
                return;
            }
            const newTotalAmount = totalAmount + amountValue;
            if (newTotalAmount > currentFinalPrice + 0.0001) {
                showError('Total investor amount cannot exceed the final price.');
                return;
            }
        }

        // Validate profit percentage (required)
        if (!newInvestorProfitPercentage || newInvestorProfitPercentage === '') {
            showError('Please enter profit percentage.');
            return;
        }

        const profitPercentageValue = parseFloat(newInvestorProfitPercentage);
        if (Number.isNaN(profitPercentageValue) || profitPercentageValue < 0) {
            showError('Profit percentage must be a valid non-negative number.');
            return;
        }

        const { min, max } = getInvestorRange(newInvestorId);
        if (profitPercentageValue < min || profitPercentageValue > max) {
            showError(`Profit percentage must be between ${min}% and ${max}%`);
            return;
        }

        const updated = [
            ...investorAllocations,
            {
                investorId: newInvestorId,
                ownershipPercentage: ownershipPercentageValue.toString(),
                percentage: ownershipPercentageValue.toString(), // Keep for backward compatibility
                amount: amountValue.toString(),
                profitPercentage: profitPercentageValue.toString()
            }
        ];

        setInvestorAllocations(updated);
        setNewInvestorId('');
        setNewInvestorOwnershipPercentage('');
        setNewInvestorAmount('');
        setNewInvestorProfitPercentage('');
        lastNewInvestorInputRef.current = null;

        // Save directly when adding investor
        saveInvestorAllocations(updated);
    };

    useEffect(() => {
        setNewInvestorOwnershipPercentage('');
        setNewInvestorAmount('');
        setNewInvestorProfitPercentage('');
        lastNewInvestorInputRef.current = null;
    }, [newInvestorId]);

    // Auto-calculate amount when ownership percentage changes
    useEffect(() => {
        if (!newInvestorId || lastNewInvestorInputRef.current !== 'percentage') {
            return;
        }
        const currentFinalPrice = getCurrentFinalPrice();
        if (currentFinalPrice <= 0) {
            setNewInvestorAmount('');
            return;
        }
        const ownershipPercentage = parseFloat(newInvestorOwnershipPercentage);
        if (Number.isNaN(ownershipPercentage) || ownershipPercentage < 0) {
            setNewInvestorAmount('');
            return;
        }
        const calculatedAmountValue = (ownershipPercentage / 100) * currentFinalPrice;
        if (!Number.isFinite(calculatedAmountValue)) {
            setNewInvestorAmount('');
            return;
        }
        const defaultAmount = Math.round(calculatedAmountValue * 100) / 100;
        setNewInvestorAmount(defaultAmount.toFixed(2));
    }, [newInvestorOwnershipPercentage, newInvestorId, getCurrentFinalPrice]);

    // Auto-calculate ownership percentage when amount changes
    useEffect(() => {
        if (!newInvestorId || lastNewInvestorInputRef.current !== 'amount') {
            return;
        }
        const currentFinalPrice = getCurrentFinalPrice();
        if (currentFinalPrice <= 0) {
            setNewInvestorOwnershipPercentage('');
            return;
        }
        const amount = parseFloat(newInvestorAmount);
        if (Number.isNaN(amount) || amount < 0) {
            setNewInvestorOwnershipPercentage('');
            return;
        }
        const calculatedPercentageValue = (amount / currentFinalPrice) * 100;
        if (!Number.isFinite(calculatedPercentageValue)) {
            setNewInvestorOwnershipPercentage('');
            return;
        }
        setNewInvestorOwnershipPercentage(calculatedPercentageValue.toFixed(2));
    }, [newInvestorAmount, newInvestorId, getCurrentFinalPrice]);

    const newInvestorStats = newInvestorId ? getInvestorFundingStats(newInvestorId, newInvestorAmount || 0) : null;

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

    const hasInvestors = investorAllocations.length > 0;
    const allInvestorsHavePayment = hasInvestors && investorAllocations.every((allocation) => {
        const investorRaw = allocation?.investorId?._id || allocation?.investorId;
        if (!investorRaw) return false;
        const investorKey = investorRaw.toString();
        return Boolean(perInvestorPayments[investorKey]?.modeOfPayment);
    });
    const canSubmitPurchase = hasInvestors
        && Boolean(invoicePaymentDetails.paymentReceivedBy)
        && allInvestorsHavePayment
        && !purchasing;

    const handleSubmitForApproval = async () => {
        // Check if job costing is complete
        const jobCostingData = lead?.jobCosting || {};
        const needJobCosting = !jobCostingData.transferCost || !jobCostingData.detailing_cost;

        if (user?.role === 'admin' && needJobCosting) {
            showWarning('Please complete the job costing fields (Transfer Cost and Detailing Cost) in the Pricing & Job Costings tab before submitting for approval.');
            setActiveTab('pricing');
            return;
        }

        setSubmittingApproval(true);
        try {
            await axiosInstance.post(`/purchases/leads/${id}/submit-approval`);
            await fetchLead();
            showSuccess('Lead submitted for approval successfully!');
        } catch (e) {
            showError(e?.response?.data?.message || 'Failed to submit for approval');
        } finally {
            setSubmittingApproval(false);
        }
    };

    const handleApprove = async () => {
        setApproving(true);
        try {
            await axiosInstance.post(`/purchases/leads/${id}/approve`);
            await fetchLead();
            showSuccess('Lead approved successfully!');
        } catch (e) {
            showError(e?.response?.data?.message || 'Failed to approve');
        } finally {
            setApproving(false);
        }
    };


    const handleDecline = async () => {
        setDeclining(true);
        try {
            await axiosInstance.post(`/purchases/leads/${id}/decline`);
            await fetchLead();
            showSuccess('Lead declined successfully!');
        } catch (e) {
            showError(e?.response?.data?.message || 'Failed to decline');
        } finally {
            setDeclining(false);
        }
    };

    const handlePurchase = () => {
        // Reset payment details and show invoice modal
        setInvoicePaymentDetails({
            paymentReceivedBy: ''
        });
        setPerInvestorPayments({});
        setShowInvoiceModal(true);
    };

    const confirmPurchase = async () => {
        if (!invoicePaymentDetails.paymentReceivedBy) {
            showWarning('Please select who received the payment');
            return;
        }

        const perInvestorPayload = investorAllocations
            .map((allocation) => {
                const investorRaw = allocation?.investorId?._id || allocation?.investorId;
                if (!investorRaw) return null;
                const investorId = investorRaw.toString();
                return {
                    investorId,
                    modeOfPayment: perInvestorPayments[investorId]?.modeOfPayment || '',
                    paymentReceivedBy: invoicePaymentDetails.paymentReceivedBy || ''
                };
            })
            .filter(Boolean);

        const missingPayment = perInvestorPayload.find((entry) => !entry.modeOfPayment || !entry.paymentReceivedBy);
        if (missingPayment) {
            showWarning('Please ensure every investor has a mode of payment and payment received by.');
            return;
        }

        setPurchasing(true);
        try {
            const response = await axiosInstance.post(`/purchases/leads/${id}/purchase`, {
                paymentReceivedBy: invoicePaymentDetails.paymentReceivedBy,
                investorPayments: perInvestorPayload
            });
            if (response.data.success) {
                await fetchLead();
                setShowInvoiceModal(false);
                setInvoicePaymentDetails({
                    paymentReceivedBy: ''
                });
                setPerInvestorPayments({});
                showSuccess('Lead converted to vehicle successfully and invoice sent to investor');
                setTimeout(() => {
                    navigate('/purchases/inventory');
                }, 1500);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            showError(error.response?.data?.message || 'Failed to convert lead to vehicle');
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
        // Parse the formatted value (remove commas) before storing
        const parsedValue = parseFormattedNumber(value);
        setPriceAnalysis({
            ...priceAnalysis,
            [field]: parsedValue
        });
    };

    const handleSavePriceAnalysis = async () => {
        if (!priceAnalysis.minSellingPrice && !priceAnalysis.maxSellingPrice) {
            showWarning('Please enter at least Minimum or Maximum Selling Price');
            return;
        }

        const minPrice = parseFloat(priceAnalysis.minSellingPrice);
        const maxPrice = parseFloat(priceAnalysis.maxSellingPrice);
        const finalPrice = parseFloat(priceAnalysis.purchasedFinalPrice);

        if (priceAnalysis.minSellingPrice && (isNaN(minPrice) || minPrice <= 0)) {
            showError('Minimum Selling Price must be a valid positive number');
            return;
        }

        if (priceAnalysis.maxSellingPrice && (isNaN(maxPrice) || maxPrice <= 0)) {
            showError('Maximum Selling Price must be a valid positive number');
            return;
        }

        if (priceAnalysis.purchasedFinalPrice && (isNaN(finalPrice) || finalPrice <= 0)) {
            showError('Purchased Final Price must be a valid positive number');
            return;
        }

        if (priceAnalysis.minSellingPrice && priceAnalysis.maxSellingPrice && minPrice > maxPrice) {
            showError('Minimum Selling Price cannot be greater than Maximum Selling Price');
            return;
        }

        setSavingPrice(true);
        try {
            await axiosInstance.put(`/purchases/leads/${id}/price-analysis`, {
                minSellingPrice: priceAnalysis.minSellingPrice ? parseFloat(priceAnalysis.minSellingPrice) : null,
                maxSellingPrice: priceAnalysis.maxSellingPrice ? parseFloat(priceAnalysis.maxSellingPrice) : null,
                purchasedFinalPrice: priceAnalysis.purchasedFinalPrice ? parseFloat(priceAnalysis.purchasedFinalPrice) : null,
                vin: chassisNumber || null,
                jobCosting: {
                    transferCost: jobCosting.transferCost ? parseFloat(jobCosting.transferCost) : 0,
                    detailing_cost: jobCosting.detailing_cost ? parseFloat(jobCosting.detailing_cost) : 0,
                    agent_commision: jobCosting.agent_commision ? parseFloat(jobCosting.agent_commision) : 0,
                    car_recovery_cost: jobCosting.car_recovery_cost ? parseFloat(jobCosting.car_recovery_cost) : 0,
                    inspection_cost: jobCosting.inspection_cost ? parseFloat(jobCosting.inspection_cost) : 0
                }
            });
            showSuccess('Price analysis and job costing saved successfully!');
            fetchLead();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save price analysis');
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

    const calculateProfit = (sellingPrice, purchasedPrice) => {
        if (!sellingPrice || !purchasedPrice) return null;
        const profit = parseFloat(sellingPrice) - parseFloat(purchasedPrice);
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

    const minProfit = calculateProfit(priceAnalysis.minSellingPrice, finalPrice);
    const maxProfit = calculateProfit(priceAnalysis.maxSellingPrice, finalPrice);

    return (
        <DashboardLayout title={`Inspection ${lead?.leadId || 'Detail'}`}>
            {/* Notification */}
            {notification.show && (
                <div
                    className={`mb-4 border-l-4 p-4 rounded-r-lg ${notification.type === 'success' ? 'bg-green-50 border-green-400' :
                        notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                            'bg-red-50 border-red-400'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex">
                            {notification.type === 'success' ? (
                                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : notification.type === 'warning' ? (
                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                            <p className={`ml-3 text-sm ${notification.type === 'success' ? 'text-green-700' :
                                notification.type === 'warning' ? 'text-yellow-700' :
                                    'text-red-700'
                                }`}>{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification({ show: false, message: '', type: 'error' })}
                            className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
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

            {/* Price Summary Card - Sticky */}
            {(priceAnalysis.minSellingPrice || priceAnalysis.maxSellingPrice || priceAnalysis.purchasedFinalPrice || finalPrice > 0) && (
                <div className="sticky top-[10px] z-40 mb-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow-lg p-3 text-white">
                        <h3 className="text-xs font-medium text-indigo-100 mb-2">Price Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {priceAnalysis.purchasedFinalPrice && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                                    <div className="text-[10px] text-indigo-100 mb-0.5">Purchase Price</div>
                                    <div className="text-base font-bold">
                                        AED {parseFloat(priceAnalysis.purchasedFinalPrice).toLocaleString()}
                                    </div>
                                </div>
                            )}
                            {finalPrice > 0 && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                                    <div className="text-[10px] text-indigo-100 mb-0.5">Final Price</div>
                                    <div className="text-base font-bold">
                                        AED {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            )}
                            {priceAnalysis.minSellingPrice && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                                    <div className="text-[10px] text-indigo-100 mb-0.5">Min Selling</div>
                                    <div className="text-base font-bold">
                                        AED {parseFloat(priceAnalysis.minSellingPrice).toLocaleString()}
                                    </div>
                                </div>
                            )}
                            {priceAnalysis.maxSellingPrice && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                                    <div className="text-[10px] text-indigo-100 mb-0.5">Max Selling</div>
                                    <div className="text-base font-bold">
                                        AED {parseFloat(priceAnalysis.maxSellingPrice).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                        Pricing & Job Costings
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
                                                        type="text"
                                                        value={formatNumberWithCommas(priceAnalysis.minSellingPrice)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            handlePriceAnalysisChange('minSellingPrice', value);
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-lg font-semibold ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
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
                                                        type="text"
                                                        value={formatNumberWithCommas(priceAnalysis.maxSellingPrice)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            handlePriceAnalysisChange('maxSellingPrice', value);
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-lg font-semibold ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
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
                                                        type="text"
                                                        value={formatNumberWithCommas(priceAnalysis.purchasedFinalPrice)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            handlePriceAnalysisChange('purchasedFinalPrice', value);
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-lg font-semibold ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Final purchase price to calculate profit</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Job Costing Section */}
                                    <div className="border-t border-gray-200 pt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Costings</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Transfer Cost (RTA) <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formatNumberWithCommas(jobCosting.transferCost)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            setJobCosting({ ...jobCosting, transferCost: value });
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-base ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Detailing Cost <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formatNumberWithCommas(jobCosting.detailing_cost)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            setJobCosting({ ...jobCosting, detailing_cost: value });
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-base ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Agent Commission
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formatNumberWithCommas(jobCosting.agent_commision)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            setJobCosting({ ...jobCosting, agent_commision: value });
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-base ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Car Recovery Cost
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formatNumberWithCommas(jobCosting.car_recovery_cost)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            setJobCosting({ ...jobCosting, car_recovery_cost: value });
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-base ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Inspection Cost
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">AED</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formatNumberWithCommas(jobCosting.inspection_cost)}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            setJobCosting({ ...jobCosting, inspection_cost: value });
                                                        }}
                                                        onWheel={(e) => e.target.blur()}
                                                        disabled={isSubmittedForApproval()}
                                                        className={`w-full pl-14 pr-3 py-3 border-2 rounded-lg text-base ${isSubmittedForApproval()
                                                            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                                            }`}
                                                        placeholder="0.00"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Final Price Display */}
                                        {priceAnalysis.purchasedFinalPrice && (
                                            <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Final Price</div>
                                                        <div className="text-2xl font-bold text-indigo-700">
                                                            AED {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-xs text-indigo-600 mt-1">
                                                            Purchase Price ({purchasedFinalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + All Job Costings
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                    Enter the purchase price and job costings. The final price will be used for investor allocation.
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Profit Analysis Cards */}
                                    {finalPrice > 0 && (priceAnalysis.minSellingPrice || priceAnalysis.maxSellingPrice) && (
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

                                    {(documents.inspectionReport.length > 0 || documents.registrationCard || documents.carPictures.length > 0 || documents.onlineHistoryCheck) && !uploading && (
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
                                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium text-gray-700">Investor Allocations</label>
                                                    {savingInvestorAllocations && (
                                                        <span className="inline-flex items-center gap-1 text-primary-600 text-xs">
                                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Saving changes...
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Price Summary Cards */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {finalPrice > 0 && (
                                                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4 shadow-sm">
                                                            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-2">Final Price</div>
                                                            <div className="text-xl font-bold text-indigo-900 mb-2">
                                                                AED {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="text-xs text-indigo-600 font-medium">
                                                                Purchase: AED {purchasedFinalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className={`rounded-xl p-4 border-2 shadow-sm ${totalAmount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                                        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${totalAmount > 0 ? 'text-blue-600' : 'text-gray-500'}`}>Total Allocated</div>
                                                        <div className={`text-xl font-bold ${totalAmount > 0 ? 'text-blue-900' : 'text-gray-700'}`}>
                                                            AED {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    {finalPrice > 0 && (
                                                        <div className={`rounded-xl p-4 border-2 shadow-sm ${remainingPurchaseAmount === 0 ? 'bg-green-50 border-green-200' : remainingPurchaseAmount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                                            <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${remainingPurchaseAmount === 0 ? 'text-green-600' : remainingPurchaseAmount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Remaining Needed</div>
                                                            <div className={`text-xl font-bold ${remainingPurchaseAmount === 0 ? 'text-green-900' : remainingPurchaseAmount > 0 ? 'text-amber-900' : 'text-gray-700'}`}>
                                                                AED {remainingPurchaseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {investorAllocations.length === 0 ? (
                                                <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">
                                                    No investors assigned yet. Add investors below to fund this purchase.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {investorAllocations.map((allocation, index) => {
                                                        const details = getInvestorDetails(allocation.investorId);
                                                        const { min, max } = getInvestorRange(allocation.investorId);
                                                        const fundingStats = getInvestorFundingStats(allocation.investorId, allocation.amount);
                                                        const envelope = getDocuSignEnvelopeForInvestor(allocation.investorId);
                                                        const docuSignStatusMeta = getDocuSignStatusMeta(envelope?.status);
                                                        const sentAtText = envelope?.sentAt ? `Sent ${formatDateTime(envelope.sentAt)}` : null;
                                                        const completedAtText = docuSignStatusMeta?.normalized === 'completed'
                                                            ? formatDateTime(envelope?.completedAt || lead?.purchaseOrder?.docuSignSignedAt)
                                                            : null;
                                                        const docuSignDocs = getDocuSignDocumentsForInvestor(allocation.investorId);

                                                        return (
                                                            <div
                                                                key={allocation.investorId}
                                                                className="border border-gray-200 rounded-2xl bg-white px-5 py-6 shadow-sm"
                                                            >
                                                                <div className="flex flex-col gap-5">
                                                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-lg font-semibold text-blue-700">
                                                                                {getInvestorInitials(allocation.investorId)}
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="text-base font-semibold text-gray-900">{details?.name || 'Investor'}</div>
                                                                                {details?.email && (
                                                                                    <div className="text-xs text-gray-500">{details.email}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-start gap-2 lg:items-end">
                                                                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
                                                                                <span className="uppercase tracking-wide text-[11px] text-blue-500">Allowed Range</span>
                                                                                <span className="text-sm font-semibold text-blue-900">{min}% – {max}%</span>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                                                                    DocuSign
                                                                                </div>
                                                                                {docuSignStatusMeta ? (
                                                                                    <div className="flex flex-col items-start gap-1 lg:items-end">
                                                                                        <span className={docuSignStatusMeta.badgeClass}>
                                                                                            {docuSignStatusMeta.icon && (
                                                                                                <img src={docuSignStatusMeta.icon} alt={docuSignStatusMeta.label} className="h-3.5 w-3.5" />
                                                                                            )}
                                                                                            {docuSignStatusMeta.label}
                                                                                        </span>
                                                                                        <div className="text-[11px] text-gray-500 leading-snug max-w-[200px]">
                                                                                            {docuSignStatusMeta.description}
                                                                                            {completedAtText && (
                                                                                                <span className="block text-[11px] text-gray-400">
                                                                                                    Signed {completedAtText}
                                                                                                </span>
                                                                                            )}
                                                                                            {!completedAtText && sentAtText && (
                                                                                                <span className="block text-[11px] text-gray-400">
                                                                                                    {sentAtText}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-[11px] text-gray-400 font-medium">
                                                                                        Not sent yet
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {docuSignDocs.length > 0 && (
                                                                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                                                                            <div className="mb-2 flex items-center justify-between">
                                                                                <span className="font-semibold text-blue-900">Signed Documents</span>
                                                                                <span className="text-[11px] text-blue-600">{docuSignDocs.length}</span>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                {docuSignDocs.map((doc, docIndex) => {
                                                                                    const docKey = doc._id || doc.documentId || `${allocation.investorId}-${docIndex}`;
                                                                                    const keyId = doc._id || doc.documentId;
                                                                                    const isViewing = keyId && viewingDocumentId === keyId;
                                                                                    const isDownloading = keyId && downloadingDocumentId === keyId;
                                                                                    return (
                                                                                        <div key={docKey} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                                                                                            <div className="mr-3 min-w-0">
                                                                                                <div className="truncate text-sm font-semibold text-gray-900">{doc.name || 'Document'}</div>
                                                                                                <div className="text-[11px] text-gray-500">
                                                                                                    {doc.fileSize ? formatFileSize(doc.fileSize) : 'PDF Document'}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <button
                                                                                                    onClick={() => handleViewDocuSignDocument(doc)}
                                                                                                    disabled={isViewing || isDownloading}
                                                                                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                >
                                                                                                    {isViewing ? (
                                                                                                        <span className="flex items-center gap-1">
                                                                                                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                                            </svg>
                                                                                                            Viewing...
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        'View'
                                                                                                    )}
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleDownloadDocuSignDocument(doc)}
                                                                                                    disabled={isDownloading}
                                                                                                    className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                >
                                                                                                    {isDownloading ? (
                                                                                                        <span className="flex items-center gap-1">
                                                                                                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                                            </svg>
                                                                                                            Downloading...
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        'Download'
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {fundingStats && (
                                                                        <div className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                                                                            {[
                                                                                { label: 'Credit Limit', value: fundingStats.creditLimit, tone: 'default' },
                                                                                { label: 'Utilized', value: fundingStats.utilized, tone: 'default' },
                                                                                { label: 'Available Before Allocation', value: fundingStats.remaining, tone: 'default' },
                                                                                { label: 'Available After Allocation', value: fundingStats.remainingAfter, tone: fundingStats.remainingAfter < 0 ? 'negative' : 'positive' }
                                                                            ].map((item, tileIndex) => (
                                                                                <div
                                                                                    key={`${allocation.investorId}-${tileIndex}`}
                                                                                    className={`flex flex-col rounded-xl border px-4 py-3 ${item.tone === 'positive'
                                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                                        : item.tone === 'negative'
                                                                                            ? 'border-red-200 bg-red-50 text-red-700'
                                                                                            : 'border-gray-200 bg-gray-50 text-gray-900'
                                                                                        }`}
                                                                                >
                                                                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
                                                                                    <div className="text-sm font-semibold">AED {formatCurrency(item.value)}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <hr className="border-gray-100" />

                                                                    {/* Allocation Details Card */}
                                                                    <div className="grid gap-3 text-xs sm:grid-cols-3">
                                                                        {[
                                                                            {
                                                                                label: 'Ownership %',
                                                                                value: allocation.ownershipPercentage || allocation.percentage || '0',
                                                                                suffix: '%',
                                                                                tone: 'default'
                                                                            },
                                                                            {
                                                                                label: 'Amount',
                                                                                value: allocation.amount || '0',
                                                                                suffix: 'AED',
                                                                                tone: 'default'
                                                                            },
                                                                            {
                                                                                label: 'Profit %',
                                                                                value: allocation.profitPercentage || 'N/A',
                                                                                suffix: allocation.profitPercentage ? '%' : '',
                                                                                tone: 'default'
                                                                            },
                                                                        ].map((item, tileIndex) => (
                                                                            <div
                                                                                key={`${allocation.investorId}-allocation-${tileIndex}`}
                                                                                className="flex flex-col rounded-xl border px-4 py-3 border-gray-200 bg-gray-50 text-gray-900"
                                                                            >
                                                                                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
                                                                                <div className="text-sm font-semibold">
                                                                                    {item.suffix === 'AED'
                                                                                        ? `AED ${formatCurrency(item.value)}`
                                                                                        : item.value === 'N/A'
                                                                                            ? 'N/A'
                                                                                            : `${item.value}${item.suffix}`
                                                                                    }
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {!isSubmittedForApproval() && (
                                                                        <div className="flex justify-end">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveInvestor(allocation.investorId)}
                                                                                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:text-red-700"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {!isSubmittedForApproval() && remainingPurchaseAmount !== 0 && remainingPurchaseAmount !== null && (
                                                <div className="border-t border-gray-100 pt-6 space-y-6">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-gray-900 mb-4">Add New Investor</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                                            {/* Investor Dropdown */}
                                                            <div className="lg:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Investor <span className="text-red-500">*</span>
                                                                </label>
                                                                <select
                                                                    value={newInvestorId}
                                                                    onChange={(e) => setNewInvestorId(e.target.value)}
                                                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                                                >
                                                                    <option value="">Select investor...</option>
                                                                    {availableInvestors.map((inv) => (
                                                                        <option key={inv._id} value={inv._id}>
                                                                            {inv.name} ({inv.email})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            {/* Ownership Percentage */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Ownership % <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={newInvestorOwnershipPercentage}
                                                                    onChange={(e) => handleNewInvestorOwnershipPercentageChange(e.target.value)}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                                    placeholder="0.0"
                                                                />
                                                            </div>

                                                            {/* Amount */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Amount (AED) <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={formatNumberWithCommas(newInvestorAmount)}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value.replace(/[^\d.]/g, '');
                                                                        handleNewInvestorAmountChange(value);
                                                                    }}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                                                    placeholder="0.00"
                                                                    inputMode="decimal"
                                                                />
                                                            </div>

                                                            {/* Profit Percentage */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Profit % <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={newInvestorProfitPercentage}
                                                                    onChange={(e) => {
                                                                        const cleanValue = e.target.value.replace(/[^\d.]/g, '');
                                                                        setNewInvestorProfitPercentage(cleanValue);
                                                                    }}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    min={newInvestorId ? getInvestorRange(newInvestorId).min : 0}
                                                                    max={newInvestorId ? getInvestorRange(newInvestorId).max : 100}
                                                                    step="0.1"
                                                                    disabled={!newInvestorId}
                                                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                                    placeholder="0.0"
                                                                />
                                                                {newInvestorId && (
                                                                    <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                                                                        Range: {getInvestorRange(newInvestorId).min}% - {getInvestorRange(newInvestorId).max}%
                                                                    </p>
                                                                )}
                                                            </div>

                                                        </div>

                                                        {/* Add Button */}
                                                        <div className="flex justify-end mt-6">
                                                            <button
                                                                type="button"
                                                                onClick={handleAddInvestor}
                                                                disabled={savingInvestorAllocations}
                                                                className={`inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm ${savingInvestorAllocations
                                                                    ? 'bg-primary-400 cursor-not-allowed'
                                                                    : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md'
                                                                    }`}
                                                            >
                                                                {savingInvestorAllocations ? (
                                                                    <>
                                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Adding...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                        </svg>
                                                                        Add Investor
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {newInvestorStats && (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 text-xs text-blue-900 space-y-1">
                                                            <div className="font-semibold text-blue-800">{newInvestorStats.name}</div>
                                                            <div>Credit Limit: AED {formatCurrency(newInvestorStats.creditLimit)}</div>
                                                            <div>Utilized: AED {formatCurrency(newInvestorStats.utilized)}</div>
                                                            <div>Available Before Allocation: AED {formatCurrency(newInvestorStats.remaining)}</div>
                                                            <div className={newInvestorStats.remainingAfter < 0 ? 'text-red-600 font-semibold' : ''}>
                                                                Available After Allocation: AED {formatCurrency(newInvestorStats.remainingAfter)}
                                                            </div>
                                                        </div>
                                                    )}
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
                                                {user?.role === 'admin' && !isSubmittedForApproval() && investorAllocations.length > 0 && (
                                                    <button
                                                        onClick={handleSubmitForApproval}
                                                        disabled={submittingApproval || remainingPurchaseAmount !== 0}
                                                        className={`inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-semibold ${(submittingApproval || remainingPurchaseAmount !== 0) ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
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
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white space-y-4">
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
                                <div className="space-y-2">
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
                                </div>
                            )}
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
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
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

            {/* Invoice Payment Details Modal */}
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
                            {investorAllocations.length > 0 && (
                                <div className="border border-gray-200 rounded-lg bg-gray-50">
                                    <div className="px-3 py-2 text-xs text-gray-600">
                                        Select a mode of payment for each investor. All entries are required before issuing invoices.
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
                                                        Amount (AED)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 text-sm">
                                                {investorAllocations.map((allocation, index) => {
                                                    const investorRaw = allocation?.investorId?._id || allocation?.investorId;
                                                    const investorKey = investorRaw ? investorRaw.toString() : `idx-${index}`;
                                                    const details = getInvestorDetails(investorKey);
                                                    const payment = perInvestorPayments[investorKey] || { modeOfPayment: '' };
                                                    return (
                                                        <tr key={investorKey}>
                                                            <td className="px-4 py-3">
                                                                <div className="font-semibold text-gray-900">
                                                                    {details?.name || details?.email || 'Investor'}
                                                                </div>
                                                                {details?.email && (
                                                                    <div className="text-xs text-gray-500">{details.email}</div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <select
                                                                    value={payment.modeOfPayment}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (!investorRaw) return;
                                                                        setPerInvestorPayments((prev) => {
                                                                            if (!value) {
                                                                                const next = { ...prev };
                                                                                delete next[investorKey];
                                                                                return next;
                                                                            }
                                                                            return {
                                                                                ...prev,
                                                                                [investorKey]: {
                                                                                    ...(prev[investorKey] || {}),
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
                                                                AED {formatCurrency(allocation.amount)}
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
                                disabled={purchasing || !canSubmitPurchase}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${purchasing || !canSubmitPurchase
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
