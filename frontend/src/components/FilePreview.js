import React from 'react';

const FilePreview = ({ file }) => {
  const openFileInNewTab = () => {  // Removed async since we're just testing tab opening
    try {
      console.log('Attempting to open new tab');
      
      // Basic test - just open a new tab with simple content
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups to view files.');
      }

      // Write simple test content
      newWindow.document.write(`
        <html>
          <head>
            <title>Test View</title>
          </head>
          <body>
            <h1>Test Content</h1>
            <p>Filename: ${file.filename}</p>
            <p>File ID: ${file.gridFSId}</p>
          </body>
        </html>
      `);
      newWindow.document.close();
      
      console.log('New tab opened successfully');

    } catch (error) {
      console.error('Error opening new tab:', error);
      alert(error.message);
    }
  };

  return (
    <button
      onClick={openFileInNewTab}
      className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-300 hover:text-blue-200"
    >
      <svg 
        className="w-4 h-4 mr-1" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
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
      View "{file.filename}"
    </button>
  );
};

export default FilePreview; 