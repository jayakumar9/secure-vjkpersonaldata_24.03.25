import axios from 'axios';

const API_URL = '/api/files';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getFiles = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const downloadFile = async (fileId) => {
  try {
    const response = await axios.get(`${API_URL}/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteFile = async (fileId) => {
  try {
    const response = await axios.delete(`${API_URL}/${fileId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const viewFile = (fileId) => {
  return `${API_URL}/download/${fileId}`;
}; 