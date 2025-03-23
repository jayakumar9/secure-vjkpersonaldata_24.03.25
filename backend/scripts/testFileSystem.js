const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const API_URL = 'http://localhost:5001/api';

async function testFileSystem() {
  try {
    // Create test files
    const testFiles = {
      image: {
        path: path.join(__dirname, 'test-image.jpg'),
        content: Buffer.from('Fake image data'),
        type: 'image/jpeg'
      },
      pdf: {
        path: path.join(__dirname, 'test.pdf'),
        content: Buffer.from('Fake PDF data'),
        type: 'application/pdf'
      },
      text: {
        path: path.join(__dirname, 'test.txt'),
        content: Buffer.from('This is a test text file'),
        type: 'text/plain'
      },
      large: {
        path: path.join(__dirname, 'large-file.bin'),
        content: Buffer.alloc(16 * 1024 * 1024), // 16MB file
        type: 'application/octet-stream'
      }
    };

    // Create test files
    for (const [key, file] of Object.entries(testFiles)) {
      fs.writeFileSync(file.path, file.content);
    }

    console.log('Created test files successfully');

    // Test 1: Upload and verify image file
    console.log('\n1. Testing image file upload and display...');
    const imageForm = new FormData();
    imageForm.append('file', fs.createReadStream(testFiles.image.path), {
      filename: 'test-image.jpg',
      contentType: testFiles.image.type
    });

    const imageUploadResponse = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      body: imageForm
    });

    const imageUploadResult = await imageUploadResponse.json();
    console.log('Image Upload Response:', imageUploadResult);

    if (!imageUploadResult.success) {
      throw new Error('Image upload failed');
    }

    // Test 2: Upload and verify PDF file
    console.log('\n2. Testing PDF file upload and display...');
    const pdfForm = new FormData();
    pdfForm.append('file', fs.createReadStream(testFiles.pdf.path), {
      filename: 'test.pdf',
      contentType: testFiles.pdf.type
    });

    const pdfUploadResponse = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      body: pdfForm
    });

    const pdfUploadResult = await pdfUploadResponse.json();
    console.log('PDF Upload Response:', pdfUploadResult);

    if (!pdfUploadResult.success) {
      throw new Error('PDF upload failed');
    }

    // Test 3: Upload and verify text file (should download)
    console.log('\n3. Testing text file upload and download...');
    const textForm = new FormData();
    textForm.append('file', fs.createReadStream(testFiles.text.path), {
      filename: 'test.txt',
      contentType: testFiles.text.type
    });

    const textUploadResponse = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      body: textForm
    });

    const textUploadResult = await textUploadResponse.json();
    console.log('Text Upload Response:', textUploadResult);

    if (!textUploadResult.success) {
      throw new Error('Text file upload failed');
    }

    // Test 4: Test file size limit (16MB file)
    console.log('\n4. Testing file size limit...');
    const largeForm = new FormData();
    largeForm.append('file', fs.createReadStream(testFiles.large.path), {
      filename: 'large-file.bin',
      contentType: testFiles.large.type
    });

    const largeUploadResponse = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      body: largeForm
    });

    const largeUploadResult = await largeUploadResponse.json();
    console.log('Large File Upload Response:', largeUploadResult);

    if (largeUploadResult.success) {
      throw new Error('Large file upload should have failed');
    }

    // Test 5: Delete uploaded files
    console.log('\n5. Testing file deletion...');
    const fileIds = [imageUploadResult.fileId, pdfUploadResult.fileId, textUploadResult.fileId];
    
    for (const fileId of fileIds) {
      const deleteResponse = await fetch(`${API_URL}/files/${fileId}`, {
        method: 'DELETE'
      });

      const deleteResult = await deleteResponse.json();
      console.log(`Delete Response for ${fileId}:`, deleteResult);

      if (!deleteResult.success) {
        throw new Error(`Failed to delete file ${fileId}`);
      }
    }

    // Clean up test files
    for (const file of Object.values(testFiles)) {
      fs.unlinkSync(file.path);
    }

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the tests
testFileSystem(); 