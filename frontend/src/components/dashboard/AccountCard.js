{account.attachedFile && account.attachedFile.gridFSId && (
  <div className="mt-2">
    <button
      onClick={() => onViewFile(account.attachedFile)}
      className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-300 hover:text-blue-200"
    >
      <EyeIcon className="w-4 h-4 mr-1" />
      View "{account.attachedFile.filename}"
    </button>
  </div>
)} 