import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatFileSize } from './dashboard/utils';
import FilePreview from './dashboard/FilePreview';
// eslint-disable-next-line 
import { handleFileChange, handleViewFile } from './dashboard/FileHandler';
import { EyeIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    website: '',
    name: '',
    username: '',
    email: '',
    password: '',
    attachedFile: null,
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const { user, logout } = useAuth();
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      console.log('Fetching accounts...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        showNotification('No authentication token found', 'error');
        return;
      }

      const response = await fetch('/api/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch accounts');
      }

      const data = await response.json();
      console.log('Fetched accounts:', data.length);
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      showNotification(error.message, 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    console.log('Accounts state updated:', accounts.length);
  }, [accounts]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }

      const response = await fetch('/api/accounts/check-admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }

      const data = await response.json();
      console.log('Admin status:', data);
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      showNotification('Error checking admin status', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchAccounts();
    checkAdminStatus();
  }, [fetchAccounts, checkAdminStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadStartTime(null);

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'attachedFile') {
          if (formData[key] instanceof File) {
            formDataToSend.append(key, formData[key]);
          }
        } else if (key !== '_id') {
          formDataToSend.append(key, formData[key]);
        }
      });

      const url = formData._id 
        ? `/api/accounts/${formData._id}`
        : '/api/accounts';
      
      const method = formData._id ? 'PUT' : 'POST';

      // Create XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Calculate progress percentage
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);

          // Calculate upload speed
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000; // Convert to seconds
          if (timeDiff > 0) {
            const loadedDiff = event.loaded - lastLoaded;
            const speed = (loadedDiff / timeDiff) / 1024; // KB/s
            setUploadSpeed(speed);
            lastLoaded = event.loaded;
            lastTime = currentTime;
          }

          // Set upload start time only once
          if (!uploadStartTime) {
            setUploadStartTime(startTime);
          }
        }
      });

      // Wrap XMLHttpRequest in a Promise
      const response = await new Promise((resolve, reject) => {
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: true, json: () => Promise.resolve(data) });
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: false, json: () => Promise.resolve(data) });
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formDataToSend);
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save account');
      }

      showNotification(data.message || (formData._id ? 'Account updated successfully' : 'Account created successfully'));
      
      setFormData({
        website: '',
        name: '',
        username: '',
        email: '',
        password: '',
        attachedFile: null,
        note: ''
      });
      setShowAddForm(false);
      await fetchAccounts();
    } catch (err) {
      console.error('Submit error:', err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadSpeed(0);
      setUploadStartTime(null);
    }
  };

  const handleEdit = (account) => {
    setFilePreview(null);
    setFormData({
      _id: account._id,
      website: account.website || '',
      name: account.name || '',
      username: account.username || '',
      email: account.email || '',
      password: account.password || '',
      note: account.note || '',
      attachedFile: account.attachedFile || null
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        const response = await fetch(`/api/accounts/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete account');
        }

        showNotification('Account deleted successfully');
        await fetchAccounts();
      } catch (error) {
        console.error('Delete error:', error);
        showNotification(error.message, 'error');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = () => {
    logout();
  };

  const handleCleanup = async () => {
    if (window.confirm('Are you sure you want to clean up unused files?')) {
      try {
        const response = await fetch('/api/accounts/cleanup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to clean up files');
        }

        const data = await response.json();
        showNotification(data.message || 'Files cleaned up successfully');
      } catch (error) {
        console.error('Cleanup error:', error);
        showNotification(error.message, 'error');
      }
    }
  };

  const handleFileChangeWrapper = (e) => {
    handleFileChange(e, setFormData, setFilePreview, showNotification);
  };

  const generatePassword = async () => {
    try {
      const response = await fetch('/api/accounts/generate-password', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate password');
      }
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, password: data.password }));
    } catch (error) {
      console.error('Password generation error:', error);
      showNotification('Failed to generate password', 'error');
    }
  };

  const handleViewFile = async (attachedFile) => {
    try {
      if (!attachedFile) {
        console.error('No file data provided');
        throw new Error('No file attached');
      }

      console.log('Attempting to view file:', {
        hasGridFSId: !!attachedFile.gridFSId,
        filename: attachedFile.filename,
        contentType: attachedFile.contentType,
        size: attachedFile.size
      });

      if (!attachedFile.gridFSId) {
        console.error('File data missing gridFSId:', attachedFile);
        throw new Error('Invalid file data - missing file ID');
      }

      const fileId = attachedFile.gridFSId.toString();
      console.log('Viewing file with gridFSId:', fileId);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `/api/accounts/files/${fileId}`;
      console.log('Making request to:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('File fetch error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || `Failed to fetch file: ${response.status}`);
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? decodeURIComponent(contentDisposition.split('filename=')[1].replace(/"/g, ''))
        : attachedFile.filename || 'download';

      // Get the content type
      const contentType = response.headers.get('Content-Type') || attachedFile.contentType || 'application/octet-stream';

      // Create blob from response
      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      console.log('File loaded successfully:', {
        filename,
        contentType,
        size: blob.size
      });

      // Set file preview data
      setFilePreview({
        url: fileUrl,
        type: contentType,
        name: filename,
        size: blob.size
      });
    } catch (error) {
      console.error('Error viewing file:', error);
      showNotification(error.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Personal Data Manager</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Welcome, {user?.email}</span>
            {isAdmin && (
              <button
                onClick={handleCleanup}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Cleanup Files
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {notification.show && (
          <div className={`p-4 rounded mb-4 ${
            notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="mb-8">
          <button
            onClick={() => {
              setFormData({
                website: '',
                name: '',
                username: '',
                email: '',
                password: '',
                attachedFile: null,
                note: ''
              });
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add Account
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {formData._id ? 'Edit Account' : 'Add New Account'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white rounded p-2 pr-24"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="px-2 text-gray-400 hover:text-white"
                      >
                        {passwordVisible ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="px-2 text-blue-400 hover:text-blue-300"
                        title="Generate Strong Password"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Note
                  </label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded p-2"
                    rows="3"
                  ></textarea>
                </div>
              </div>

              <FilePreview
                filePreview={filePreview}
                formData={formData}
                handleFileChange={handleFileChangeWrapper}
                handleViewFile={handleViewFile}
                setFilePreview={setFilePreview}
                setFormData={setFormData}
                formatFileSize={formatFileSize}
                uploadProgress={uploadProgress}
                uploadSpeed={uploadSpeed}
                uploadStartTime={uploadStartTime}
              />

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Saving...' : formData._id ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div key={account._id} className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-sm text-gray-400 mb-1 block">
                    #{account.serialNumber}
                  </span>
                  <h3 className="text-xl font-semibold flex items-center">
                    {account.logo && (
                      <img
                        src={account.logo}
                        alt={`${account.website} logo`}
                        className="w-6 h-6 mr-2 rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.website)}&background=random&size=128`;
                        }}
                      />
                    )}
                    {account.website}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(account)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account._id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p><span className="text-gray-400">Name:</span> {account.name}</p>
                <p><span className="text-gray-400">Username:</span> {account.username}</p>
                <p><span className="text-gray-400">Email:</span> {account.email}</p>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2">Password:</span>
                  <div className="relative flex-1">
                    <input
                      type={showPassword[account._id] ? "text" : "password"}
                      value={account.password}
                      readOnly
                      className="w-full bg-gray-700 text-white rounded p-1 pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => ({
                        ...prev,
                        [account._id]: !prev[account._id]
                      }))}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                    >
                      {showPassword[account._id] ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                {account.note && (
                  <p>
                    <span className="text-gray-400">Note:</span>
                    <br />
                    <span className="whitespace-pre-wrap">{account.note}</span>
                  </p>
                )}
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={!!account.attachedFile}
                    readOnly
                  />
                  <span className="ml-2">
                    {account.attachedFile ? (
                      <button
                        onClick={() => handleViewFile(account.attachedFile)}
                        className="text-blue-300 hover:text-blue-200 flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View "{account.attachedFile.filename}"
                      </button>
                    ) : (
                      "No file attached"
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 