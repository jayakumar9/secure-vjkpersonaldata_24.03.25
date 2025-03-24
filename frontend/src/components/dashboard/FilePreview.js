import React from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

const FilePreview = ({ file, onError }) => {
  const handleViewFile = async () => {
    try {
      if (!file || !file.gridFSId) {
        throw new Error('No file attached');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const fileUrl = `/api/accounts/files/${file.gridFSId}`;
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to load file');
        }
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      const url = URL.createObjectURL(blob);
      
      // Open file in a new window with loading state
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups to view files.');
      }

      // Write loading content
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${file.filename || 'File Preview'}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                background: #1a1a1a;
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: #2a2a2a;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
              }
              .close-btn {
                padding: 8px 16px;
                background: #444;
                border: none;
                color: white;
                border-radius: 4px;
                cursor: pointer;
              }
              .close-btn:hover {
                background: #555;
              }
              .content {
                margin-top: 60px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: calc(100vh - 80px);
              }
              img {
                max-width: 100%;
                max-height: calc(100vh - 80px);
                object-fit: contain;
              }
              .loading {
                text-align: center;
                font-size: 1.2em;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>${file.filename || 'File Preview'}</div>
              <button class="close-btn" onclick="window.close()">Close</button>
            </div>
            <div class="content">
              <div class="loading">Loading file...</div>
            </div>
          </body>
        </html>
      `);

      // Update content based on file type
      if (file.contentType.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const content = newWindow.document.querySelector('.content');
          content.innerHTML = '';
          content.appendChild(img);
        };
        img.src = url;
      } else if (file.contentType === 'application/pdf') {
        newWindow.location.href = url;
      } else {
        // For other file types, trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        newWindow.close();
      }

      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

    } catch (error) {
      console.error('Error viewing file:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <button
      onClick={handleViewFile}
      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <EyeIcon className="w-5 h-5 mr-2 text-gray-500" />
      View File
    </button>
  );
};

export default FilePreview; 