import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';
import ConfirmDialog from '../../Components/ConfirmDialog';

// Import SVG icons
import detailingIcon from '../../assets/icons/detailing.svg';
import photoshootIcon from '../../assets/icons/photoshoot.svg';
import photoshootEditedIcon from '../../assets/icons/photoshoot-edited.svg';
import metaAdsIcon from '../../assets/icons/meta-ads.svg';
import onlineAdsIcon from '../../assets/icons/online-ads.svg';
import instagramIcon from '../../assets/icons/instagram.svg';

const InventoryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [markingReady, setMarkingReady] = useState(false);
    const [viewingPODocumentId, setViewingPODocumentId] = useState(null);
    const [downloadingPODocumentId, setDownloadingPODocumentId] = useState(null);
    const [viewingInvoice, setViewingInvoice] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [viewingDocumentId, setViewingDocumentId] = useState(null);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);
    const [uploadingInvoiceEvidence, setUploadingInvoiceEvidence] = useState({});
    const [deletingInvoiceEvidence, setDeletingInvoiceEvidence] = useState({});
    const [viewingInvoiceEvidence, setViewingInvoiceEvidence] = useState({});
    const [showDeleteEvidenceModal, setShowDeleteEvidenceModal] = useState(false);
    const [costTypeToDelete, setCostTypeToDelete] = useState(null);
    const [notes, setNotes] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');
    const [deletingNoteId, setDeletingNoteId] = useState(null);
    const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
    const [isDeletingNote, setIsDeletingNote] = useState(false);
    const [updatingChecklistItems, setUpdatingChecklistItems] = useState({});
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [inspectionDoc, setInspectionDoc] = useState(null);
    const [signedAgreementFiles, setSignedAgreementFiles] = useState([]);
    const [documentsUploading, setDocumentsUploading] = useState(false);
    const [documentsUploadProgress, setDocumentsUploadProgress] = useState(0);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [isDeletingDocument, setIsDeletingDocument] = useState(false);
    const [showAgreementModal, setShowAgreementModal] = useState(false);
    const [generatingAgreement, setGeneratingAgreement] = useState(false);
    const [agreementError, setAgreementError] = useState('');
    const [agreementForm, setAgreementForm] = useState({
        ownerAddress: '',
        ownerContact: '',
        ownerEmiratesIdOrPassport: '',
        agreedAmount: '',
        duration: '30-45 days'
    });

    const checklistItems = [
        { key: 'detailing', label: 'Detailing', iconSrc: detailingIcon },
        { key: 'photoshoot', label: 'Photoshoot', iconSrc: photoshootIcon },
        { key: 'photoshootEdited', label: 'Photoshoot Edited', iconSrc: photoshootEditedIcon },
        { key: 'metaAds', label: 'Meta Ads', iconSrc: metaAdsIcon },
        { key: 'onlineAds', label: 'Online Ads', iconSrc: onlineAdsIcon },
        { key: 'instagram', label: 'Instagram', iconSrc: instagramIcon }
    ];

    const ownerDefaults = useMemo(() => {
        if (!vehicle) {
            return {
                name: '',
                contact: '',
                address: '',
                idDocument: ''
            };
        }
        return {
            name: vehicle.ownerInfo?.name || vehicle.contactInfo?.name || '',
            contact: vehicle.ownerInfo?.contactNumber || vehicle.contactInfo?.phone || '',
            address: vehicle.ownerInfo?.address || '',
            idDocument: vehicle.ownerInfo?.emiratesIdOrPassport || vehicle.contactInfo?.passportOrEmiratesId || ''
        };
    }, [vehicle]);

    const missingOwnerFields = useMemo(() => {
        const fields = [];
        if (!ownerDefaults.address) {
            fields.push({ key: 'ownerAddress', label: 'Owner Address' });
        }
        if (!ownerDefaults.idDocument) {
            fields.push({ key: 'ownerEmiratesIdOrPassport', label: 'Owner Emirates ID / Passport' });
        }
        if (!ownerDefaults.contact) {
            fields.push({ key: 'ownerContact', label: 'Owner Contact Number' });
        }
        return fields;
    }, [ownerDefaults]);

    useEffect(() => {
        fetchVehicle();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (notification.show) {
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }, [notification.show]);

    const showSuccess = (message) => {
        setNotification({ show: true, message, type: 'success' });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    const showError = (message) => {
        setNotification({ show: true, message, type: 'error' });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'error' });
        }, 5000);
    };

    const openAgreementModal = () => {
        if (!vehicle) return;
        setAgreementError('');
        setAgreementForm({
            ownerAddress: ownerDefaults.address,
            ownerContact: ownerDefaults.contact,
            ownerEmiratesIdOrPassport: ownerDefaults.idDocument,
            agreedAmount: vehicle.purchasePrice || '',
            duration: '30-45 days'
        });
        setShowAgreementModal(true);
    };

    const closeAgreementModal = () => {
        if (generatingAgreement) return;
        setShowAgreementModal(false);
    };

    const handleAgreementInputChange = (event) => {
        const { name, value } = event.target;
        setAgreementForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleGenerateAgreement = async (event) => {
        event.preventDefault();
        if (!vehicle) return;
        setAgreementError('');
        setGeneratingAgreement(true);
        try {
            const normalizedAmount = agreementForm.agreedAmount !== '' && agreementForm.agreedAmount !== null
                ? Number(agreementForm.agreedAmount)
                : undefined;
            const payload = {
                ownerAddress: agreementForm.ownerAddress || undefined,
                ownerContact: agreementForm.ownerContact || undefined,
                ownerEmiratesIdOrPassport: agreementForm.ownerEmiratesIdOrPassport || undefined,
                agreedAmount: normalizedAmount ?? vehicle.purchasePrice,
                duration: agreementForm.duration
            };
            const response = await axiosInstance.post(`/consignment-agreement/${vehicle._id}`, payload);
            if (response.data?.downloadUrl) {
                const downloadResponse = await axiosInstance.get(response.data.downloadUrl, {
                    responseType: 'blob'
                });
                const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download =
                    response.data?.agreement?.pdfFileName ||
                    `Consignment_Agreement_${vehicle.leadId || vehicle.vehicleId || 'agreement'}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
            showSuccess('Consignment agreement generated successfully.');
            setShowAgreementModal(false);
            await fetchVehicle(false);
        } catch (err) {
            setAgreementError(err.response?.data?.message || 'Failed to generate agreement.');
        } finally {
            setGeneratingAgreement(false);
        }
    };

    const fetchVehicle = async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }
            const response = await axiosInstance.get(`/purchases/inventory/${id}`);
            setVehicle(response.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch vehicle details');
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    const handleUpdateChecklist = async (itemKey, completed, notes = '') => {
        if (!vehicle) return;

        const previousChecklist = vehicle.operationalChecklist || {};

        // Optimistically update the UI immediately
        const updatedChecklist = {
            ...previousChecklist,
            [itemKey]: {
                completed: completed,
                notes: notes || '',
                completedBy: user?.id || user?._id,
                completedAt: completed ? new Date() : null
            }
        };

        setVehicle((prev) => ({
            ...prev,
            operationalChecklist: updatedChecklist
        }));

        setUpdatingChecklistItems((prev) => ({ ...prev, [itemKey]: true }));

        try {
            await axiosInstance.put(`/purchases/vehicles/${id}/checklist`, {
                item: itemKey,
                completed,
                notes,
                completedBy: user?.id || user?._id,
                completedAt: completed ? new Date() : null
            });
            // Keep optimistic state; backend is updated silently
        } catch (err) {
            // Revert to previous checklist on error
            setVehicle((prev) => ({
                ...prev,
                operationalChecklist: previousChecklist
            }));
            // eslint-disable-next-line no-console
            console.error(err.response?.data?.message || 'Failed to update checklist');
        } finally {
            setUpdatingChecklistItems((prev) => {
                const next = { ...prev };
                delete next[itemKey];
                return next;
            });
        }
    };

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
            alert(err.response?.data?.message || 'Failed to view document');
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
            alert(err.response?.data?.message || 'Failed to download document');
        } finally {
            setDownloadingDocumentId(null);
        }
    };

    const handleViewPODocument = async (doc) => {
        const docId = doc.documentId || doc._id;
        setViewingPODocumentId(docId);
        try {
            if (!vehicle?.purchaseOrder?._id) {
                alert('Purchase order not found');
                setViewingPODocumentId(null);
                return;
            }

            // If content is available directly, use it
            if (doc.content) {
                const pdfBase64 = doc.content;
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
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
                    window.open(blobUrl, '_blank');
                }
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
            } else {
                // Fallback to API endpoint
                const response = await axiosInstance.get(`/purchases/po/${vehicle.purchaseOrder._id}/documents/${doc.documentId}`, {
                    responseType: 'arraybuffer',
                    headers: { Accept: 'application/pdf' }
                });

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
                    window.open(blobUrl, '_blank');
                }
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to view document');
        } finally {
            setViewingPODocumentId(null);
        }
    };

    const handleDownloadPODocument = async (doc) => {
        const docId = doc.documentId || doc._id;
        setDownloadingPODocumentId(docId);
        try {
            if (!vehicle?.purchaseOrder?._id) {
                alert('Purchase order not found');
                setDownloadingPODocumentId(null);
                return;
            }

            let blob;
            // If content is available directly, use it
            if (doc.content) {
                const pdfBase64 = doc.content;
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'application/pdf' });
            } else {
                // Fallback to API endpoint
                const response = await axiosInstance.get(`/purchases/po/${vehicle.purchaseOrder._id}/documents/${doc.documentId}`, {
                    responseType: 'arraybuffer',
                    headers: { Accept: 'application/pdf' }
                });
                blob = new Blob([response.data], { type: 'application/pdf' });
            }

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${doc.name || 'PO_Document'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to download document');
        } finally {
            setDownloadingPODocumentId(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const handleInspectionFileSelect = (e) => {
        if (documentsUploading) return;
        if (documentsUploading) return;
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const file = files[0];
        const isValidType =
            file.type === 'application/pdf' ||
            file.type === 'image/png' ||
            file.type === 'image/jpeg' ||
            file.type === 'image/jpg';

        if (!isValidType) {
            showError('Invalid file type. Only PDF, PNG, JPG are allowed for Inspection Report.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showError('File is too large. Maximum file size is 10MB.');
            return;
        }

        setInspectionDoc(file);
    };

    const handleSignedAgreementSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const validFiles = files.filter((file) => {
            const isValidType =
                file.type === 'application/pdf' ||
                file.type === 'image/png' ||
                file.type === 'image/jpeg' ||
                file.type === 'image/jpg';
            if (!isValidType) {
                showError(`${file.name} is not a valid file type. Only PDF, PNG, JPG are allowed.`);
                return false;
            }
            if (file.size > 10 * 1024 * 1024) {
                showError(`${file.name} is too large. Maximum file size is 10MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;
        setSignedAgreementFiles((prev) => [...prev, ...validFiles]);
        e.target.value = '';
    };

    const removeSignedAgreementFile = (index) => {
        setSignedAgreementFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const hasPendingUploads = inspectionDoc || signedAgreementFiles.length > 0;

    const handleUploadPendingDocuments = async () => {
        if (!hasPendingUploads) {
            showError('Please select at least one document to upload.');
            return;
        }

        try {
            setDocumentsUploading(true);
            setDocumentsUploadProgress(0);

            const formData = new FormData();
            if (inspectionDoc) {
                formData.append('inspectionReport', inspectionDoc);
            }
            signedAgreementFiles.forEach((file) => formData.append('consignmentAgreement', file));

            await axiosInstance.post(`/purchases/leads/${vehicle._id}/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setDocumentsUploadProgress(progress);
                }
            });

            showSuccess('Documents uploaded successfully.');
            setInspectionDoc(null);
            setSignedAgreementFiles([]);
            setDocumentsUploadProgress(0);
            await fetchVehicle(false);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to upload documents.');
        } finally {
            setDocumentsUploading(false);
        }
    };

    const handleRequestDeleteDocument = (doc) => {
        setDocumentToDelete(doc);
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete?._id) return;
        setIsDeletingDocument(true);
        try {
            await axiosInstance.delete(`/purchases/leads/${vehicle._id}/documents/${documentToDelete._id}`);
            setDocumentToDelete(null);
            await fetchVehicle(false);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to delete document.');
        } finally {
            setIsDeletingDocument(false);
        }
    };

    const cancelDeleteDocument = () => {
        if (!isDeletingDocument) {
            setDocumentToDelete(null);
        }
    };

    const handleUploadInvoiceEvidence = async (costType, file) => {
        if (!vehicle?.purchaseOrder?._id) {
            alert('Purchase order not found');
            return;
        }

        if (!file) {
            alert('Please select a file');
            return;
        }

        setUploadingInvoiceEvidence(prev => ({ ...prev, [costType]: true }));
        try {
            const formData = new FormData();
            formData.append('invoice', file);

            await axiosInstance.post(
                `/purchases/po/${vehicle.purchaseOrder._id}/cost-invoice-evidence/${costType}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            await fetchVehicle(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to upload invoice evidence');
        } finally {
            setUploadingInvoiceEvidence(prev => ({ ...prev, [costType]: false }));
        }
    };

    const handleDeleteInvoiceEvidence = (costType) => {
        setCostTypeToDelete(costType);
        setShowDeleteEvidenceModal(true);
    };

    const confirmDeleteInvoiceEvidence = async () => {
        if (!vehicle?.purchaseOrder?._id || !costTypeToDelete) {
            alert('Purchase order not found');
            setShowDeleteEvidenceModal(false);
            setCostTypeToDelete(null);
            return;
        }

        setDeletingInvoiceEvidence(prev => ({ ...prev, [costTypeToDelete]: true }));
        try {
            await axiosInstance.delete(
                `/purchases/po/${vehicle.purchaseOrder._id}/cost-invoice-evidence/${costTypeToDelete}`
            );

            await fetchVehicle(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete invoice evidence');
        } finally {
            setDeletingInvoiceEvidence(prev => ({ ...prev, [costTypeToDelete]: false }));
            setShowDeleteEvidenceModal(false);
            setCostTypeToDelete(null);
        }
    };

    const handleViewInvoiceEvidence = async (evidence) => {
        if (!evidence?.url) {
            alert('Document not available');
            return;
        }

        setViewingInvoiceEvidence(prev => ({ ...prev, [evidence.costType]: true }));
        try {
            if (evidence.fileType !== 'application/pdf') {
                // For images, open directly
                window.open(evidence.url, '_blank');
                setViewingInvoiceEvidence(prev => ({ ...prev, [evidence.costType]: false }));
                return;
            }

            // For PDFs, fetch as blob and create blob URL for inline viewing
            const response = await axiosInstance.get(evidence.url, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            setViewingInvoiceEvidence(prev => ({ ...prev, [evidence.costType]: false }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to view invoice evidence');
            setViewingInvoiceEvidence(prev => ({ ...prev, [evidence.costType]: false }));
        }
    };

    // Combined operational + financial progress (for mark-ready logic)
    const getOverallProgress = () => {
        if (!vehicle) return 0;

        // Operational checklist
        const checklist = vehicle.operationalChecklist || {};
        const operationalItems = ['detailing', 'photoshoot', 'photoshootEdited', 'metaAds', 'onlineAds', 'instagram'];
        let operationalCompleted = 0;

        operationalItems.forEach((item) => {
            const itemData = checklist[item];
            if (itemData && (itemData.completed === true || itemData.completed === 'true')) {
                operationalCompleted += 1;
            }
        });

        // For consignment leads, financial evidence is optional and NOT required for readiness.
        if (vehicle.status === 'consignment') {
            if (operationalItems.length === 0) return 0;
            return Math.round((operationalCompleted / operationalItems.length) * 100);
        }

        // Financial checklist based on job costings that have a value and their evidence
        const jobCosting = vehicle.jobCosting || {};
        const requiredCostTypes = [];
        if (jobCosting.transferCost > 0) requiredCostTypes.push('transferCost');
        if (jobCosting.detailing_inspection_cost > 0) requiredCostTypes.push('detailingInspectionCost');
        if (jobCosting.agent_commision > 0) requiredCostTypes.push('agentCommission');
        if (jobCosting.car_recovery_cost > 0) requiredCostTypes.push('carRecoveryCost');
        if (jobCosting.other_charges > 0) requiredCostTypes.push('otherCharges');

        const invoices = vehicle.invoices || [];
        let financialCompleted = 0;

        if (requiredCostTypes.length > 0 && invoices.length > 0) {
            requiredCostTypes.forEach((costType) => {
                const hasEvidenceForCost = invoices.some((inv) => {
                    const evidence = inv.costInvoiceEvidence && inv.costInvoiceEvidence[costType];
                    return !!(evidence && evidence.url);
                });
                if (hasEvidenceForCost) {
                    financialCompleted += 1;
                }
            });
        }

        const totalItems = operationalItems.length + requiredCostTypes.length;
        const totalCompleted = operationalCompleted + financialCompleted;

        if (totalItems === 0) return 0;
        return Math.round((totalCompleted / totalItems) * 100);
    };

    const handleMarkAsReady = async () => {
        try {
            setMarkingReady(true);
            await axiosInstance.put(`/purchases/vehicles/${id}/mark-ready`);
            showSuccess('Vehicle moved to Sales successfully!');
            setTimeout(() => {
                navigate('/sales/leads');
            }, 800);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            showError(err.response?.data?.message || 'Failed to move vehicle to Sales');
        } finally {
            setMarkingReady(false);
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
            return;
        }

        try {
            await axiosInstance.put(`/purchases/leads/${id}/notes/${noteId}`, {
                content: editingNoteContent.trim()
            });
            setEditingNoteId(null);
            setEditingNoteContent('');
            await fetchVehicle(false);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err.response?.data?.message || 'Failed to update note');
        }
    };

    const handleCancelNoteEdit = () => {
        setEditingNoteId(null);
        setEditingNoteContent('');
    };

    const handleDeleteNote = (noteId) => {
        setDeletingNoteId(noteId);
        setShowDeleteNoteModal(true);
    };

    const confirmDeleteNote = async () => {
        if (!deletingNoteId) return;
        setIsDeletingNote(true);
        try {
            await axiosInstance.delete(`/purchases/leads/${id}/notes/${deletingNoteId}`);
            setShowDeleteNoteModal(false);
            setDeletingNoteId(null);
            await fetchVehicle(false);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err.response?.data?.message || 'Failed to delete note');
        } finally {
            setIsDeletingNote(false);
        }
    };

    const cancelDeleteNote = () => {
        if (!isDeletingNote) {
            setShowDeleteNoteModal(false);
            setDeletingNoteId(null);
        }
    };

    const handleAddNote = async () => {
        if (!notes.trim()) {
            return;
        }

        try {
            await axiosInstance.put(`/purchases/leads/${id}/status`, {
                status: vehicle.status,
                notes: notes.trim()
            });
            setNotes('');
            await fetchVehicle(false);
        } catch (err) {
            // Silent fail to avoid disruptive alerts; errors can be inspected in network logs if needed
            // eslint-disable-next-line no-console
            console.error(err.response?.data?.message || 'Failed to add note');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading vehicle details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/purchases/inventory')}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Back to Inventory
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!vehicle) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="text-gray-400 text-6xl mb-4">🚗</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Vehicle Not Found</h2>
                        <p className="text-gray-600 mb-4">The requested vehicle could not be found.</p>
                        <button
                            onClick={() => navigate('/purchases/inventory')}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Back to Inventory
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const overallProgress = getOverallProgress();
    const canMarkReady =
        overallProgress === 100 &&
        (vehicle.status === 'inventory' || vehicle.status === 'in_inventory' || vehicle.status === 'consignment');

    // Progress breakdowns for badges
    const checklist = vehicle.operationalChecklist || {};
    const operationalItems = ['detailing', 'photoshoot', 'photoshootEdited', 'metaAds', 'onlineAds', 'instagram'];
    const checklistTotal = operationalItems.length;
    let checklistCompleted = 0;
    operationalItems.forEach((item) => {
        const itemData = checklist[item];
        if (itemData && (itemData.completed === true || itemData.completed === 'true')) {
            checklistCompleted += 1;
        }
    });

    const documentsCount = vehicle.attachments?.length || 0;

    const jobCosting = vehicle.jobCosting || {};
    const requiredCostTypes = [];
    if (jobCosting.transferCost > 0) requiredCostTypes.push('transferCost');
    if (jobCosting.detailing_inspection_cost > 0) requiredCostTypes.push('detailingInspectionCost');
    if (jobCosting.agent_commision > 0) requiredCostTypes.push('agentCommission');
    if (jobCosting.car_recovery_cost > 0) requiredCostTypes.push('carRecoveryCost');
    if (jobCosting.other_charges > 0) requiredCostTypes.push('otherCharges');

    const invoicesForSummary = vehicle.invoices || [];
    let financialCompleted = 0;
    if (requiredCostTypes.length > 0 && invoicesForSummary.length > 0) {
        requiredCostTypes.forEach((costType) => {
            const hasEvidenceForCost = invoicesForSummary.some((inv) => {
                const evidence = inv.costInvoiceEvidence && inv.costInvoiceEvidence[costType];
                return !!(evidence && evidence.url);
            });
            if (hasEvidenceForCost) {
                financialCompleted += 1;
            }
        });
    }
    const financialTotal = requiredCostTypes.length;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {notification.show && (
                    <div
                        className={`border-l-4 p-4 rounded-r-lg ${notification.type === 'success'
                            ? 'bg-green-50 border-green-400'
                            : 'bg-red-50 border-red-400'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex">
                                {notification.type === 'success' ? (
                                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                                <p
                                    className={`ml-3 text-sm ${notification.type === 'success'
                                        ? 'text-green-700'
                                        : 'text-red-700'
                                        }`}
                                >
                                    {notification.message}
                                </p>
                            </div>
                            <button
                                onClick={() => setNotification({ show: false, message: '', type: notification.type })}
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
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">
                                {vehicle.make} {vehicle.model} {vehicle.year}
                            </h1>
                            <p className="text-blue-100">Vehicle ID: {vehicle.vehicleId}</p>
                        </div>
                        <button
                            onClick={() => navigate('/purchases/inventory')}
                            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                        >
                            ← Back to Inventory
                        </button>
                    </div>
                </div>

                {vehicle.status === 'consignment' && (
                    <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-5 mt-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold mb-1">
                                    Consignment Agreement
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900">Generate the agreement PDF</h2>
                                <p className="text-sm text-gray-600">
                                    Prefill lead details and add any missing owner info before creating the official agreement.
                                </p>
                                {missingOwnerFields.length > 0 ? (
                                    <p className="text-xs text-amber-700 mt-2">
                                        Missing info needed: {missingOwnerFields.map((field) => field.label).join(', ')}
                                    </p>
                                ) : (
                                    <p className="text-xs text-green-700 mt-2">
                                        Owner details are complete. You can generate the agreement now.
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={openAgreementModal}
                                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm shadow hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={generatingAgreement}
                            >
                                {generatingAgreement ? 'Preparing...' : 'Generate Consignment Agreement'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {/* Tab Navigation */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8 px-6">
                                    {[
                                        { id: 'overview', label: 'Overview' },
                                        { id: 'checklist', label: 'Operational Checklist' },
                                        { id: 'documents', label: 'Documents' },
                                        { id: 'financial', label: 'Financial' },
                                        { id: 'activity', label: 'Notes' }
                                    ].map((tab) => {
                                        let badge = null;
                                        if (tab.id === 'checklist') {
                                            badge = (
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                                                    {checklistCompleted}/{checklistTotal}
                                                </span>
                                            );
                                        } else if (tab.id === 'documents') {
                                            badge = (
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                                                    {documentsCount}
                                                </span>
                                            );
                                        } else if (tab.id === 'financial') {
                                            badge = (
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                                                    {financialCompleted}/{financialTotal || 0}
                                                </span>
                                            );
                                        } else if (tab.id === 'activity' && vehicle.notes && vehicle.notes.length > 0) {
                                            badge = (
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                                                    {vehicle.notes.length}
                                                </span>
                                            );
                                        }

                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{tab.label}</span>
                                                    {badge}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="p-6">
                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Vehicle Information */}
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h3 className="font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Make:</span>
                                                        <span className="font-medium">{vehicle.make}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Model:</span>
                                                        <span className="font-medium">{vehicle.model}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Year:</span>
                                                        <span className="font-medium">{vehicle.year}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Mileage:</span>
                                                        <span className="font-medium">{vehicle.mileage?.toLocaleString()} km</span>
                                                    </div>
                                                    {vehicle.color && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Color:</span>
                                                            <span className="font-medium">{vehicle.color}</span>
                                                        </div>
                                                    )}
                                                    {vehicle.vin && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">VIN:</span>
                                                            <span className="font-medium">{vehicle.vin}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Owner Information */}
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h3 className="font-semibold text-gray-900 mb-4">Owner Information</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Name:</span>
                                                        <span className="font-medium">{ownerDefaults.name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Phone:</span>
                                                        <span className="font-medium">{ownerDefaults.contact || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Email:</span>
                                                        <span className="font-medium break-all">{vehicle.contactInfo?.email || 'N/A'}</span>
                                                    </div>
                                                    {ownerDefaults.idDocument && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Passport/Emirates ID:</span>
                                                            <span className="font-medium">{ownerDefaults.idDocument}</span>
                                                        </div>
                                                    )}
                                                    {ownerDefaults.address && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Address:</span>
                                                            <span className="font-medium text-right max-w-[220px]">{ownerDefaults.address}</span>
                                                        </div>
                                                    )}
                                                    {vehicle.contactInfo?.preferredContact && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Preferred Contact:</span>
                                                            <span className="font-medium capitalize">{vehicle.contactInfo.preferredContact}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Information */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-4">Financial Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="text-center">
                                                    <p className="text-sm text-gray-600">Asking Price</p>
                                                    <p className="text-lg font-semibold">AED {vehicle.askingPrice?.toLocaleString() || '0'}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm text-gray-600">Purchase Price</p>
                                                    <p className="text-lg font-semibold text-green-600">AED {vehicle.purchasePrice?.toLocaleString() || '0'}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm text-gray-600">Minimum Selling Price</p>
                                                    <p className="text-lg font-semibold text-blue-600">AED {vehicle.minSellingPrice?.toLocaleString() || 'N/A'}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm text-gray-600">Maximum Selling Price</p>
                                                    <p className="text-lg font-semibold text-purple-600">AED {vehicle.maxSellingPrice?.toLocaleString() || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {/* Job Costings */}
                                            {vehicle.jobCosting && (
                                                <div className="mt-6 border-t border-gray-200 pt-4">
                                                    <h4 className="font-semibold text-gray-900 mb-3">Job Costings</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transfer Cost (RTA)</p>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                AED {(vehicle.jobCosting.transferCost || 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Detailing / Inspection Cost</p>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                AED {(vehicle.jobCosting.detailing_inspection_cost || 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Agent Commission</p>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                AED {(vehicle.jobCosting.agent_commision || 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Car Recovery Cost</p>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                AED {(vehicle.jobCosting.car_recovery_cost || 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Other Charges</p>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                AED {(vehicle.jobCosting.other_charges || 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Job Cost</p>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {(() => {
                                                                    const jc = vehicle.jobCosting || {};
                                                                    const total =
                                                                        (jc.transferCost || 0) +
                                                                        (jc.detailing_inspection_cost || 0) +
                                                                        (jc.agent_commision || 0) +
                                                                        (jc.car_recovery_cost || 0) +
                                                                        (jc.other_charges || 0);
                                                                    return `AED ${total.toLocaleString()}`;
                                                                })()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-200 lg:col-span-3">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost (Purchase + Job Costings)</p>
                                                            <p className="text-base font-bold text-gray-900">
                                                                {(() => {
                                                                    const jc = vehicle.jobCosting || {};
                                                                    const jobTotal =
                                                                        (jc.transferCost || 0) +
                                                                        (jc.detailing_inspection_cost || 0) +
                                                                        (jc.agent_commision || 0) +
                                                                        (jc.car_recovery_cost || 0) +
                                                                        (jc.other_charges || 0);
                                                                    const purchase = vehicle.purchasePrice || 0;
                                                                    const grandTotal = purchase + jobTotal;
                                                                    return `AED ${grandTotal.toLocaleString()}`;
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${vehicle.status === 'inventory' || vehicle.status === 'in_inventory' ? 'bg-blue-100 text-blue-800' :
                                                    vehicle.status === 'sale' ? 'bg-green-100 text-green-800' :
                                                        vehicle.status === 'consignment' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {vehicle.status?.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Checklist Tab */}
                                {activeTab === 'checklist' && (
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-4">Operational Checklist</h3>
                                            <div className="space-y-3">
                                                {checklistItems.map((item) => {
                                                    const checklistItem = vehicle.operationalChecklist?.[item.key];
                                                    const isCompleted = checklistItem?.completed || false;
                                                    const completedAt = checklistItem?.completedAt;
                                                    const isUpdatingItem = !!updatingChecklistItems[item.key];

                                                    const toggleItem = () => {
                                                        if (isUpdatingItem) return;
                                                        handleUpdateChecklist(item.key, !isCompleted);
                                                    };

                                                    return (
                                                        <div
                                                            key={item.key}
                                                            onClick={toggleItem}
                                                            className={`border rounded-lg p-4 transition-colors cursor-pointer ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                                                } ${isUpdatingItem ? 'opacity-70' : 'hover:border-primary-400 hover:bg-primary-50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center mb-2 space-x-3">
                                                                <div className="w-8 h-8 flex items-center justify-center">
                                                                    <img
                                                                        src={item.iconSrc}
                                                                        alt={item.label}
                                                                        className="w-6 h-6 text-gray-600"
                                                                    />
                                                                </div>
                                                                <span className="font-medium text-gray-900">{item.label}</span>
                                                            </div>

                                                            {completedAt && (
                                                                <p className="text-xs text-gray-500">
                                                                    Completed: {new Date(completedAt).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                        </div>
                                    </div>
                                )}

                                {activeTab === 'activity' && (
                                    <div>
                                        {vehicle?.notes && vehicle.notes.length > 0 ? (
                                            <div className="see space-y-4">
                                                {vehicle.notes.map((note, index) => (
                                                    <div key={note._id || index} className="relative">
                                                        {index !== vehicle.notes.length - 1 && (
                                                            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                                                        )}
                                                        <div className="flex gap-4">
                                                            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h.01M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                                                {editingNoteId === (note._id || note.id) ? (
                                                                    <div className="space-y-3">
                                                                        <textarea
                                                                            value={editingNoteContent}
                                                                            onChange={(e) => setEditingNoteContent(e.target.value)}
                                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                                            rows="3"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleSaveNoteEdit(note._id || note.id)}
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
                                                                                <span className="text-sm font-semibold text-gray-900">
                                                                                    {note.addedBy?.name || 'Unknown'}
                                                                                </span>
                                                                                {note.addedAt && (
                                                                                    <span className="text-xs text-gray-500">
                                                                                        {new Date(note.addedAt).toLocaleString()}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                {canEditNote(note) && (
                                                                                    <button
                                                                                        onClick={() => handleEditNote(note)}
                                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                                        </svg>
                                                                                    </button>
                                                                                )}
                                                                                {canDeleteNote(note) && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteNote(note._id || note.id)}
                                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                                                    >
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

                                {/* Documents Tab */}
                                {activeTab === 'documents' && (
                                    <div className="space-y-6">
                                        {/* Consignment Inspection Report Upload */}
                                        {vehicle.status === 'consignment' && (
                                            <div className="bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200 rounded-lg p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-gray-900">Inspection Report</h3>
                                                            <p className="text-xs text-gray-500">
                                                                Upload the latest inspection report for this consignment vehicle (PDF or images, max 10MB)
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Existing inspection reports */}
                                                {vehicle.attachments?.some(a => a.category === 'inspectionReport') && (
                                                    <div className="mb-4">
                                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Existing Inspection Reports</h4>
                                                        <div className="space-y-2">
                                                            {vehicle.attachments
                                                                .filter(a => a.category === 'inspectionReport')
                                                                .map((attachment, index) => {
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
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                    ) : (
                                                                                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                        </svg>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm font-medium text-gray-900 truncate">
                                                                                        {attachment.fileName || 'Inspection Report'}
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500">
                                                                                        {formatFileSize(attachment.fileSize)} • Uploaded Inspection Report
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
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                                        </svg>
                                                                                    )}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRequestDeleteDocument(attachment)}
                                                                                    disabled={isViewing || isDownloading}
                                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    title="Delete"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Selected file for upload */}
                                                {inspectionDoc && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                                        <div className="text-xs font-medium text-blue-700 mb-1">Selected for upload:</div>
                                                        <div className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                                                            <span className="text-xs text-gray-900 truncate flex-1">{inspectionDoc.name}</span>
                                                            {!documentsUploading && (
                                                                <button
                                                                    onClick={() => setInspectionDoc(null)}
                                                                    className="ml-2 text-red-600 hover:text-red-800"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Upload control */}
                                                <div className="space-y-3">
                                                    <input
                                                        type="file"
                                                        id="inspection-report-file"
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                        onChange={handleInspectionFileSelect}
                                                        className="hidden"
                                                        disabled={documentsUploading}
                                                    />
                                                    <label
                                                        htmlFor="inspection-report-file"
                                                        className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed rounded-lg transition-all ${documentsUploading
                                                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                                            : 'border-indigo-300 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100'
                                                            }`}
                                                    >
                                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        <span className="text-sm font-medium text-indigo-800">
                                                            {inspectionDoc ? 'Change File' : 'Choose Inspection Report'}
                                                        </span>
                                                        <span className="text-xs text-indigo-600">
                                                            (Max 10MB • PDF/PNG/JPG)
                                                        </span>
                                                    </label>

                                                </div>
                                            </div>
                                        )}

                                        {/* Signed Consignment Agreement Upload */}
                                        {vehicle.status === 'consignment' && (
                                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V3m0 0H8v4m8-4h2a2 2 0 012 2v2M8 7V3m0 0H6a2 2 0 00-2 2v2m0 0v12a2 2 0 002 2h12a2 2 0 002-2V7M4 7h16" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-gray-900">Signed Consignment Agreement</h3>
                                                            <p className="text-xs text-gray-500">
                                                                Upload the signed agreement received from the owner (PDF or images, max 10MB each). You can upload multiple files.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Existing signed agreements */}
                                                {vehicle.attachments?.some(a => a.category === 'consignmentAgreement') && (
                                                    <div className="mb-4">
                                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Uploaded Signed Agreements</h4>
                                                        <div className="space-y-2">
                                                            {vehicle.attachments
                                                                .filter(a => a.category === 'consignmentAgreement')
                                                                .map((attachment, index) => {
                                                                    const keyId =
                                                                        attachment._id ||
                                                                        attachment.url ||
                                                                        `${attachment.fileName}_${attachment.category}_${index}`;
                                                                    const isViewing = viewingDocumentId === keyId;
                                                                    const isDownloading = downloadingDocumentId === keyId;
                                                                    return (
                                                                        <div
                                                                            key={keyId}
                                                                            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-purple-500 hover:shadow-sm transition-all"
                                                                        >
                                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                                                    {attachment.fileType === 'application/pdf' ? (
                                                                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                    ) : (
                                                                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                        </svg>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm font-medium text-gray-900 truncate">
                                                                                        {attachment.fileName || 'Signed Agreement'}
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500">
                                                                                        {formatFileSize(attachment.fileSize)} • Signed Consignment Agreement
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 ml-3">
                                                                                <button
                                                                                    onClick={() => handleViewDocument(attachment)}
                                                                                    disabled={isViewing || isDownloading}
                                                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    title="View"
                                                                                >
                                                                                    {isViewing ? (
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
                                                                                    onClick={() => handleDownloadDocument(attachment)}
                                                                                    disabled={isViewing || isDownloading}
                                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    title="Download"
                                                                                >
                                                                                    {isDownloading ? (
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
                                                                                <button
                                                                                    onClick={() => handleRequestDeleteDocument(attachment)}
                                                                                    disabled={isViewing || isDownloading}
                                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    title="Delete"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Selected files preview */}
                                                {signedAgreementFiles.length > 0 && (
                                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                                                        <div className="text-xs font-medium text-purple-700 mb-2">Selected files for upload:</div>
                                                        <div className="space-y-1">
                                                            {signedAgreementFiles.map((file, index) => (
                                                                <div key={index} className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                                                                    <span className="text-xs text-gray-900 truncate flex-1">{file.name}</span>
                                                                    {!documentsUploading && (
                                                                        <button
                                                                            onClick={() => removeSignedAgreementFile(index)}
                                                                            className="ml-2 text-red-600 hover:text-red-800"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    <input
                                                        type="file"
                                                        id="signed-agreement-file"
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                        multiple
                                                        onChange={handleSignedAgreementSelect}
                                                        className="hidden"
                                                        disabled={documentsUploading}
                                                    />
                                                    <label
                                                        htmlFor="signed-agreement-file"
                                                        className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed rounded-lg transition-all ${documentsUploading
                                                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                                            : 'border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100'
                                                            }`}
                                                    >
                                                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        <span className="text-sm font-medium text-purple-800">
                                                            {signedAgreementFiles.length ? 'Add More Files' : 'Choose Signed Agreement Files'}
                                                        </span>
                                                        <span className="text-xs text-purple-600">
                                                            (Max 10MB each • PDF/PNG/JPG)
                                                        </span>
                                                    </label>

                                                </div>
                                            </div>
                                        )}

                                        {vehicle.status === 'consignment' && (hasPendingUploads || documentsUploading) && (
                                            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                                                {documentsUploading && (
                                                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span className="text-xs font-semibold text-blue-900">
                                                                Uploading documents... {documentsUploadProgress}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${documentsUploadProgress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={handleUploadPendingDocuments}
                                                    disabled={documentsUploading || !hasPendingUploads}
                                                    className={`w-full inline-flex justify-center items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${hasPendingUploads
                                                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {documentsUploading ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                            </svg>
                                                            Upload Selected Documents
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {vehicle.status !== 'consignment' && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                {vehicle.attachments && vehicle.attachments.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {(() => {
                                                            // Group attachments by category
                                                            const groupedAttachments = vehicle.attachments.reduce((groups, attachment) => {
                                                                const category = attachment.category;
                                                                if (!groups[category]) {
                                                                    groups[category] = [];
                                                                }
                                                                groups[category].push(attachment);
                                                                return groups;
                                                            }, {});

                                                            // Category display names
                                                            const categoryNames = {
                                                                'inspectionReport': 'Inspection Report',
                                                                'registrationCard': 'Registration Card',
                                                                'carPictures': 'Car Pictures',
                                                                'onlineHistoryCheck': 'Suggested History Check'
                                                            };

                                                            return Object.entries(groupedAttachments).map(([category, attachments]) => (
                                                                <div key={category} className="space-y-2">
                                                                    <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                                                                        {categoryNames[category] || category}
                                                                    </h4>
                                                                    <div className="space-y-2">
                                                                        {attachments.map((attachment, index) => (
                                                                            <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-500 hover:shadow-sm transition-all">
                                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                    <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                                                        {attachment.fileType === 'application/pdf' ? (
                                                                                            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                            </svg>
                                                                                        ) : (
                                                                                            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                            </svg>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="text-sm font-medium text-gray-900 truncate">
                                                                                            {attachment.fileName || 'Document'}
                                                                                        </div>
                                                                                        <div className="text-xs text-gray-500">
                                                                                            {attachment.category} • {attachment.fileSize ? formatFileSize(attachment.fileSize) : 'Unknown size'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 ml-3">
                                                                                    <button
                                                                                        onClick={() => handleViewDocument(attachment)}
                                                                                        disabled={viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) || downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`)}
                                                                                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        title="View"
                                                                                    >
                                                                                        {viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) ? (
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
                                                                                        onClick={() => handleDownloadDocument(attachment)}
                                                                                        disabled={viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) || downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`)}
                                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        title="Download"
                                                                                    >
                                                                                        {downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) ? (
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
                                                                                    <button
                                                                                        onClick={() => handleRequestDeleteDocument(attachment)}
                                                                                        disabled={viewingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`) || downloadingDocumentId === (attachment._id || attachment.url || `${attachment.fileName}_${attachment.category}`)}
                                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        title="Delete"
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                        </svg>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                ) : (
                                                    vehicle.status !== 'consignment' && (
                                                        <div className="text-center py-12">
                                                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <p className="text-gray-500 text-sm">No documents available</p>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Financial Tab */}
                                {activeTab === 'financial' && (
                                    <div className="space-y-6">
                                        {/* Purchase Order Cost Fields with Invoice Evidence */}
                                        {vehicle?.purchaseOrder && vehicle?.invoices && vehicle?.jobCosting && (() => {
                                            const invoices = vehicle.invoices || [];
                                            const jc = vehicle.jobCosting || {};

                                            // Helper function to find an invoice for a cost type.
                                            // Since job costings are shared across all investors and
                                            // backend writes evidence to every invoice, we just need
                                            // any invoice that has evidence for this cost type.
                                            const findInvoiceForCost = (costType) => {
                                                if (!Array.isArray(invoices)) return null;
                                                return invoices.find(inv => inv.costInvoiceEvidence && inv.costInvoiceEvidence[costType]);
                                            };

                                            const costFields = [
                                                {
                                                    key: 'transferCost',
                                                    label: 'Transfer Cost (RTA)',
                                                    value: jc.transferCost || 0,
                                                    investorField: 'transferCostInvestor',
                                                    invoice: findInvoiceForCost('transferCost')
                                                },
                                                {
                                                    key: 'detailingInspectionCost',
                                                    label: 'Detailing / Inspection Cost',
                                                    value: jc.detailing_inspection_cost || 0,
                                                    investorField: 'detailingInspectionCostInvestor',
                                                    invoice: findInvoiceForCost('detailingInspectionCost')
                                                },
                                                {
                                                    key: 'agentCommission',
                                                    label: 'Agent Commission',
                                                    value: jc.agent_commision || 0,
                                                    investorField: 'agentCommissionInvestor',
                                                    invoice: findInvoiceForCost('agentCommission')
                                                },
                                                {
                                                    key: 'carRecoveryCost',
                                                    label: 'Car Recovery Cost',
                                                    value: jc.car_recovery_cost || 0,
                                                    investorField: 'carRecoveryCostInvestor',
                                                    invoice: findInvoiceForCost('carRecoveryCost')
                                                },
                                                {
                                                    key: 'otherCharges',
                                                    label: 'Other Charges',
                                                    value: jc.other_charges || 0,
                                                    investorField: 'otherChargesInvestor',
                                                    invoice: findInvoiceForCost('otherCharges')
                                                }
                                            ].filter(field => field.value > 0).map(field => ({
                                                ...field,
                                                evidence: field.invoice?.costInvoiceEvidence?.[field.key] || null
                                            }));

                                            return costFields.length > 0 ? (
                                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-indigo-900">Cost Invoice Evidence</h3>
                                                            <div className="text-xs text-indigo-700">Upload invoice evidence for each cost field</div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {costFields.map((field) => {
                                                            const isUploading = uploadingInvoiceEvidence[field.key];
                                                            const isDeleting = deletingInvoiceEvidence[field.key];
                                                            const isViewing = viewingInvoiceEvidence[field.key];
                                                            const hasEvidence = field.evidence?.url;

                                                            return (
                                                                <div key={field.key} className="bg-white rounded-lg p-4 border border-indigo-200">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div>
                                                                            <div className="text-sm font-semibold text-gray-900">{field.label}</div>
                                                                            <div className="text-lg font-bold text-indigo-700">AED {field.value.toLocaleString()}</div>
                                                                        </div>
                                                                        {hasEvidence && (
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => handleViewInvoiceEvidence({ ...field.evidence, costType: field.key })}
                                                                                    disabled={isViewing}
                                                                                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                                                {user?.role === 'admin' && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteInvoiceEvidence(field.key)}
                                                                                        disabled={isDeleting}
                                                                                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        {isDeleting ? (
                                                                                            <span className="flex items-center gap-1">
                                                                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                                </svg>
                                                                                                Deleting...
                                                                                            </span>
                                                                                        ) : (
                                                                                            'Delete'
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {hasEvidence ? (
                                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                                </svg>
                                                                                <span className="text-xs font-medium text-green-700">Invoice Evidence Uploaded</span>
                                                                            </div>
                                                                            <div className="text-xs text-green-600 truncate">{field.evidence.fileName}</div>
                                                                            <div className="text-xs text-green-500 mt-1">
                                                                                {field.evidence.fileSize ? formatFileSize(field.evidence.fileSize) : ''}
                                                                                {field.evidence.uploadedAt && ` • ${new Date(field.evidence.uploadedAt).toLocaleDateString()}`}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            <input
                                                                                type="file"
                                                                                id={`invoice-evidence-${field.key}`}
                                                                                accept=".pdf,.png,.jpg,.jpeg"
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files[0];
                                                                                    if (file) {
                                                                                        handleUploadInvoiceEvidence(field.key, file);
                                                                                        e.target.value = ''; // Reset input
                                                                                    }
                                                                                }}
                                                                                disabled={isUploading}
                                                                                className="hidden"
                                                                            />
                                                                            <label
                                                                                htmlFor={`invoice-evidence-${field.key}`}
                                                                                className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed rounded-lg transition-all ${isUploading
                                                                                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                                                                    : 'border-indigo-300 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100'
                                                                                    }`}
                                                                            >
                                                                                {isUploading ? (
                                                                                    <>
                                                                                        <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                        </svg>
                                                                                        <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                                        </svg>
                                                                                        <span className="text-sm font-medium text-indigo-600">Upload Invoice Evidence</span>
                                                                                    </>
                                                                                )}
                                                                            </label>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}

                                        {/* Purchase Order Section - Grouped by Investor */}
                                        {vehicle?.purchaseOrder && (() => {
                                            // Group PO documents by investor
                                            const poDocsByInvestor = {};
                                            const allocations = vehicle.purchaseOrder.investorAllocations || [];

                                            if (vehicle.purchaseOrder.docuSignDocuments) {
                                                vehicle.purchaseOrder.docuSignDocuments.forEach(doc => {
                                                    const investorId = doc.investorId?._id || doc.investorId;
                                                    if (investorId) {
                                                        const key = investorId.toString();
                                                        if (!poDocsByInvestor[key]) {
                                                            poDocsByInvestor[key] = [];
                                                        }
                                                        poDocsByInvestor[key].push(doc);
                                                    }
                                                });
                                            }

                                            // Get all unique investors from allocations
                                            const investors = allocations.map(alloc => {
                                                const investorId = alloc.investorId?._id || alloc.investorId;
                                                return {
                                                    id: investorId?.toString() || '',
                                                    name: alloc.investorId?.name || 'Unknown Investor',
                                                    email: alloc.investorId?.email || '',
                                                    allocation: alloc,
                                                    documents: poDocsByInvestor[investorId?.toString()] || []
                                                };
                                            }).filter(inv => inv.id);

                                            return investors.length > 0 ? (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-blue-900">Purchase Orders</h3>
                                                            <div className="text-xs text-blue-700">PO #{vehicle.purchaseOrder.poId} • {investors.length} {investors.length === 1 ? 'Investor' : 'Investors'}</div>
                                                        </div>
                                                    </div>

                                                    {investors.map((investor) => (
                                                        <div key={investor.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div>
                                                                    <h4 className="text-base font-semibold text-blue-900">{investor.name}</h4>
                                                                    {investor.email && (
                                                                        <div className="text-xs text-blue-700">{investor.email}</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right space-y-1">
                                                                    <div className="text-sm font-semibold text-blue-900">
                                                                        AED {investor.allocation.amount?.toLocaleString() || '0'}
                                                                    </div>
                                                                    <div className="text-xs text-blue-700">
                                                                        {(investor.allocation.ownershipPercentage ?? investor.allocation.percentage ?? 0)}% allocation
                                                                    </div>
                                                                    <div className="text-xs text-green-700">
                                                                        Profit: {(investor.allocation.profitPercentage ?? 0)}%
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Investor-specific PO Documents */}
                                                            {investor.documents.length > 0 ? (
                                                                <div className="bg-white rounded-lg p-4 border border-blue-200">
                                                                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-3">Purchase Order Documents</div>
                                                                    <div className="space-y-2">
                                                                        {investor.documents.map((doc, index) => (
                                                                            <div key={doc.documentId || index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="text-sm font-medium text-gray-900">{doc.name || 'Purchase Order Document'}</div>
                                                                                        <div className="text-xs text-gray-500">
                                                                                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'PDF Document'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={() => handleViewPODocument(doc)}
                                                                                        disabled={viewingPODocumentId === (doc.documentId || doc._id) || downloadingPODocumentId === (doc.documentId || doc._id)}
                                                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        {viewingPODocumentId === (doc.documentId || doc._id) ? (
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
                                                                                    <button
                                                                                        onClick={() => handleDownloadPODocument(doc)}
                                                                                        disabled={viewingPODocumentId === (doc.documentId || doc._id) || downloadingPODocumentId === (doc.documentId || doc._id)}
                                                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        {downloadingPODocumentId === (doc.documentId || doc._id) ? (
                                                                                            <span className="flex items-center gap-1">
                                                                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                                </svg>
                                                                                                Loading...
                                                                                            </span>
                                                                                        ) : (
                                                                                            'Download'
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white rounded-lg p-4 border border-blue-200 text-center text-sm text-gray-500">
                                                                    No purchase order documents available for this investor yet.
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null;
                                        })()}

                                        {/* Invoice Section - Grouped by Investor */}
                                        {(() => {
                                            const invoices = vehicle?.invoices || (vehicle?.invoice ? [vehicle.invoice] : []);
                                            if (invoices.length === 0) return null;

                                            return (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-green-900">Invoices</h3>
                                                            <div className="text-xs text-green-700">{invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}</div>
                                                        </div>
                                                    </div>

                                                    {invoices.map((invoice) => {
                                                        const investorName = invoice.investorId?.name || 'Unknown Investor';
                                                        const investorEmail = invoice.investorId?.email || '';

                                                        return (
                                                            <div key={invoice._id || invoice.invoiceNo} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div>
                                                                        <h4 className="text-base font-semibold text-green-900">{investorName}</h4>
                                                                        {investorEmail && (
                                                                            <div className="text-xs text-green-700">{investorEmail}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-sm font-semibold text-green-900">Invoice #{invoice.invoiceNo}</div>
                                                                        <div className="text-xs text-green-700 capitalize">{invoice.status || 'N/A'}</div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                    <div className="bg-white rounded-lg p-4 border border-green-200 md:col-span-2">
                                                                        <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Total Amount Payable</div>
                                                                        <div className="text-lg font-bold text-green-900">AED {invoice.totals?.total_amount_payable?.toLocaleString() || '0'}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Invoice Document */}
                                                                {invoice.content && (
                                                                    <div className="bg-white rounded-lg p-4 border border-green-200">
                                                                        <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-3">Invoice Document</div>
                                                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                    </svg>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-sm font-medium text-gray-900">Invoice #{invoice.invoiceNo}</div>
                                                                                    <div className="text-xs text-gray-500">
                                                                                        {invoice.fileSize ? `${(invoice.fileSize / 1024).toFixed(1)} KB` : 'PDF Document'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        setViewingInvoice(true);
                                                                                        try {
                                                                                            const pdfBase64 = invoice.content;
                                                                                            const byteCharacters = atob(pdfBase64);
                                                                                            const byteNumbers = new Array(byteCharacters.length);
                                                                                            for (let i = 0; i < byteCharacters.length; i++) {
                                                                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                                                            }
                                                                                            const byteArray = new Uint8Array(byteNumbers);
                                                                                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                                                            const blobUrl = URL.createObjectURL(blob);
                                                                                            window.open(blobUrl, '_blank');
                                                                                            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                                                                        } catch (err) {
                                                                                            alert(err.response?.data?.message || 'Failed to view invoice');
                                                                                        } finally {
                                                                                            setViewingInvoice(false);
                                                                                        }
                                                                                    }}
                                                                                    disabled={viewingInvoice || downloadingInvoice}
                                                                                    className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    {viewingInvoice ? (
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
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        setDownloadingInvoice(true);
                                                                                        try {
                                                                                            const pdfBase64 = invoice.content;
                                                                                            const byteCharacters = atob(pdfBase64);
                                                                                            const byteNumbers = new Array(byteCharacters.length);
                                                                                            for (let i = 0; i < byteCharacters.length; i++) {
                                                                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                                                            }
                                                                                            const byteArray = new Uint8Array(byteNumbers);
                                                                                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                                                            const blobUrl = URL.createObjectURL(blob);
                                                                                            const link = document.createElement('a');
                                                                                            link.href = blobUrl;
                                                                                            link.download = `Invoice_${invoice.invoiceNo || 'invoice'}.pdf`;
                                                                                            document.body.appendChild(link);
                                                                                            link.click();
                                                                                            document.body.removeChild(link);
                                                                                            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                                                                        } catch (err) {
                                                                                            alert(err.response?.data?.message || 'Failed to download invoice');
                                                                                        } finally {
                                                                                            setDownloadingInvoice(false);
                                                                                        }
                                                                                    }}
                                                                                    disabled={viewingInvoice || downloadingInvoice}
                                                                                    className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    {downloadingInvoice ? (
                                                                                        <span className="flex items-center gap-1">
                                                                                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                            </svg>
                                                                                            Loading...
                                                                                        </span>
                                                                                    ) : (
                                                                                        'Download'
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}

                                        {/* Investment Information (Fallback) */}
                                        {!vehicle?.purchaseOrder && (!vehicle?.invoice && (!vehicle?.invoices || vehicle.invoices.length === 0)) && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h3 className="font-semibold text-gray-900 mb-4">Investment Information</h3>
                                                {vehicle.investorAllocation && vehicle.investorAllocation.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {vehicle.investorAllocation.map((allocation, index) => (
                                                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div>
                                                                        <span className="font-medium text-gray-900">
                                                                            {allocation.investorId?.name || vehicle.investor?.name || 'Unknown Investor'}
                                                                        </span>
                                                                        {allocation.investorId?.email && (
                                                                            <div className="text-xs text-gray-500 mt-1">
                                                                                {allocation.investorId.email}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm text-gray-600 font-medium">
                                                                        {allocation.percentage}%
                                                                    </span>
                                                                </div>
                                                                <div className="text-lg font-semibold text-green-600">
                                                                    AED {allocation.amount?.toLocaleString() || '0'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* Total Investment */}
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold text-gray-900">Total Investment:</span>
                                                                <span className="text-xl font-bold text-blue-600">
                                                                    AED {vehicle.investorAllocation.reduce((sum, alloc) => sum + (alloc.amount || 0), 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : vehicle.investor ? (
                                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div>
                                                                <span className="font-medium text-gray-900">
                                                                    {vehicle.investor?.name || 'Unknown Investor'}
                                                                </span>
                                                                {vehicle.investor?.email && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {vehicle.investor.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {vehicle.purchasePrice && (
                                                            <div className="text-lg font-semibold text-green-600">
                                                                AED {vehicle.purchasePrice.toLocaleString()}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-500 mt-2">
                                                            Investment details from Purchase Order pending
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 text-sm">No financial information available</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        {canMarkReady && (
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-green-100">All Tasks Completed</div>
                                        <div className="text-lg font-bold">Ready for Sale!</div>
                                    </div>
                                </div>
                                <div className="text-sm text-green-100 mb-4">
                                    Operational checklist and financial evidence are complete. You can now mark this vehicle as ready for sale.
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={handleMarkAsReady}
                                        disabled={markingReady}
                                        className="w-full inline-flex justify-center items-center px-4 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {markingReady ? 'Processing...' : 'Mark as Ready for Sale'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add Note (sidebar) */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Add Note</h3>
                            <div className="space-y-3">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    rows="4"
                                    placeholder="Add a note about this vehicle..."
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
            </div>

            {showAgreementModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold">Consignment Agreement</p>
                                <h3 className="text-lg font-semibold text-gray-900">Generate PDF</h3>
                            </div>
                            <button
                                onClick={closeAgreementModal}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleGenerateAgreement} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Owner Summary</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Name</p>
                                        <p className="font-medium text-gray-900">{ownerDefaults.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Contact Number</p>
                                        <p className="font-medium text-gray-900">{ownerDefaults.contact || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Emirates ID / Passport</p>
                                        <p className="font-medium text-gray-900">{ownerDefaults.idDocument || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Address</p>
                                        <p className="font-medium text-gray-900">{ownerDefaults.address || 'Not captured'}</p>
                                    </div>
                                </div>
                            </div>

                            {missingOwnerFields.length > 0 && (
                                <div className="space-y-4">
                                    <p className="text-sm font-semibold text-gray-900">Fill in missing owner details</p>
                                    {missingOwnerFields.map((field) => (
                                        <div key={field.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={field.key}>
                                                {field.label}
                                            </label>
                                            {field.key === 'ownerAddress' ? (
                                                <textarea
                                                    id={field.key}
                                                    name={field.key}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    rows="3"
                                                    value={agreementForm[field.key] || ''}
                                                    onChange={handleAgreementInputChange}
                                                    required
                                                />
                                            ) : (
                                                <input
                                                    id={field.key}
                                                    name={field.key}
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    value={agreementForm[field.key] || ''}
                                                    onChange={handleAgreementInputChange}
                                                    required
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="agreedAmount">
                                    Consignment Agreed Amount (AED)
                                </label>
                                <input
                                    id="agreedAmount"
                                    name="agreedAmount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    onWheel={(event) => event.target.blur()}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 number-input-no-spin"
                                    value={agreementForm.agreedAmount}
                                    onChange={handleAgreementInputChange}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Defaults to the purchased final price (AED {vehicle?.purchasePrice?.toLocaleString() || '0'})
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="duration">
                                    Consignment Duration
                                </label>
                                <select
                                    id="duration"
                                    name="duration"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    value={agreementForm.duration}
                                    onChange={handleAgreementInputChange}
                                >
                                    <option value="30-45 days">30–45 days</option>
                                    <option value="30 days">30 days</option>
                                    <option value="45 days">45 days</option>
                                    <option value="60 days">60 days</option>
                                </select>
                            </div>

                            {agreementError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    {agreementError}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeAgreementModal}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    disabled={generatingAgreement}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={generatingAgreement}
                                >
                                    {generatingAgreement ? 'Generating...' : 'Generate PDF'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteEvidenceModal}
                onClose={() => {
                    if (!deletingInvoiceEvidence[costTypeToDelete]) {
                        setShowDeleteEvidenceModal(false);
                        setCostTypeToDelete(null);
                    }
                }}
                onConfirm={confirmDeleteInvoiceEvidence}
                title="Delete Invoice Evidence"
                message="Are you sure you want to delete this invoice evidence? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={costTypeToDelete ? deletingInvoiceEvidence[costTypeToDelete] : false}
                danger={true}
            />

            <ConfirmDialog
                isOpen={!!documentToDelete}
                onClose={cancelDeleteDocument}
                onConfirm={confirmDeleteDocument}
                title="Delete Document"
                message={`Are you sure you want to delete "${documentToDelete?.fileName || 'this document'}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeletingDocument}
                danger={true}
            />

            <ConfirmDialog
                isOpen={showDeleteNoteModal}
                onClose={cancelDeleteNote}
                onConfirm={confirmDeleteNote}
                title="Delete Note"
                message="Are you sure you want to delete this note?"
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeletingNote}
                danger={true}
            />
        </DashboardLayout>
    );
};

export default InventoryDetail;
