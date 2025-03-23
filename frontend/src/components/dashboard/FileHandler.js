import { generatePDFPreview } from './utils';

export const handleFileChange = async (e, setFormData, setFilePreview, showNotification) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showNotification('File size must be less than 5MB', 'error');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      attachedFile: file
    }));

    // Create preview based on file type
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview({
          contentType: 'image',
          url: reader.result,
          name: file.name,
          size: file.size,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      try {
        const pdfPreviewUrl = await generatePDFPreview(file);
        setFilePreview({
          contentType: 'pdf',
          url: pdfPreviewUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type
        });
      } catch (error) {
        console.error('Error generating PDF preview:', error);
        showNotification('Error generating PDF preview', 'error');
      }
    } else {
      // For other file types, show icon based on extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let iconType = 'document';
      
      if (['doc', 'docx'].includes(fileExtension)) {
        iconType = 'word';
      } else if (['txt', 'rtf'].includes(fileExtension)) {
        iconType = 'text';
      }
      
      setFilePreview({
        contentType: iconType,
        name: file.name,
        size: file.size,
        mimeType: file.type
      });
    }
  } else {
    setFilePreview(null);
  }
};

export const handleViewFile = async (attachedFile, accountId) => {
  if (!attachedFile || !attachedFile.gridFSId) {
    throw new Error('No file attached to this account');
  }

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }

  console.log('Attempting to view file:', {
    filename: attachedFile.filename,
    contentType: attachedFile.contentType,
    size: attachedFile.size,
    uploadDate: attachedFile.uploadDate,
    gridFSId: attachedFile.gridFSId
  });

  const fileUrl = `/api/accounts/files/${attachedFile.gridFSId}`;

  try {
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
        console.error('Server error response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to load file');
      }
      console.error('Non-JSON error response:', {
        status: response.status,
        statusText: response.statusText,
        contentType
      });
      throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Received empty file from server');
    }

    const url = URL.createObjectURL(blob);
    
    // Open file based on content type
    if (attachedFile.contentType.startsWith('image/') || attachedFile.contentType === 'application/pdf') {
      // Open images and PDFs in a new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups to view files.');
      }
    } else {
      // Download other files
      const a = document.createElement('a');
      a.href = url;
      a.download = attachedFile.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    // Clean up the blob URL after a short delay to ensure the browser has time to handle it
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error('File handling error:', error);
    throw new Error(`Error viewing file: ${error.message}`);
  }
}; 