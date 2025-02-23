// src/components/SchoolPortalActions.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// 1) GET all orders from the server, find the one with the matching ID
async function fetchOrderById(orderId) {
  const res = await fetch(`/api/orders`);
  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }
  const allOrders = await res.json();
  const found = allOrders.find((o) => o.id === Number(orderId));
  if (!found) {
    throw new Error('Order not found');
  }
  return found;
}

// 2) PATCH to update the order status
async function patchOrderStatus(orderId, newStatus) {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Failed to update status');
  }
  return await response.json();
}

// PATCH to update order quantities
async function patchOrderQuantities(orderId, quantities) {
  const response = await fetch(`/api/orders/${orderId}/quantities`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantities }),
  });
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Failed to update quantities');
  }
  return await response.json();
}

function SchoolPortalActions() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const [quantities, setQuantities] = useState({ ProductA: '', ProductB: '', ProductC: '' });
  const [quantitiesConfirmed, setQuantitiesConfirmed] = useState(false);

  // Fetch the order on mount (and whenever orderId changes)
  useEffect(() => {
    fetchOrderById(orderId)
      .then((data) => {
        console.log("Fetched order data:", JSON.stringify(data, null, 2));
        setOrder(data);
        if (data.quantities && data.quantities !== "Unconfirmed") {
          setQuantities(data.quantities);
          setQuantitiesConfirmed(true);
        }
      })
      .catch((err) => setErrorMsg(err.message));
  }, [orderId]);



  // --- Loading/error states ---
  if (errorMsg) {
    return <p style={{ color: 'red' }}>{errorMsg}</p>;
  }
  if (!order) {
    return <p>Loading Order #{orderId} ...</p>;
  }

  // A helper to figure out if we can confirm kit receipt
  const canConfirmReceipt = order.status === 'Kit Dispatched';

  async function handleConfirmReceipt() {
    try {
      await patchOrderStatus(order.id, 'Kit Received');
      setOrder({ ...order, status: 'Kit Received' });
      setInfoMsg('Kit successfully marked as Received!');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  let images = [];
  if (order.artworks && order.artworks.length > 0) {
    const artwork = order.artworks[0];
    if (artwork.design_file_path) {
      images = artwork.design_file_path.split(',');
    }
  }

  async function handleConfirmApproval() {
    try {
      await patchOrderStatus(order.id, 'In Production');
      setOrder({ ...order, status: 'In Production' });
      setInfoMsg('Artwork approved! Your order is now In Production.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // Handlers for quantities input changes
  function handleQuantityChange(product, value) {
    setQuantities(prev => ({ ...prev, [product]: value }));
  }

  async function handleConfirmQuantities() {
    try {
      // Convert input values to numbers if needed
      const parsedQuantities = {
        ProductA: Number(quantities.ProductA) || 0,
        ProductB: Number(quantities.ProductB) || 0,
        ProductC: Number(quantities.ProductC) || 0,
      };
      await patchOrderQuantities(order.id, parsedQuantities);
      setOrder(prev => ({ ...prev, quantities: parsedQuantities }));
      setQuantities(parsedQuantities);
      setQuantitiesConfirmed(true);
      setInfoMsg('Quantities confirmed!');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  const disableQuantityEditingStatuses = [
    'In Production',
    'Ready to Dispatch',
    'Final Package Dispatched',
    'Final Package Received',
    'Closed'
  ];
  const disableQuantities = disableQuantityEditingStatuses.includes(order.status);

  // Debug logs for quantities section
  console.log("disableQuantities:", disableQuantities);
  console.log("order.quantities:", order.quantities);
  console.log("quantitiesConfirmed:", quantitiesConfirmed);
  console.log("quantities state:", quantities);
  console.log("order.status:", order.status);
  console.log("Current order state:", JSON.stringify(order, null, 2));

  return (
    <div>
      <h1>Welcome, {order.school_name}!</h1>
      <p>Current Status: {order.status}</p>

      {infoMsg && <p style={{ color: 'green' }}>{infoMsg}</p>}
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      {canConfirmReceipt && (
        <button onClick={handleConfirmReceipt}>
          Confirm Kit Received
        </button>
      )}

      {order.status === 'Approval Pending' && (
        <div style={{ marginTop: '20px' }}>
          <h2>Artwork Preview</h2>
          {images.length === 0 ? (
            <p>No artwork images available.</p>
          ) : (
            images.map((filename, idx) => (
              <div key={idx} style={{ margin: '5px 0' }}>
                <img
                  src={`/static/artwork/${filename}`}
                  alt={`Uploaded design file #${idx + 1}`}
                  style={{ maxWidth: '300px' }}
                />
              </div>
            ))
          )}

          <button onClick={handleConfirmApproval} style={{ marginTop: '10px' }}>
            Confirm Artwork Approval
          </button>
        </div>
      )}

      {order.status === 'In Production' && (
        <p>Your order is now in production. Thank you!</p>
      )}

      {/* Quantities Feature */}
      <hr />
      <h2>Quantities</h2>
      {disableQuantities ? (
        <>
          {order.quantities && order.quantities !== "Unconfirmed" ? (
            <>
              <p>Your selected Quantities:</p>
              <ul>
                <li>Product A: {order.quantities.ProductA}</li>
                <li>Product B: {order.quantities.ProductB}</li>
                <li>Product C: {order.quantities.ProductC}</li>
              </ul>
            </>
          ) : (
            <p>Quantities unconfirmed.</p>
          )}
          <p>Quantities are now unchangeable.</p>
        </>
      ) : (
        // Editable form for selecting quantities
        <>
          {!quantitiesConfirmed ? (
            <p>Quantities unconfirmed.</p>
          ) : (
            <>
              <p>Your selected Quantities:</p>
              <ul>
                <li>Product A: {quantities.ProductA}</li>
                <li>Product B: {quantities.ProductB}</li>
                <li>Product C: {quantities.ProductC}</li>
              </ul>
            </>
          )}
          <div>
            <label>
              Product A:
              <input
                type="number"
                value={quantities.ProductA}
                onChange={(e) => handleQuantityChange('ProductA', e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Product B:
              <input
                type="number"
                value={quantities.ProductB}
                onChange={(e) => handleQuantityChange('ProductB', e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Product C:
              <input
                type="number"
                value={quantities.ProductC}
                onChange={(e) => handleQuantityChange('ProductC', e.target.value)}
              />
            </label>
          </div>
          <button onClick={handleConfirmQuantities}>
            Confirm Quantities
          </button>
        </>
      )}
    </div>
  );
}

export default SchoolPortalActions;
