const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000/api';

async function testFileEndpoints() {
  try {
    // 1. Test File Upload
    console.log('\n1. Testing File Upload...');
    const formData = new FormData();
    const testFile = fs.createReadStream(path.join(__dirname, 'test.txt'));
    formData.append('file', testFile);

    const uploadResponse = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    console.log('Upload Response:', uploadResult);

    if (!uploadResult.success) {
      throw new Error('File upload failed');
    }

    const fileId = uploadResult.fileId;

    // 2. Test File Download
    console.log('\n2. Testing File Download...');
    const downloadResponse = await fetch(`${API_URL}/files/download/${fileId}`);
    
    if (!downloadResponse.ok) {
      throw new Error('File download failed');
    }

    const downloadBuffer = await downloadResponse.buffer();
    console.log('Download successful, file size:', downloadBuffer.length, 'bytes');

    // 3. Test File Delete
    console.log('\n3. Testing File Delete...');
    const deleteResponse = await fetch(`${API_URL}/files/${fileId}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteResponse.json();
    console.log('Delete Response:', deleteResult);

    if (!deleteResult.success) {
      throw new Error('File deletion failed');
    }

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Create a test file
const testFilePath = path.join(__dirname, 'test.txt');
fs.writeFileSync(testFilePath, 'This is a test file for GridFS testing.');

// Run the tests
testFileEndpoints(); 