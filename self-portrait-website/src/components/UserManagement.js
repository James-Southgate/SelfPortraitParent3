// src/components/UserManagement.js
import React, { useEffect, useState } from 'react';
import './UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [feedback, setFeedback] = useState('');

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setFeedback('Could not load user list.');
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreateUser(e) {
    e.preventDefault();
    setFeedback('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create user');
      }
      const data = await res.json();
      setFeedback(data.message);
      // Re-fetch
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setFeedback(err.message);
    }
  }

  async function handleDeleteUser(userId) {
    setFeedback('');
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete user');
      }
      const data = await res.json();
      setFeedback(data.message);
      // Re-fetch
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setFeedback(err.message);
    }
  }

  return (
    <div className="user-management-container">
      <h1 className="user-management-title">User Management</h1>

      {feedback && <p className="user-management-feedback">{feedback}</p>}

      <div className="create-user-card">
        <h2 className="create-user-card-header">Create New User</h2>
        <form className="create-user-form" onSubmit={handleCreateUser}>
          <label>
            Username:
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label>
            Password:
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <button type="submit">Create User</button>
        </form>
      </div>

      <div className="user-list-card">
        <h2 className="user-list-card-header">Existing Users</h2>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table className="user-management-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>
                    {u.username === 'admin' ? (
                      <em>Cannot delete admin</em>
                    ) : (
                      <button
                        className="user-delete-button"
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
