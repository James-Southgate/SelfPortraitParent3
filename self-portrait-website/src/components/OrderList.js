// src/components/OrderList.js
import React, { useEffect, useState } from 'react';
import { getAllOrders } from '../services/api';
import './OrderList.css';


/*
  A custom hook that helps sort an array of objects by a given key & order (ASC/DESC).
  If you want to allow numeric vs. string sorting, you can make it more sophisticated.
*/
function sortItems(items, sortKey, sortOrder) {
  const sorted = [...items].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];

    // Basic string comparison
    if (valA == null) return 1;
    if (valB == null) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      // Numeric comparison
      return valA - valB;
    } else {
      // String comparison
      return String(valA).localeCompare(String(valB));
    }
  });

  return sortOrder === 'asc' ? sorted : sorted.reverse();
}

function OrderList() {
  const [orders, setOrders] = useState([]);

  // For filtering
  const [filters, setFilters] = useState({
    id: '',
    reason: '',
    product: '',
    free_sample: '',
    first_name: '',
    last_name: '',
    school_name: '',
    position: '',
    art_packs: '',
    referral: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    county: '',
    postcode: '',
    status: '',
  });

  // For sorting
  const [sortKey, setSortKey] = useState('id');   // default sort by id
  const [sortOrder, setSortOrder] = useState('asc'); // or 'desc'

  // For pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; // show 100 per page

  useEffect(() => {
    getAllOrders()
      .then((data) => {
        setOrders(data);
      })
      .catch((error) => console.error('Error fetching orders:', error));
  }, []);

  // Apply all filters to the "orders" array
  const filteredOrders = orders.filter((order) => {
    // For each field in `filters`, if the user typed something,
    // we require the order's field to contain that substring (case-insensitive).
    // You can make the filter logic more precise as needed.

    // We'll loop over each filter key:
    for (const key of Object.keys(filters)) {
      const filterValue = filters[key].trim().toLowerCase();
      if (!filterValue) continue; // Skip empty filters

      // The corresponding order value
      const orderValue = order[key];
      const orderValueStr = orderValue == null ? '' : String(orderValue).toLowerCase();

      if (!orderValueStr.includes(filterValue)) {
        // If any filter doesn't match, exclude this order
        return false;
      }
    }
    // If we get through all filters with no mismatch, include this order
    return true;
  });

  // Now apply sorting to the filtered data
  const sortedFilteredOrders = sortItems(filteredOrders, sortKey, sortOrder);

  // PAGINATION: slice the sorted+filtered data
  const indexOfLast = currentPage * pageSize;
  const indexOfFirst = indexOfLast - pageSize;
  const currentOrders = sortedFilteredOrders.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(sortedFilteredOrders.length / pageSize);

  // Handlers for sorting
  const handleSort = (key) => {
    if (sortKey === key) {
      // If clicking the same column, toggle the order
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // If new column, default to ascending
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Handlers for pagination
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Handler for filters
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to page 1 whenever filters change
  };
  return (
    <div className="order-list-container">
      <h1 className="order-list-title">All Orders</h1>

      {/* Filters */}
      <div className="order-list-filters">
        <h2>Filters</h2>
        <div className="filters-inputs">
          <input
            type="text"
            placeholder="Filter by ID"
            name="id"
            value={filters.id}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            placeholder="Filter by Reason"
            name="reason"
            value={filters.reason}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            placeholder="Filter by Product"
            name="product"
            value={filters.product}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            placeholder="Filter by Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            placeholder="Filter by School"
            name="school_name"
            value={filters.school_name}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            placeholder="Filter by City"
            name="city"
            value={filters.city}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            placeholder="Filter by Postcode"
            name="postcode"
            value={filters.postcode}
            onChange={handleFilterChange}
          />
          {/* Add additional filter inputs as required */}
        </div>
      </div>

      {/* Table */}
      {currentOrders.length === 0 ? (
        <p className="no-matching-orders">No matching orders found.</p>
      ) : (
        <div className="order-list-table-wrapper">
          <table className="order-list-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>
                  Order ID
                  {sortKey === 'id' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('reason')}>
                  Reason
                  {sortKey === 'reason' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('product')}>
                  Product
                  {sortKey === 'product' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('free_sample')}>
                  Free Sample
                  {sortKey === 'free_sample' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('first_name')}>
                  First Name
                  {sortKey === 'first_name' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('last_name')}>
                  Last Name
                  {sortKey === 'last_name' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('school_name')}>
                  School
                  {sortKey === 'school_name' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('position')}>
                  Position
                  {sortKey === 'position' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('art_packs')}>
                  Art Packs
                  {sortKey === 'art_packs' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('referral')}>
                  Referral
                  {sortKey === 'referral' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('email')}>
                  Email
                  {sortKey === 'email' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('phone')}>
                  Phone
                  {sortKey === 'phone' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('city')}>
                  City
                  {sortKey === 'city' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('county')}>
                  County
                  {sortKey === 'county' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('postcode')}>
                  Postcode
                  {sortKey === 'postcode' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('status')}>
                  Status
                  {sortKey === 'status' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('created_at')}>
                  Created At
                  {sortKey === 'created_at' && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                {/* Add more column headers as needed */}
              </tr>
            </thead>
            <tbody>
              {currentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.reason}</td>
                  <td>{order.product}</td>
                  <td>{String(order.free_sample)}</td>
                  <td>{order.first_name}</td>
                  <td>{order.last_name}</td>
                  <td>{order.school_name}</td>
                  <td>{order.position}</td>
                  <td>{order.art_packs}</td>
                  <td>{order.referral}</td>
                  <td>{order.email}</td>
                  <td>{order.phone}</td>
                  <td>{order.city}</td>
                  <td>{order.county}</td>
                  <td>{order.postcode}</td>
                  <td>{order.status}</td>
                  <td>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : 'N/A'}
                  </td>
                  {/* Render additional cells as needed */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination-controls">
        <button onClick={handlePrevPage} disabled={currentPage === 1}>
          Prev
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default OrderList;
