// ArtworkUploadForm.js
import React, { useState } from 'react';
import axios from 'axios';

function ArtworkUploadForm({ orderId, onUploadComplete }) {
  // onUploadComplete is a callback we can call after success

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [feedback, setFeedback] = useState('');

  function handleFileChange(e) {
    setSelectedFiles(e.target.files);
  }

  async function handleUpload() {
    if (!selectedFiles || selectedFiles.length === 0) {
      setFeedback('No files selected.');
      return;
    }
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('images', selectedFiles[i]);
      }
      await axios.post(`/api/orders/${orderId}/artwork/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback('Images uploaded successfully!');
      // 1) If you want to simply re-fetch data from parent:
      if (onUploadComplete) {
        onUploadComplete();
      }
      // 2) Or if you want a full page reload (less recommended):
      // window.location.reload();
    } catch (err) {
      console.error(err);
      setFeedback('Error uploading images.');
    }
  }

  async function handleConfirmArtwork() {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: 'Approval Pending' });
      setFeedback('Order status moved to Approval Pending!');
      // Also re-fetch
      if (onUploadComplete) {
        onUploadComplete();
      }
      // Or do a full reload
      // window.location.reload();
    } catch (err) {
      console.error(err);
      setFeedback('Failed to update status.');
    }
  }

  return (
    <div style={{ margin: '10px 0' }}>
      <input type="file" multiple onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload Artwork Files</button>

      <button onClick={handleConfirmArtwork}>
        Confirm Artwork (Move to Approval Pending)
      </button>

      {feedback && <p>{feedback}</p>}
    </div>
  );
}

export default ArtworkUploadForm;
