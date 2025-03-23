import React, { useEffect } from 'react';
import { formatFileSize } from './utils';

const FilePreview = ({ file, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
    };
  }, [file, onClose]);

  if (!file) return null;

  const renderContent = () => {
    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={file.url} 
          alt={file.name}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <iframe
          src={file.url}
          title={file.name}
          style={{ width: '100%', height: '80vh', border: 'none' }}
        />
      );
    }

    return (
      <div className="p-4">
        <a
          href={file.url}
          download={file.name}
          className="text-blue-500 hover:text-blue-700 underline"
        >
          Download {file.name}
        </a>
        <div className="mt-2 text-gray-600">
          Type: {file.type}
          {file.size && `, Size: ${formatFileSize(file.size)}`}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center">
      <div className="relative bg-white rounded-lg max-w-[90%] max-h-[90%] overflow-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl text-gray-600 hover:text-gray-800"
        >
          ×
        </button>
        <div className="p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreview; 