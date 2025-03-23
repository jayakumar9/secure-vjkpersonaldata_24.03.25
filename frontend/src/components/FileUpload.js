import React, { useState, useRef } from 'react';
import axios from 'axios';
import { DocumentIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    // Check file size (15MB limit)
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds 15MB limit');
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setError('');

      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Clear the form
        setFile(null);
        setPreview(null);
        // You can handle success here (e.g., show success message, update file list)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${!file ? 'hover:border-gray-400' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="text-center">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm leading-6 text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  ref={fileInputRef}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs leading-5 text-gray-600">
              Up to 15MB. Images and PDFs will be displayed in browser.
            </p>
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-gray-400 hover:text-gray-500"
              onClick={clearFile}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="mx-auto max-h-48 object-contain"
              />
            ) : (
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div className="mt-2 text-center">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">{error}</div>
      )}

      {file && (
        <div className="mt-4">
          <button
            type="button"
            className={`w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 