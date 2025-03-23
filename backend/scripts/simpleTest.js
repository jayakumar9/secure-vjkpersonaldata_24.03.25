const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    // Create a simple test file
    const testFile = path.join(__dirname, 'test.txt');
    fs.writeFileSync(testFile, 'Hello, this is a test file');

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));

    // Upload file
    console.log('Uploading file...');
    const response = await fetch('http://localhost:5001/api/files/upload', {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Upload result:', result);

    // Clean up
    fs.unlinkSync(testFile);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testUpload(); 