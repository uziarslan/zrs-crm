import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Layout/DashboardLayout';
import axiosInstance from '../../services/axiosInstance';
import { useAuth } from '../../Context/AuthContext';
import ConfirmDialog from '../../Components/ConfirmDialog';
import RegistrationCardIcon from '../../assets/icons/registration-card.svg';
import CarPicturesIcon from '../../assets/icons/car-pictures.svg';
import OnlineHistoryCheckIcon from '../../assets/icons/online-history-check.svg';

const NegotiationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('documents');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notes, setNotes] = useState('');
    const [documents, setDocuments] = useState({
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
    const [showMoveToInspectionModal, setShowMoveToInspectionModal] = useState(false);
    const [isMovingToInspection, setIsMovingToInspection] = useState(false);
    const [viewingDocumentId, setViewingDocumentId] = useState(null);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);

    const documentCategories = [
        { key: 'registrationCard', label: 'Registration Card', accept: '.pdf,.png,.jpg,.jpeg', multiple: false, IconComponent: RegistrationCardIcon },
        { key: 'carPictures', label: 'Car Pictures', accept: '.png,.jpg,.jpeg', multiple: true, IconComponent: CarPicturesIcon },
        { key: 'onlineHistoryCheck', label: 'Online History Check', accept: '.pdf', multiple: false, IconComponent: OnlineHistoryCheckIcon }
    ];

    useEffect(() => {
        fetchLead();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchLead = async () => {
        try {
            const response = await axiosInstance.get(`/purchases/leads/${id}`);
            const leadData = response.data.data;
            setLead(leadData);
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
        const hasFiles = documents.registrationCard ||
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

    const handleDeleteDocument = (docId, fileName) => {
        setDocumentToDelete({ id: docId, name: fileName });
        setShowDeleteDocModal(true);
    };

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

    const areAllDocumentsUploaded = () => {
        const hasRegistrationCard = getDocumentsByCategory('registrationCard').length > 0;
        const hasCarPictures = getDocumentsByCategory('carPictures').length > 0;
        const hasOnlineHistoryCheck = getDocumentsByCategory('onlineHistoryCheck').length > 0;
        return hasRegistrationCard && hasCarPictures && hasOnlineHistoryCheck;
    };

    const getDocumentCompletionPercentage = () => {
        let completed = 0;
        const registrationDocs = getDocumentsByCategory('registrationCard');
        const carPicturesDocs = getDocumentsByCategory('carPictures');
        const historyDocs = getDocumentsByCategory('onlineHistoryCheck');

        if (registrationDocs.length > 0) completed++;
        if (carPicturesDocs.length > 0) completed++;
        if (historyDocs.length > 0) completed++;

        const percentage = Math.round((completed / 3) * 100);

        return percentage;
    };

    const handleMoveToInspection = () => {
        setShowMoveToInspectionModal(true);
    };

    const confirmMoveToInspection = async () => {
        setIsMovingToInspection(true);
        try {
            await axiosInstance.put(`/purchases/leads/${id}/status`, {
                status: 'inspection'
            });
            setShowMoveToInspectionModal(false);
            navigate('/purchases/inspection');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to move to inspection');
        } finally {
            setIsMovingToInspection(false);
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

    if (loading) {
        return (
            <DashboardLayout title="Negotiation Details">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Negotiation Details">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </DashboardLayout>
        );
    }

    const completionPercentage = getDocumentCompletionPercentage();

    return (
        <DashboardLayout title={`Negotiation ${lead?.leadId}`}>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate('/purchases/negotiation')}
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Negotiation
                    </button>
                </div>

                {/* Progress Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">{lead?.leadId}</h1>
                            <p className="text-purple-100 text-sm">
                                {lead?.vehicleInfo?.make} {lead?.vehicleInfo?.model} • {lead?.contactInfo.name}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-purple-100 mb-1">Document Progress</div>
                            <div className="text-3xl font-bold">{completionPercentage}%</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-purple-400/30 rounded-full h-2">
                        <div
                            className="bg-white h-2 rounded-full transition-all duration-500"
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-sm text-purple-100">
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {getDocumentsByCategory('registrationCard').length > 0 ? 'Registration ✓' : 'Registration'}
                        </span>
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {getDocumentsByCategory('carPictures').length > 0 ? 'Pictures ✓' : 'Pictures'}
                        </span>
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {getDocumentsByCategory('onlineHistoryCheck').length > 0 ? 'History ✓' : 'History'}
                        </span>
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
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'documents' && (
                                <div className="space-y-6">
                                    {documentCategories.map((category) => {
                                        const uploadedDocs = getDocumentsByCategory(category.key);
                                        const isComplete = uploadedDocs.length > 0;

                                        return (
                                            <div
                                                key={category.key}
                                                className={`border-2 rounded-lg p-5 transition-all ${isComplete
                                                    ? 'border-green-300 bg-green-50'
                                                    : 'border-gray-200 bg-white'
                                                    }`}
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                            }`}>
                                                            <img src={category.IconComponent} alt={category.label} className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900">{category.label}</h4>
                                                            <p className="text-xs text-gray-500">
                                                                {category.multiple ? 'Multiple files allowed' : 'Single file'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isComplete && (
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            Complete
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Uploaded Files */}
                                                {uploadedDocs.length > 0 && (
                                                    <div className="mb-4">
                                                        {category.key === 'carPictures' ? (
                                                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                                {uploadedDocs.map((doc) => (
                                                                    <div key={doc._id} className="group relative aspect-square">
                                                                        <img
                                                                            src={doc.url}
                                                                            alt={doc.fileName}
                                                                            className="w-full h-full object-cover rounded-lg border-2 border-gray-200 hover:border-primary-500 cursor-pointer transition-all"
                                                                            onClick={() => handleViewDocument(doc)}
                                                                        />
                                                                        {user?.role === 'admin' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteDocument(doc._id, doc.fileName);
                                                                                }}
                                                                                className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
                                                                    <div
                                                                        key={doc._id}
                                                                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-500 hover:shadow-sm transition-all"
                                                                    >
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</div>
                                                                                <div className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 ml-3">
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
                                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

                                                {/* Upload Section */}
                                                <div className="space-y-3">
                                                    {documents[category.key] && (category.multiple ? documents[category.key].length > 0 : true) && (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                            <div className="text-xs font-medium text-blue-700 mb-2">Selected for upload:</div>
                                                            <div className="space-y-1">
                                                                {category.multiple ? (
                                                                    documents[category.key].map((file, index) => (
                                                                        <div key={index} className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                                                                            <span className="text-xs text-gray-900 truncate flex-1">{file.name}</span>
                                                                            {!uploading && (
                                                                                <button
                                                                                    onClick={() => removeFile(category.key, index)}
                                                                                    className="ml-2 text-red-600 hover:text-red-800"
                                                                                >
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
                                                                            <button
                                                                                onClick={() => removeFile(category.key)}
                                                                                className="ml-2 text-red-600 hover:text-red-800"
                                                                            >
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
                                                                ? 'border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100'
                                                                : 'border-gray-300 bg-gray-50 hover:border-primary-500 hover:bg-primary-50'
                                                            }`}
                                                    >
                                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {category.multiple ? 'Add More Files' : 'Choose File'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            (Max 10MB • {category.accept.replace(/\./g, '').toUpperCase()})
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Upload Progress */}
                                    {uploading && (
                                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-sm font-semibold text-blue-900">Uploading documents... {uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-3">
                                                <div
                                                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Button */}
                                    {(documents.registrationCard || documents.carPictures.length > 0 || documents.onlineHistoryCheck) && !uploading && (
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
                                                                                    onClick={() => handleDeleteNote(note._id)}
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
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Completion Status */}
                    {areAllDocumentsUploaded() && lead?.status === 'negotiation' && (
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-green-100">Ready to Proceed</div>
                                    <div className="text-lg font-bold">All Documents Complete!</div>
                                </div>
                            </div>
                            <button
                                onClick={handleMoveToInspection}
                                className="w-full inline-flex justify-center items-center px-4 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-all shadow-lg"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                Move to Inspection
                            </button>
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
                                placeholder="Add a note about this negotiation..."
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

                    {/* Lead Info removed (moved to Details tab metadata) */}

                    {/* Document Checklist */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Document Checklist</h3>
                        <div className="space-y-3">
                            {documentCategories.map((category) => {
                                const isComplete = getDocumentsByCategory(category.key).length > 0;
                                return (
                                    <div
                                        key={category.key}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isComplete ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isComplete ? 'bg-green-600' : 'bg-gray-300'
                                            }`}>
                                            {isComplete ? (
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className={`text-sm font-medium ${isComplete ? 'text-green-900' : 'text-gray-700'}`}>
                                                {category.label}
                                            </div>
                                            {isComplete && (
                                                <div className="text-xs text-green-600">
                                                    {getDocumentsByCategory(category.key).length} file(s)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={cancelDeleteNote}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
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
                            <button
                                onClick={cancelDeleteNote}
                                disabled={isDeleting}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${isDeleting ? 'bg-white text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteNote}
                                disabled={isDeleting}
                                className={`px-4 py-2 text-sm font-medium rounded-lg ${isDeleting ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            >
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
                message={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeletingDoc}
                danger={true}
            />

            <ConfirmDialog
                isOpen={showMoveToInspectionModal}
                onClose={() => {
                    if (!isMovingToInspection) {
                        setShowMoveToInspectionModal(false);
                    }
                }}
                onConfirm={confirmMoveToInspection}
                title="Move to Inspection"
                message="All required documents have been uploaded. Are you sure you want to move this lead to the Inspection phase?"
                confirmText="Move to Inspection"
                cancelText="Cancel"
                isLoading={isMovingToInspection}
                danger={false}
            />
        </DashboardLayout>
    );
};

export default NegotiationDetail;
