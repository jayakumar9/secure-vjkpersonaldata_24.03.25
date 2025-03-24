import React, { useState, useEffect } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import FilePreview from './FilePreview';

const Dashboard = () => {
  // ... existing code ...

  return (
    <div>
      {/* ... existing code ... */}
      {accounts.map((account) => (
        <div key={account._id} className="bg-white shadow rounded-lg p-4 mb-4">
          {/* ... existing account info ... */}
          {account.attachedFile && account.attachedFile.gridFSId && (
            <div className="mt-2">
              <FilePreview 
                file={account.attachedFile}
                onError={(error) => showNotification(error.message, 'error')}
              />
            </div>
          )}
        </div>
      ))}
      {/* ... existing code ... */}
    </div>
  );
};

export default Dashboard; 