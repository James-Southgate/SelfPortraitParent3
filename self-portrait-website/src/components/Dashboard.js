// src/components/Dashboard.js
import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import { getTasks, getAllOrders, createTask } from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';
import '../fonts.css';

function Dashboard() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('daily'); // 'daily' | 'weekly' | 'monthly'

  // For pagination of orders
  const [ordersPageIndex, setOrdersPageIndex] = useState(0);
  const ordersPerPage = 50;

  // This helps us avoid creating duplicate tasks for the same order multiple times in a single browser session.
  const createdFollowUpsRef = useRef(new Set());

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskOrderId, setNewTaskOrderId] = useState('');
  const [newTaskType, setNewTaskType] = useState('Kit Arrival Chaser'); // default selection
  const [customTaskType, setCustomTaskType] = useState('');

  // ---------------------------------------------
  // 1) Check orders for "Kit Dispatched" older than 3 days
  //    + Check "Kit Received" older than 30 days
  // ---------------------------------------------
  async function checkForOldDispatchesAndCreateTasks(fetchedOrders) {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    for (const order of fetchedOrders) {
      // 3-day check
      if (order.status !== 'Kit Received') {
        const kda = order.kit_dispatched_at;
        if (kda && kda !== 'Kit not dispatched yet') {
          const dispatchedMs = Date.parse(kda);
          if (!isNaN(dispatchedMs) && now - dispatchedMs > threeDaysMs) {
            if (!createdFollowUpsRef.current.has(order.id)) {
              createdFollowUpsRef.current.add(order.id);
              const description = `Follow up with ${order.school_name} (Order #${order.id}) — Call ${order.phone}`;
              try {
                await createTask({
                  description,
                  order_id: order.id,
                  task_type: 'kit_follow_up_call',
                });
                console.log(`Created a 3-day follow-up task for Order #${order.id}`);
              } catch (err) {
                console.error('Failed creating follow-up task:', err);
              }
            }
          }
        }
      }

      // 30-day check
      if (
        order.status === 'Kit Received' &&
        order.kit_received_at &&
        order.kit_received_at !== 'Kit not received yet'
      ) {
        const receivedMs = Date.parse(order.kit_received_at);
        if (!isNaN(receivedMs) && now - receivedMs > thirtyDaysMs) {
          const followUpKey = `30day_${order.id}`;
          if (!createdFollowUpsRef.current.has(followUpKey)) {
            createdFollowUpsRef.current.add(followUpKey);
            const description = `Follow up with ${order.school_name} (Order #${order.id}) — Remind them to complete & return the kit.`;
            try {
              await createTask({
                description,
                order_id: order.id,
                task_type: 'kit_completion_follow_up',
              });
              console.log(`Created a 30-day follow-up for Order #${order.id}`);
            } catch (err) {
              console.error('Failed creating 30-day follow-up task:', err);
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------
  // 2) Fetch all tasks & orders, create follow-up tasks if needed, then re-fetch tasks
  // ---------------------------------------------
  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [fetchedTasks, fetchedOrders] = await Promise.all([
        getTasks(),
        getAllOrders(),
      ]);
      await checkForOldDispatchesAndCreateTasks(fetchedOrders);
      const updatedTasks = await getTasks();
      setTasks(updatedTasks);
      setOrders(fetchedOrders);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }

  // ---------------------------------------------
  // 3) Group orders by day for the last 20 days
  // ---------------------------------------------
  function computeDailyChartData(orders) {
    const result = [];
    const now = new Date();
    // Initialize counts for last 20 days
    for (let i = 20; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateString = date.toISOString().slice(0, 10); // YYYY-MM-DD format
      result.push({ date: dateString, count: 0 });
    }
    // Count orders per day
    orders.forEach(order => {
      if (!order.created_at) return;
      const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
      const entry = result.find(r => r.date === orderDate);
      if (entry) {
        entry.count += 1;
      }
    });
    return result;
  }

  /**
     * computeWeeklyChartData: returns an array of 20 data points,
     * each representing one week going back from today.
     *
     * The returned array has shape:
     * [ { date: 'YYYY-[W]WW', count: <number> }, ..., ]
     *
     * Explanation:
     *   - We figure out the “ISO year-week number” for each order’s created_at date.
     *   - We produce up to 20 data points (from now going 20 weeks back),
     *     labeling them by 'YYYY-[W]WW' (e.g. "2023-W41").
     */
    function computeWeeklyChartData(orders) {
      const resultMap = new Map();
      // Key: "YYYY-W##", Value: count of how many orders in that week

      // We'll define the last 20 "week labels"
      // and initialize them in the map with count = 0
      // Then fill them in from actual order data.
      const now = new Date();

      for (let i = 0; i < 20; i++) {
        // Find the date for "now - i weeks"
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);

        const { isoYear, isoWeek } = getIsoYearWeek(d);

        // Make a label like "2023-W05"
        const label = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;

        // If not present, init the map at zero
        if (!resultMap.has(label)) {
          resultMap.set(label, 0);
        }
      }

      // Now loop through all orders, figure out which week each belongs to,
      // and increment the matching week’s count if it's in our last-20-weeks range.
      orders.forEach(order => {
        if (!order.created_at) return;
        const createdDate = new Date(order.created_at);
        const { isoYear, isoWeek } = getIsoYearWeek(createdDate);
        const label = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
        if (resultMap.has(label)) {
          resultMap.set(label, resultMap.get(label) + 1);
        }
      });

      // Convert the map into an array sorted from oldest to newest
      // Because we inserted "this week" first, you might want to sort by time ascending
      // Or do the reverse if you want the most recent on the right side of the chart
      const resultArray = Array.from(resultMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return resultArray;
    }

    /**
     * computeMonthlyChartData: returns an array of 20 data points,
     * each representing one month going back from this month.
     *
     * The returned array has shape:
     * [ { date: 'YYYY-MM', count: <number> }, ..., ]
     */
    function computeMonthlyChartData(orders) {
      const resultMap = new Map(); // Key: "YYYY-MM", Value: count

      const now = new Date();

      for (let i = 0; i < 20; i++) {
        // Make a copy
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        // Move back i months
        d.setMonth(d.getMonth() - i);

        // Format label as "YYYY-MM"
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!resultMap.has(label)) {
          resultMap.set(label, 0);
        }
      }

      // Now go through orders
      orders.forEach(order => {
        if (!order.created_at) return;
        const createdDate = new Date(order.created_at);
        const monthLabel = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        if (resultMap.has(monthLabel)) {
          resultMap.set(monthLabel, resultMap.get(monthLabel) + 1);
        }
      });

      // Convert map -> array, sort ascending
      const resultArray = Array.from(resultMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return resultArray;
    }

    /**
     * getIsoYearWeek(date) -> { isoYear, isoWeek }
     *
     * This calculates ISO-8601 week number + year.
     * For example: 2023-W41 means “the 41st ISO week of 2023”.
     */
    function getIsoYearWeek(dateObj) {
      // Clone the date so we don’t mutate the original
      const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));

      // Move to Thursday in current week:
      // (This shifts so that week 1 always has January 4th in it)
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);

      // isoYear is now the year of the date we’ve ended up with
      const isoYear = d.getUTCFullYear();

      // Week is the week of the year
      const jan1 = new Date(Date.UTC(isoYear, 0, 1));
      const weekNo = Math.ceil(((d - jan1) / 86400000 + 1) / 7);

      return { isoYear, isoWeek: weekNo };
    }


  // ---------------------------------------------
  // 4) Compute chart data based on selected time range
  // ---------------------------------------------
    let chartData = [];
    if (timeRange === 'daily') {
      chartData = computeDailyChartData(orders);
    } else if (timeRange === 'weekly') {
      chartData = computeWeeklyChartData(orders);
    } else if (timeRange === 'monthly') {
      chartData = computeMonthlyChartData(orders);
    }


  // ---------------------------------------------
  // 5) useEffect: load data once on mount, then again every hour
  // ---------------------------------------------
  useEffect(() => {
    fetchDashboardData();
    const oneHour = 60 * 60 * 1000;
    const intervalId = setInterval(fetchDashboardData, oneHour);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, []);

  // ---------------------------------------------
  // 6) Functions for PDF downloads
  // ---------------------------------------------
  const handleDownloadPackingSlip = (orderId) => {
    fetch(`/api/orders/${orderId}/packing-slip`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not OK');
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `packing_slip_order_${orderId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error downloading PDF:', error);
      });
  };

  const handleDownloadNextSteps = (orderId) => {
    fetch(`/api/orders/${orderId}/next-steps`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not OK');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `next_steps_order_${orderId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(console.error);
  };

  const handleDownloadChecklist = (orderId) => {
    fetch(`/api/orders/${orderId}/checklist`)
      .then((response) => {
        if (!response.ok) throw new Error('Network response was not OK');
        return response.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `checklist_order_${orderId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch((error) => console.error('Error downloading PDF:', error));
  };

  const handleDownloadFinalPackageChecklist = (orderId) => {
    fetch(`/api/orders/${orderId}/final-package-checklist`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to download final package checklist');
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `final_package_checklist_order_${orderId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error downloading final package checklist:', error);
      });
  };

  // ---------------------------------------------
  // 7) Loading indicator
  // ---------------------------------------------
  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  // ---------------------------------------------
  // 8) Sort orders by created_at (descending)
  // ---------------------------------------------
  const sortedOrders = [...orders]
    .filter(order => order.status !== 'Closed')  // Filter out closed orders
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // ---------------------------------------------
  // 9) Helpers for pagination of orders
  // ---------------------------------------------
  const startIndex = ordersPageIndex * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentPageOrders = sortedOrders.slice(startIndex, endIndex);

  const hasNextPage = endIndex < sortedOrders.length;

  const handleNextPage = () => {
    if (hasNextPage) {
      setOrdersPageIndex(ordersPageIndex + 1);
    }
  };

  // After the existing handleNextPage function:
  const handlePrevPage = () => {
    if (ordersPageIndex > 0) {
      setOrdersPageIndex(ordersPageIndex - 1);
    }
  };


  async function handleDownloadInvoice(invoiceId) {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download invoice.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Could not download invoice.');
    }
  }

  async function deleteTask(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      // Remove the deleted task from state to update UI
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error(error);
      alert('Error deleting task');
    }
  }

    async function handleCreateTask(e) {
      e.preventDefault();

      if (!newTaskOrderId) {
        alert("Order ID is required.");
        return;
      }

      // Build task data object based on input values
      const taskData = {
        description: newTaskDescription || undefined,
        due_date: newTaskDueDate || undefined,
        order_id: parseInt(newTaskOrderId, 10), // Now required
        task_type: newTaskType === 'custom' ? customTaskType.trim() : newTaskType,
      };

      try {
        const created = await createTask(taskData);
        // After successful creation, refresh tasks or add to local state
        setTasks(prevTasks => [...prevTasks, { ...taskData, id: created.task_id }]);
        // Reset form fields
        setNewTaskDescription('');
        setNewTaskDueDate('');
        setNewTaskOrderId('');
        setNewTaskType('Kit Arrival Chaser');
        setCustomTaskType('');
        setShowCreateTask(false);
      } catch (error) {
        console.error("Error creating task:", error);
        alert("Failed to create task");
      }
    }


  // ---------------------------------------------
  // 10) Render
  // ---------------------------------------------
  return (
    <div className="dashboard-container">
      {/* Title / Header */}
      <h3 className="dashboard-title">Home / Dashboard Overview</h3>

      {/* Row with Graph Card + 2×2 Metrics Grid */}
      <div className="top-row-wrapper">
        {/* Graph Card */}
        <div className="graph-card card">
          <div className="graph-card-header card-header">
            <h2 className="graph-card-header-title card-header-title">Orders Over Time</h2>
            <div className="time-range-dropdown">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="daily">Last 20 Days</option>
                <option value="weekly">Last 20 Weeks</option>
                <option value="monthly">Last 20 Months</option>
              </select>
            </div>
          </div>
          <div className="graph-card-body card-body">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2×2 Metrics Grid */}
        <div className="metrics-grid">
          <div className="metrics-grid-card1 grid-card card">
            <div className="metrics-grid-card1-title card-header-title">Open Orders</div>
            <div className="stat-value">{sortedOrders.length}</div>
          </div>
          <div className="metrics-grid-card2 grid-card card">
            <div className="metrics-grid-card2-title card-header-title">Tasks</div>
            <div className="stat-value">{tasks.length}</div>
          </div>
        </div>
      </div>

      {/* Full-width Tasks Table */}
      <div className="tasks-table-wrapper card">
        <div className="tasks-table-header card-header">
          <h2 className="tasks-table-header-title card-header-title">Today’s Tasks</h2>
          <button className="create-new-task-button" onClick={() => setShowCreateTask(prev => !prev)}>
            Create Task
          </button>
        </div>
        {/* Modal for Create Task Form */}
        {showCreateTask && (
          <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}  // Prevent closing when clicking inside modal
            >
              <button className="modal-close" onClick={() => setShowCreateTask(false)}>
                &times;
              </button>
              <h2>Create New Task</h2>
              <form onSubmit={handleCreateTask} style={{ marginTop: '1rem' }}>
                <div>
                  <label>
                    Description:
                    <input
                      type="text"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Due Date:
                    <input
                      type="datetime-local"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Order ID*:
                    <select
                      value={newTaskOrderId}
                      onChange={(e) => setNewTaskOrderId(e.target.value)}
                      required
                    >
                      <option value="">Select an Order ID</option>
                      {orders.map(order => (
                        <option key={order.id} value={order.id}>
                          Order #{order.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <label>
                    Task Type*:
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value)}
                    >
                      <option value="Kit Arrival Chaser">Kit Arrival Chaser</option>
                      <option value="Kit Completion Chaser">Kit Completion Chaser</option>
                      <option value="Invoice Chaser">Invoice Chaser</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>
                {newTaskType === 'custom' && (
                  <div>
                    <label>
                      Custom Task Type (max 100 chars):
                      <input
                        type="text"
                        value={customTaskType}
                        onChange={(e) => setCustomTaskType(e.target.value.slice(0, 100))}
                        required
                      />
                    </label>
                  </div>
                )}
                <div style={{ marginTop: '1rem' }}>
                  <button type="submit">Submit Task</button>
                  <button type="button" onClick={() => setShowCreateTask(false)} style={{ marginLeft: '1rem' }}>
                    Cancel
                  </button>
                </div>
                <p className="required-field-msg">* indicates required field</p>
              </form>
            </div>
          </div>
        )}
        <div className="tasks-table-body card-body">
          {tasks.length === 0 ? (
            <p>No tasks for today.</p>
          ) : (
            <table className="fullwidth-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Task Type</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th>Associated Order ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{task.task_type}</td>
                    <td>{task.description}</td>
                    <td>{task.due_date ? new Date(task.due_date).toLocaleString() : 'N/A'}</td>
                    <td>{task.order_id}</td>
                    <td>
                      <button onClick={() => deleteTask(task.id)} className="task-delete-button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-wrapper card">
        <div className="orders-table-header card-header">
          <h2 className="orders-table-header-title card-header-title">Recent Orders</h2>
          <button onClick={() => navigate("/orders")} className="view-all-button">View All Orders</button>
        </div>
        <div className="orders-table-body card-body">
          {currentPageOrders.length === 0 ? (
            <p>No orders available.</p>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order&nbsp;ID</th>
                  <th>Reason</th>
                  <th>Product</th>
                  <th>First&nbsp;Name</th>
                  <th>Last&nbsp;Name</th>
                  <th>School&nbsp;Name</th>
                  <th>Art&nbsp;Packs</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created&nbsp;At</th>
                  <th>Delivery&nbsp;Slip</th>
                  <th>Next&nbsp;Steps</th>
                  <th>Kit Checklist</th>
                  <th>Final Package Checklist</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {currentPageOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/process-slider/${order.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{order.id}</td>
                    <td>{order.reason}</td>
                    <td>{order.product}</td>
                    <td>{order.first_name}</td>
                    <td>{order.last_name}</td>
                    <td>{order.school_name}</td>
                    <td>{order.art_packs}</td>
                    <td>{order.email}</td>
                    <td>{order.phone}</td>
                    <td>
                      <span
                        className={
                          order.status === 'In Production'
                            ? 'status-badge status-badge-blue'
                            : order.status === 'Requested'
                            ? 'status-badge status-badge-yellow'
                            : 'status-badge'
                        }
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td>
                      <button
                        className="order-download-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPackingSlip(order.id);
                        }}
                      >
                        Download Slip
                      </button>
                    </td>
                    <td>
                      <button
                        className="order-download-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadNextSteps(order.id);
                        }}
                      >
                        Download Next Steps
                      </button>
                    </td>
                    <td>
                      <button
                        className="order-download-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadChecklist(order.id);
                        }}
                      >
                        Download Checklist
                      </button>
                    </td>
                    <td>
                      {order.quantities !== 'Unconfirmed' && order.quantities ? (
                        <button
                          className="order-download-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFinalPackageChecklist(order.id);
                          }}
                        >
                          Download Final Package Checklist
                        </button>
                      ) : (
                        <span style={{ color: 'grey' }}>
                          Quantities needed for download
                        </span>
                      )}
                    </td>
                    <td>
                      {order.invoice ? (
                        order.invoice.status === 'Generated' ? (
                          <button
                            className="order-download-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadInvoice(order.invoice.id);
                            }}
                          >
                            Download Invoice
                          </button>
                        ) : (
                          <span>{order.invoice.status}</span>
                        )
                      ) : (
                        <span>No Invoice</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
                  {(ordersPageIndex > 0 || hasNextPage) && (
            <div className="pagination-controls">
              {ordersPageIndex > 0 && (
                <button onClick={handlePrevPage}>Previous 50</button>
              )}
              {hasNextPage && (
                <button onClick={handleNextPage}>Next 50</button>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

export default Dashboard;
