import axios from 'axios';

// Remove the explicit port and use relative path
const API_URL = '/api';

export async function getTasks() {
  const response = await axios.get(`${API_URL}/tasks`);
  return response.data;
}

export async function getAllOrders() {
  const response = await axios.get(`${API_URL}/orders`);
  return response.data;
}


// Example: GET orders for a specific school
export async function getSchoolOrders(schoolId) {
  // This may vary; you might pass a token or parameter
  // For now, this is just a placeholder
  const response = await axios.get(`${API_URL}/api/orders?school_id=${schoolId || ''}`);
  return response.data;
}

// Example: Confirm kit receipt
export async function confirmKitReceipt(orderId) {
  // Suppose the endpoint for updating order status is:
  // PATCH /orders/<order_id>/status
  // with JSON like {"status": "Kit Returned"}
  const response = await axios.patch(`${API_URL}/api/orders/${orderId}/status`, {
    status: 'Kit Returned',
  });
  return response.data;
}

// Submit a new order from the ContactForm
export async function submitOrder(formData) {
  try {
    const response = await axios.post(`${API_URL}/api/orders`, formData);
    return response.data;
  } catch (error) {
    console.error('Error submitting order:', error);
    throw error; // Let the caller handle the error
  }
}


// Example: Create a task
export async function createTask(taskData) {
  // taskData might look like { description: "Follow up w/ X", due_date: "..." }
  const response = await axios.post(`${API_URL}/api/tasks`, taskData);
  return response.data;
}

