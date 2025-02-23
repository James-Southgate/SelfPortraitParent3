// ArtworkManagement.js
import React, { useEffect, useState } from 'react';
import './ArtworkMgmt.css'; // The new CSS file
import { getAllOrders } from '../services/api';
import ArtworkUploadForm from './ArtworkUploadForm';
import axios from 'axios';

function ArtworkManagement() {
  const [returnedOrders, setReturnedOrders] = useState([]);
  const [inArtworkOrders, setInArtworkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 1) A function to fetch all orders and update state
  async function fetchOrdersAndUpdate() {
    setLoading(true);
    try {
      const allOrders = await getAllOrders();
      const kitReturned = allOrders.filter((o) => o.status === 'Kit Returned');
      const inArtwork = allOrders.filter((o) => o.status === 'In Artwork');
      setReturnedOrders(kitReturned);
      setInArtworkOrders(inArtwork);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setErrorMsg('Failed to load orders.');
      setLoading(false);
    }
  }

  // 2) UseEffect on mount
  useEffect(() => {
    fetchOrdersAndUpdate();
  }, []);

  async function handleDeleteImage(orderId, filename) {
    try {
      await axios.delete(`/api/orders/${orderId}/artwork/delete`, {
        headers: { 'Content-Type': 'application/json' },
        data: { filename },
      });
      // Re-fetch to see updated list
      await fetchOrdersAndUpdate();
    } catch (error) {
      console.error('Error deleting image:', error);
      setErrorMsg('Failed to delete image.');
    }
  }

  if (loading) {
    return <p>Loading orders...</p>;
  }
  if (errorMsg) {
    return <p style={{ color: 'red' }}>{errorMsg}</p>;
  }

  return (
    <div className="artwork-management-container">
      <h1 className="artwork-management-title">Artwork Management</h1>
      <p className="artwork-management-note">
        Note: The images you upload here are only used to gather the school’s approval.
        Once the school confirms approval (moves to "In Production"),
        these images will be removed from the system automatically.
      </p>

      {/* Kit Returned section */}
      <div className="artwork-section">
        <h2 className="artwork-section-title">Orders Needing Artwork (Kit Returned)</h2>
        {returnedOrders.length === 0 ? (
          <p>No orders with status "Kit Returned".</p>
        ) : (
          <ul className="artwork-orders-list">
            {returnedOrders.map(order => (
              <li key={order.id} className="artwork-order-item">
                <div className="artwork-order-heading">
                  <strong>Order #{order.id}</strong> — {order.school_name}
                  &nbsp;(Status: {order.status})
                </div>
                {/* Additional details or actions can be added here if needed */}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* In Artwork section */}
      <div className="artwork-section">
        <h2 className="artwork-section-title">Orders Currently In Artwork</h2>
        {inArtworkOrders.length === 0 ? (
          <p>No orders with status "In Artwork".</p>
        ) : (
          <ul className="artwork-orders-list">
            {inArtworkOrders.map(order => {
              const artwork = order.artworks && order.artworks[0];
              let existingImages = [];
              if (artwork && artwork.design_file_path) {
                existingImages = artwork.design_file_path.split(',');
              }

              return (
                <li key={order.id} className="artwork-order-item">
                  <p className="artwork-order-heading">
                    <strong>Order #{order.id}</strong> — {order.school_name} (Status: {order.status})
                  </p>

                  {/* Existing Images */}
                  {existingImages.length > 0 ? (
                    <div className="artwork-files-container">
                      <h3 className="artwork-files-title">Existing Artwork Files</h3>
                      <div className="artwork-files-list">
                        {existingImages.map(filename => (
                          <div key={filename} className="artwork-file">
                            <p className="artwork-file-info">File: {filename}</p>
                            <img
                              src={`/static/artwork/${filename}`}
                              alt={filename}
                            />
                            <button
                              className="artwork-delete-button"
                              onClick={() => handleDeleteImage(order.id, filename)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p>No images uploaded yet.</p>
                  )}

                  {/* Artwork Upload Section */}
                  <div className="artwork-upload-section">
                    <ArtworkUploadForm
                      orderId={order.id}
                      onUploadComplete={fetchOrdersAndUpdate}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ArtworkManagement;
