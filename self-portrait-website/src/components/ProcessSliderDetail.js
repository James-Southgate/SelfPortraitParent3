// src/components/ProcessSliderDetail.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllOrders } from '../services/api';
import './ProcessSlider.css';
import './ProcessSliderDetail.css';  // Import styles


/**
 * PATCH the main "order" status:
 * /api/orders/:orderId/status
 */
async function patchOrderStatus(orderId, newStatus) {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update order status to "${newStatus}"`);
  }
  return response.json();
}


/**
 * PATCH the "invoice" status:
 * /api/invoices/:invoiceId/status
 */
async function patchInvoiceStatus(invoiceId, newInvoiceStatus) {
  const response = await fetch(`/api/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newInvoiceStatus }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update invoice status to "${newInvoiceStatus}"`);
  }
  return response.json();
}

// Helper to get button label based on invoice status
function getInvoiceButtonLabel(status) {
  switch (status) {
    case 'Ungenerated':
      return 'Generate Invoice';
    case 'Generated':
      return 'Confirm Send Invoice';
    case 'Invoice Sent':
      return 'Confirm Invoice Paid';
    case 'Invoice Paid':
      return 'Confirmed'; // or any message indicating completion
    default:
      return `Confirm ${status}`;
  }
}

function ProcessSliderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState('');
  const [invoiceFeedback, setInvoiceFeedback] = useState('');

  const steps = [
    'Requested',
    'Kit Prepared',
    'Kit Dispatched',
    'Kit Received',
    'Kit Returned',
    'In Artwork',
    'Approval Pending',
    'In Production',
    'Ready to Dispatch',
    'Final Package Dispatched',
    'Final Package Received',
    'Closed',
  ];

  const invoiceSteps = [
    'Ungenerated',
    'Generated',
    'Invoice Sent',
    'Invoice Paid',
  ];

  useEffect(() => {
    setLoading(true);
    getAllOrders()
      .then((data) => {
        const found = data.find((o) => o.id === parseInt(orderId, 10));
        setOrder(found || null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching orders:', error);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return <p>Loading order {orderId} ...</p>;
  }
  if (!order) {
    return <p>No order found for ID: {orderId}</p>;
  }

  const currentStepIndex = steps.findIndex((step) => step === order.status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  async function handleConfirmNext() {
    if (activeIndex === steps.length - 1) {
      setFeedback("Order is already at the last step: 'Closed'.");
      return;
    }
    const nextStatus = steps[activeIndex + 1];

    try {
      await patchOrderStatus(order.id, nextStatus);
      setOrder({ ...order, status: nextStatus });
      setFeedback(`Order status updated to "${nextStatus}".`);
    } catch (err) {
      console.error(err);
      setFeedback(err.message);  // This will now display our custom message
    }
  }

  async function handleUndo() {
    if (activeIndex <= 0) {
      setFeedback("Order is already at the first step: 'Requested'.");
      return;
    }
    const prevStatus = steps[activeIndex - 1];

    try {
      await patchOrderStatus(order.id, prevStatus);
      setOrder({ ...order, status: prevStatus });
      setFeedback(`Status reverted to "${prevStatus}".`);
    } catch (err) {
      console.error(err);
      setFeedback(`Failed to revert status to "${prevStatus}".`);
    }
  }

  const currentStatus = order.status;
  const indexOfCurrentStatus = steps.indexOf(currentStatus);
  const nextOrderStatus =
    indexOfCurrentStatus !== -1 && indexOfCurrentStatus < steps.length - 1
      ? steps[indexOfCurrentStatus + 1]
      : null;
  const confirmLabel = nextOrderStatus ? `Confirm ${nextOrderStatus}` : '';

  const invoice = order.invoice;
  let invoiceStatus = invoice?.status || 'Ungenerated';
  const invoiceIndex = invoiceSteps.findIndex((s) => s === invoiceStatus);
  const invoiceActiveIndex = invoiceIndex >= 0 ? invoiceIndex : 0;

  async function handleInvoiceConfirmNext() {
    if (!invoice) {
      setInvoiceFeedback('No invoice found for this order.');
      return;
    }
    if (invoiceActiveIndex === invoiceSteps.length - 1) {
      setInvoiceFeedback('Invoice is already at the last step: "Invoice Paid".');
      return;
    }
    const nextInvoiceStatus = invoiceSteps[invoiceActiveIndex + 1];

    try {
      await patchInvoiceStatus(invoice.id, nextInvoiceStatus);
      const updatedInvoice = {
        ...invoice,
        status: nextInvoiceStatus,
      };
      setOrder({
        ...order,
        invoice: updatedInvoice,
      });
      setInvoiceFeedback(`Invoice status updated to "${nextInvoiceStatus}".`);
    } catch (err) {
      console.error(err);
      setInvoiceFeedback(`Failed to update invoice status to "${nextInvoiceStatus}".`);
    }
  }

  async function handleInvoiceUndo() {
    if (!invoice) {
      setInvoiceFeedback('No invoice found for this order.');
      return;
    }
    if (invoiceActiveIndex <= 0) {
      setInvoiceFeedback('Invoice is already at the first step: "Ungenerated".');
      return;
    }
    const prevInvoiceStatus = invoiceSteps[invoiceActiveIndex - 1];

    try {
      await patchInvoiceStatus(invoice.id, prevInvoiceStatus);
      const updatedInvoice = {
        ...invoice,
        status: prevInvoiceStatus,
      };
      setOrder({
        ...order,
        invoice: updatedInvoice,
      });
      setInvoiceFeedback(`Invoice status reverted to "${prevInvoiceStatus}".`);
    } catch (err) {
      console.error(err);
      setInvoiceFeedback(`Failed to revert invoice status to "${prevInvoiceStatus}".`);
    }
  }

  async function handleDownloadInvoice() {
    if (!invoice) return;
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download invoice.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Could not download invoice.');
    }
  }

  return (
    <div className="process-detail-container">
  <button onClick={() => navigate(-1)}>Back to Process List</button>

  <h1>Order #{order.id} - Process Flow</h1>

  <section className="order-info">
    <p><strong>School:</strong> {order.school_name}</p>
    <p><strong>Status:</strong> {order.status}</p>
    {feedback && <p style={{ color: 'blue', margin: '10px 0' }}>{feedback}</p>}
  </section>

  <ul className="slider-steps">
    {steps.map((step, index) => (
      <li
        key={step}
        className={`slider-step ${index <= activeIndex ? 'active' : ''}`}
      >
        <div className="slider-step-circle">{index + 1}</div>
        <div className="slider-step-label">{step}</div>
      </li>
    ))}
  </ul>

  <div className="action-buttons">
    <button
      onClick={handleConfirmNext}
      disabled={activeIndex === steps.length - 1}
    >
      {confirmLabel}
    </button>
    <button onClick={handleUndo} disabled={activeIndex === 0}>
      Undo Latest Process Status Update
    </button>
  </div>

  <hr />

  <h2>Invoice Process Flow</h2>

  {!invoice ? (
    <p>No invoice found for this order.</p>
  ) : (
    <>
      <p>Invoice ID: {invoice.id}</p>
      <p>Invoice Status: {invoiceStatus}</p>

      {invoiceStatus === 'Ungenerated' ? (
        <p>Invoice not generated yet.</p>
      ) : (
        <button onClick={handleDownloadInvoice}>Download Invoice</button>
      )}

      {invoiceFeedback && (
        <p style={{ color: 'blue', margin: '10px 0' }}>{invoiceFeedback}</p>
      )}

      <ul className="slider-steps" style={{ marginTop: '1rem' }}>
        {invoiceSteps.map((invStep, i) => (
          <li
            key={invStep}
            className={`slider-step ${i <= invoiceActiveIndex ? 'active' : ''}`}
          >
            <div className="slider-step-circle">{i + 1}</div>
            <div className="slider-step-label">{invStep}</div>
          </li>
        ))}
      </ul>

      <div className="action-buttons">
        {invoiceStatus !== 'Invoice Paid' && (
          <button
            onClick={handleInvoiceConfirmNext}
            disabled={invoiceActiveIndex === invoiceSteps.length - 1}
          >
            {getInvoiceButtonLabel(invoiceStatus)}
          </button>
        )}
        <button
          onClick={handleInvoiceUndo}
          disabled={invoiceActiveIndex === 0}
          style={{ marginLeft: '1rem' }}
        >
          Undo Latest Invoice Update
        </button>
      </div>
    </>
  )}
</div>

  );
}

export default ProcessSliderDetail;
