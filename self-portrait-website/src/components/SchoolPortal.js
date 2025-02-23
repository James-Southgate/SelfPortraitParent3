// src/components/SchoolPortal.js
import React, { useEffect, useState } from 'react';
import { getSchoolOrders, confirmKitReceipt } from '../services/api';

function SchoolPortal() {
  const [orders, setOrders] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    // Suppose the school is identified by some ID or token
    // For demonstration, we just fetch "all" or "demo" orders
    getSchoolOrders()
      .then((data) => setOrders(data))
      .catch((error) => console.error('Error fetching orders:', error));
  }, []);

  const handleConfirmReceipt = async (orderId) => {
    try {
      await confirmKitReceipt(orderId);
      setFeedbackMessage(`Kit for Order ${orderId} confirmed as received!`);
      // Optionally, re-fetch the orders or update local state
    } catch (error) {
      console.error('Error confirming receipt:', error);
    }
  };

  return (
    <div>
      <h1>School Portal</h1>
      <p>Welcome to the School Portal. Manage your Self-Portrait kit here.</p>

      {feedbackMessage && <p style={{ color: 'green' }}>{feedbackMessage}</p>}

      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            <strong>Order #{order.id}</strong> - Status: {order.status}{' '}
            {order.status === 'Kit Dispatched' && (
              <button onClick={() => handleConfirmReceipt(order.id)}>
                Confirm Kit Received
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SchoolPortal;
