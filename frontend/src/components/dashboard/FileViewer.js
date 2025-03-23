import React from 'react';

const FileViewer = ({ url, attachedFile, type }) => {
  const getViewerContent = () => {
    switch (type) {
      case 'image':
        return `
          <html>
            <head>
              <title>Image Viewer - ${attachedFile.filename}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  min-height: 100vh;
                  background: #1a1a1a;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .container {
                  max-width: 95vw;
                  max-height: 95vh;
                  position: relative;
                }
                img {
                  max-width: 100%;
                  max-height: 85vh;
                  object-fit: contain;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  display: none;
                }
                .filename {
                  color: white;
                  text-align: center;
                  margin: 20px 0;
                  font-size: 16px;
                }
                .loading {
                  color: white;
                  text-align: center;
                  margin: 20px;
                }
                .error {
                  color: #ff4444;
                  text-align: center;
                  margin: 20px;
                }
                .close-button {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: rgba(255, 255, 255, 0.2);
                  border: none;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  z-index: 1000;
                }
                .close-button:hover {
                  background: rgba(255, 255, 255, 0.3);
                }
                .file-info {
                  color: #888;
                  font-size: 14px;
                  text-align: center;
                  margin-top: 10px;
                }
              </style>
            </head>
            <body>
              <button class="close-button" onclick="window.close()">Close</button>
              <div class="container">
                <div class="loading">Loading image...</div>
                <img 
                  src="${url}"
                  alt="${attachedFile.filename}"
                  onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                  onerror="this.style.display='none'; this.previousElementSibling.className='error'; this.previousElementSibling.textContent='Error loading image';"
                />
                <div class="filename">${attachedFile.filename}</div>
                <div class="file-info">
                  Size: ${(attachedFile.size / 1024).toFixed(2)} KB
                  <br>
                  Type: ${attachedFile.contentType}
                  <br>
                  Uploaded: ${new Date(attachedFile.uploadDate).toLocaleString()}
                </div>
              </div>
              <script>
                window.onunload = function() {
                  URL.revokeObjectURL("${url}");
                };
              </script>
            </body>
          </html>
        `;
      case 'text':
        return `
          <html>
            <head>
              <title>File Viewer - ${attachedFile.filename}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  background: #1a1a1a;
                  color: #ffffff;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .content {
                  background: #2a2a2a;
                  padding: 20px;
                  border-radius: 8px;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  max-width: 100%;
                  overflow-x: auto;
                  font-size: 14px;
                  line-height: 1.5;
                  display: none;
                }
                .loading {
                  color: white;
                  text-align: center;
                  margin: 20px;
                }
                .error {
                  color: #ff4444;
                  text-align: center;
                  margin: 20px;
                }
                .filename {
                  color: white;
                  margin-bottom: 20px;
                  font-size: 16px;
                }
                .close-button {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: rgba(255, 255, 255, 0.2);
                  border: none;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                }
                .file-info {
                  color: #888;
                  font-size: 14px;
                  margin: 10px 0;
                }
              </style>
            </head>
            <body>
              <button class="close-button" onclick="window.close()">Close</button>
              <div class="filename">${attachedFile.filename}</div>
              <div class="file-info">
                Size: ${(attachedFile.size / 1024).toFixed(2)} KB
                <br>
                Type: ${attachedFile.contentType}
                <br>
                Uploaded: ${new Date(attachedFile.uploadDate).toLocaleString()}
              </div>
              <div class="loading">Loading content...</div>
              <div class="content"></div>
              <script>
                fetch("${url}")
                  .then(response => {
                    if (!response.ok) throw new Error('Failed to load file content');
                    return response.text();
                  })
                  .then(text => {
                    document.querySelector('.content').textContent = text;
                    document.querySelector('.content').style.display = 'block';
                    document.querySelector('.loading').style.display = 'none';
                  })
                  .catch(error => {
                    document.querySelector('.loading').className = 'error';
                    document.querySelector('.loading').textContent = 'Error loading file: ' + error.message;
                  })
                  .finally(() => {
                    setTimeout(() => URL.revokeObjectURL("${url}"), 1000);
                  });
              </script>
            </body>
          </html>
        `;
      default:
        return null;
    }
  };

  return { getViewerContent };
};

export default FileViewer; 