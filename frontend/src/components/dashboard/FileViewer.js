import React from 'react';

const FileViewer = ({ url, attachedFile }) => {
  const getViewerContent = () => {
    if (!attachedFile || !url) {
      return `
        <html>
          <head>
            <title>Error</title>
            <style>
              body { 
                background: #1a1a1a;
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div>Error: File information not available</div>
          </body>
        </html>
      `;
    }

    const isImage = attachedFile.contentType?.startsWith('image/');
    const isPDF = attachedFile.contentType === 'application/pdf';
    const isText = attachedFile.contentType?.includes('text/') || 
                  attachedFile.filename?.toLowerCase().endsWith('.txt') ||
                  attachedFile.filename?.toLowerCase().endsWith('.csv');

    const commonStyles = `
      body {
        margin: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        background: #1a1a1a;
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
      }
      .container {
        max-width: 95vw;
        width: 100%;
        margin: 0 auto;
        position: relative;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }
      .filename {
        margin: 0;
        font-size: 16px;
        color: white;
        word-break: break-all;
      }
      .file-info {
        color: #888;
        font-size: 14px;
        margin-top: 5px;
      }
      .close-button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        white-space: nowrap;
        margin-left: 16px;
      }
      .close-button:hover {
        background: rgba(255, 255, 255, 0.3);
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
    `;

    if (isImage) {
      return `
        <html>
          <head>
            <title>${attachedFile.filename || 'Image Viewer'}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              ${commonStyles}
              .content {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                width: 100%;
              }
              img {
                max-width: 100%;
                max-height: 80vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .image-container {
                position: relative;
                display: inline-block;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div style="min-width: 0; flex: 1;">
                  <h1 class="filename">${attachedFile.filename || 'Untitled'}</h1>
                  <div class="file-info">
                    Size: ${((attachedFile.size || 0) / 1024).toFixed(2)} KB
                    <br>
                    Type: ${attachedFile.contentType || 'Unknown'}
                  </div>
                </div>
                <button class="close-button" onclick="window.close()">Close</button>
              </div>
              <div class="content">
                <div class="image-container">
                  <div class="loading">Loading image...</div>
                  <img 
                    src="${url}"
                    alt="${attachedFile.filename || 'Image'}"
                    onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                    onerror="this.style.display='none'; this.previousElementSibling.className='error'; this.previousElementSibling.textContent='Error loading image';"
                    style="display: none;"
                  />
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    if (isPDF) {
      return `
        <html>
          <head>
            <title>PDF Viewer - ${attachedFile.filename}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              ${commonStyles}
              .content {
                width: 100%;
                height: calc(100vh - 100px);
                margin-top: 20px;
              }
              iframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 8px;
                background: white;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div>
                  <h1 class="filename">${attachedFile.filename}</h1>
                  <div class="file-info">
                    Size: ${(attachedFile.size / 1024).toFixed(2)} KB
                    <br>
                    Type: ${attachedFile.contentType}
                  </div>
                </div>
                <button class="close-button" onclick="window.close()">Close</button>
              </div>
              <div class="content">
                <iframe src="${url}#toolbar=0" title="${attachedFile.filename}"></iframe>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    if (isText) {
      return `
        <html>
          <head>
            <title>Text Viewer - ${attachedFile.filename}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              ${commonStyles}
              .content {
                width: 100%;
                margin-top: 20px;
                background: #2a2a2a;
                padding: 20px;
                border-radius: 8px;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: monospace;
                font-size: 14px;
                line-height: 1.5;
                color: #e0e0e0;
                overflow-x: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div>
                  <h1 class="filename">${attachedFile.filename}</h1>
                  <div class="file-info">
                    Size: ${(attachedFile.size / 1024).toFixed(2)} KB
                    <br>
                    Type: ${attachedFile.contentType}
                  </div>
                </div>
                <button class="close-button" onclick="window.close()">Close</button>
              </div>
              <div class="loading">Loading content...</div>
              <pre class="content" style="display: none;"></pre>
            </div>
            <script>
              fetch("${url}")
                .then(response => response.text())
                .then(text => {
                  document.querySelector('.content').textContent = text;
                  document.querySelector('.content').style.display = 'block';
                  document.querySelector('.loading').style.display = 'none';
                })
                .catch(error => {
                  document.querySelector('.loading').className = 'error';
                  document.querySelector('.loading').textContent = 'Error loading file: ' + error.message;
                });
            </script>
          </body>
        </html>
      `;
    }

    // For other file types, show download page
    return `
      <html>
        <head>
          <title>File Download - ${attachedFile.filename}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${commonStyles}
            .content {
              text-align: center;
              margin-top: 40px;
            }
            .download-button {
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .download-button:hover {
              background: #1d4ed8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <h1 class="filename">${attachedFile.filename}</h1>
                <div class="file-info">
                  Size: ${(attachedFile.size / 1024).toFixed(2)} KB
                  <br>
                  Type: ${attachedFile.contentType}
                </div>
              </div>
              <button class="close-button" onclick="window.close()">Close</button>
            </div>
            <div class="content">
              <p>This file type cannot be previewed directly.</p>
              <a href="${url}" download="${attachedFile.filename}">
                <button class="download-button">Download File</button>
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  return { getViewerContent };
};

export default FileViewer; 