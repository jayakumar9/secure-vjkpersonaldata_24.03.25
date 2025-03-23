import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/files');
      setFiles(response.data.files);
      setError('');
    } catch (err) {
      setError('Error fetching files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (fileId) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      // Remove file from state
      setFiles(files.filter((file) => file._id !== fileId));
    } catch (err) {
      setError('Error deleting file');
      console.error('Error deleting file:', err);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await axios.get(`/api/files/download/${fileId}`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error downloading file');
      console.error('Error downloading file:', err);
    }
  };

  const handleView = (fileId) => {
    // Open file in new tab for viewing
    window.open(`/api/files/download/${fileId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-4">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No files uploaded yet
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Uploaded Files</h2>
      <div className="space-y-4">
        {files.map((file) => (
          <div
            key={file._id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div className="flex items-center space-x-3">
              {file.metadata.contentType.startsWith('image/') ? (
                <PhotoIcon className="h-8 w-8 text-gray-400" />
              ) : (
                <DocumentIcon className="h-8 w-8 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {file.metadata.originalname}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.metadata.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {file.metadata.contentType.startsWith('image/') ||
              file.metadata.contentType === 'application/pdf' ? (
                <button
                  onClick={() => handleView(file._id)}
                  className="text-gray-400 hover:text-gray-500"
                  title="View"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => handleDownload(file._id, file.metadata.originalname)}
                  className="text-gray-400 hover:text-gray-500"
                  title="Download"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => handleDelete(file._id)}
                className="text-red-400 hover:text-red-500"
                title="Delete"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList; 