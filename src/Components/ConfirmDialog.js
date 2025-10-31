import React from 'react';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    danger = false
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={!isLoading ? onClose : undefined}
        >
            <div
                className="relative bg-white rounded-lg shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {title}
                        </h3>
                        {!isLoading && (
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    <p className="text-sm text-gray-600">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-lg">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isLoading
                                ? 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isLoading
                                ? danger
                                    ? 'bg-red-400 text-white cursor-not-allowed'
                                    : 'bg-primary-400 text-white cursor-not-allowed'
                                : danger
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin inline-block -ml-1 mr-2 h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Deleting...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;

