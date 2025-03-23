import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const DatabaseStatus = () => {
  const [status, setStatus] = useState({
    loading: true,
    error: null,
    data: null
  });

  const checkHealth = useCallback(async () => {
    try {
      console.log('[Health Check] Requesting status...');
      const response = await axios.get('/api/health', {
        // Add timeout to prevent hanging requests
        timeout: 5000,
        // Ensure we're getting fresh data
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('[Health Check] Response:', response.data);

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format');
      }

      // Validate required fields
      const { database, gridfs } = response.data;
      if (!database || !gridfs) {
        throw new Error('Missing required status fields');
      }

      setStatus({
        loading: false,
        error: null,
        data: response.data
      });
    } catch (error) {
      console.error('[Health Check] Error:', error);
      if (error.response) {
        console.error('[Health Check] Response:', error.response.data);
      }
      
      setStatus({
        loading: false,
        error: error.response?.data || { message: error.message },
        data: null
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let intervalId = null;

    const performHealthCheck = async () => {
      if (!mounted) return;
      await checkHealth();
    };

    // Initial check
    performHealthCheck();

    // Set up interval for subsequent checks
    intervalId = setInterval(performHealthCheck, 30000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkHealth]);

  if (status.loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span>Checking system status...</span>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg z-50">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>System Error: {status.error.message || 'Unknown error'}</span>
        </div>
      </div>
    );
  }

  // Safely access status data with defaults
  const { database = {}, gridfs = {} } = status.data || {};
  
  // Consider system healthy if database is connected and GridFS is either initialized or initializing
  const isHealthy = database.status === 'connected' && 
                   (gridfs.status === 'initialized' || gridfs.status === 'initializing');

  // Determine status color based on state
  let statusColor = 'bg-yellow-800'; // Default color for degraded
  if (isHealthy) {
    statusColor = gridfs.status === 'initialized' ? 'bg-green-800' : 'bg-blue-800';
  }

  return (
    <div className={`fixed bottom-4 right-4 ${statusColor} text-white p-4 rounded-lg shadow-lg z-50`}>
      <div className="flex items-center space-x-2">
        {isHealthy ? (
          gridfs.status === 'initialized' ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          )
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <div>
          <div className="font-semibold">
            System Status: {isHealthy ? (gridfs.status === 'initialized' ? 'Healthy' : 'Initializing') : 'Degraded'}
          </div>
          <div className="text-xs">
            Database: {database.status || 'unknown'} | GridFS: {gridfs.status || 'unknown'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatus; 