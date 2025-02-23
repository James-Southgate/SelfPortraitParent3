// ProcessSlider.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders } from '../services/api';
import './ProcessSlider.css';  // Import the CSS for this page

function ProcessSlider() {
  const [orders, setOrders] = useState([]);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    getAllOrders()
      .then((data) => setOrders(data))
      .catch((error) => console.error('Error fetching orders:', error));
  }, []);

  const openOrders = orders.filter(order => order.status !== 'Closed');
  const closedOrders = orders.filter(order => order.status === 'Closed');

  return (
    <div className="slider-container">
      <h1 className="page-title">Process Slider Overview</h1>
      <p>Select an order to view its process flow.</p>

      <section className="orders-section">
        <h2 className="section-title">Open Orders</h2>
        {openOrders.length === 0 ? (
          <p>No open orders!</p>
        ) : (
          <ul className="orders-list">
            {openOrders.map(order => (
              <li key={order.id} className="order-item">
                <Link to={`/process-slider/${order.id}`} className="order-link">
                  Order #{order.id} - Status: {order.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        className="toggle-button"
        onClick={() => setShowClosed(prev => !prev)}>
        {showClosed ? 'Collapse Closed Order Processes' : 'Show Closed Order Processes'}
      </button>

      {showClosed && (
        <section className="orders-section closed-orders">
          <h2 className="section-title">Closed Orders</h2>
          {closedOrders.length === 0 ? (
            <p>No closed orders!</p>
          ) : (
            <ul className="orders-list">
              {closedOrders.map(order => (
                <li key={order.id} className="order-item">
                  <Link to={`/process-slider/${order.id}`} className="order-link">
                    Order #{order.id} - Status: {order.status}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default ProcessSlider;
