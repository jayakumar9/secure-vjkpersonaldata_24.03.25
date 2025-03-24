import React from 'react';

class FileViewer {
  constructor({ url, attachedFile }) {
    this.url = url;
    this.attachedFile = attachedFile;
  }

  getViewerContent() {
    if (!this.attachedFile || !this.url) {
      return this.getErrorContent('File information not available');
    }

    const { filename, contentType } = this.attachedFile;
    const isImage = contentType?.startsWith('image/');
    const isPDF = contentType === 'application/pdf';
    const isText = contentType?.includes('text/') || 
                  filename?.toLowerCase().endsWith('.txt') ||
                  filename?.toLowerCase().endsWith('.csv');

    const styles = this.getCommonStyles();
    
    if (isImage) {
      return this.getImageViewerContent();
    } else if (isPDF) {
      return this.getPDFViewerContent();
    } else if (isText) {
      return this.getTextViewerContent();
    } else {
      return this.getDownloadContent();
    }
  }

  getCommonStyles() {
    return `
      body {
        margin: 0;
        padding: 20px;
        background: #1a1a1a;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .container {
        max-width: 95vw;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .file-info {
        flex: 1;
        min-width: 0;
      }
      .filename {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .metadata {
        color: #888;
        font-size: 14px;
        margin-top: 4px;
      }
      .close-button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 16px;
        white-space: nowrap;
      }
      .close-button:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .content {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 100px);
      }
    `;
  }

  getImageViewerContent() {
    const { filename, contentType, size } = this.attachedFile;
    return `
      <html>
        <head>
          <title>${filename || 'Image Viewer'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${this.getCommonStyles()}
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="file-info">
                <h1 class="filename">${filename || 'Untitled'}</h1>
                <div class="metadata">
                  Size: ${((size || 0) / 1024).toFixed(2)} KB
                  <br>
                  Type: ${contentType || 'Unknown'}
                </div>
              </div>
              <button class="close-button" onclick="window.close()">Close</button>
            </div>
            <div class="content">
              <div class="image-container">
                <div class="loading">Loading image...</div>
                <img 
                  src="${this.url}"
                  alt="${filename || 'Image'}"
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

  getPDFViewerContent() {
    const { filename } = this.attachedFile;
    return `
      <html>
        <head>
          <title>${filename || 'PDF Viewer'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${this.getCommonStyles()}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="file-info">
                <h1 class="filename">${filename || 'Untitled'}</h1>
              </div>
              <button class="close-button" onclick="window.close()">Close</button>
            </div>
            <div class="content">
              <iframe 
                src="${this.url}" 
                style="width: 100%; height: 80vh; border: none; border-radius: 8px;"
              ></iframe>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  getTextViewerContent() {
    const { filename } = this.attachedFile;
    return `
      <html>
        <head>
          <title>${filename || 'Text Viewer'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${this.getCommonStyles()}
            pre {
              background: rgba(255, 255, 255, 0.1);
              padding: 20px;
              border-radius: 8px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="file-info">
                <h1 class="filename">${filename || 'Untitled'}</h1>
              </div>
              <button class="close-button" onclick="window.close()">Close</button>
            </div>
            <div class="content">
              <pre id="content">Loading...</pre>
            </div>
          </div>
          <script>
            fetch('${this.url}')
              .then(response => response.text())
              .then(text => {
                document.getElementById('content').textContent = text;
              })
              .catch(error => {
                document.getElementById('content').textContent = 'Error loading file content';
              });
          </script>
        </body>
      </html>
    `;
  }

  getDownloadContent() {
    const { filename } = this.attachedFile;
    return `
      <html>
        <head>
          <title>${filename || 'Download File'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${this.getCommonStyles()}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="file-info">
                <h1 class="filename">${filename || 'Untitled'}</h1>
              </div>
              <button class="close-button" onclick="window.close()">Close</button>
            </div>
            <div class="content" style="text-align: center;">
              <div>
                <p>This file type cannot be previewed directly.</p>
                <a 
                  href="${this.url}" 
                  download="${filename}"
                  style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;"
                >
                  Download File
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  getErrorContent(message) {
    return `
      <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${this.getCommonStyles()}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="file-info">
                <h1 class="filename">Error</h1>
              </div>
              <button class="close-button" onclick="window.close()">Close</button>
            </div>
            <div class="content">
              <div style="color: #ff4444;">${message}</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export default FileViewer; 