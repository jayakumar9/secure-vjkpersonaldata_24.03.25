// File size formatting
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Generate PDF preview
export const generatePDFPreview = async (file) => {
  try {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    const PREVIEW_SCALE = 0.5;

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: PREVIEW_SCALE });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    return null;
  }
};

// File type detection
export const getFileType = (file) => {
  if (file.type.startsWith('image/')) {
    return 'image';
  } else if (file.type === 'application/pdf') {
    return 'pdf';
  } else if (['doc', 'docx'].includes(file.name.split('.').pop().toLowerCase())) {
    return 'word';
  } else if (['txt', 'rtf'].includes(file.name.split('.').pop().toLowerCase())) {
    return 'text';
  }
  return 'document';
}; 