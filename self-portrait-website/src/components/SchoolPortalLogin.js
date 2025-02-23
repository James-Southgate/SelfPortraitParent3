// src/components/SchoolPortalLogin.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

async function loginSchoolPortal(username, password) {
  // This calls our new back-end route: POST /api/school-portal/login
  const response = await fetch('/api/school-portal/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    // either 400 or 401, etc.
    const errData = await response.json();
    throw new Error(errData.error || 'Login failed');
  }
  const data = await response.json();
  return data; // e.g. {id, status, school_name}
}

function SchoolPortalLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    try {
      const orderData = await loginSchoolPortal(username, password);
      // orderData might have id, status, etc.
      // Now we navigate to the next page with orderId as param,
      // or store it in context, or localStorage.
      // Easiest is to pass orderId in the route:
      navigate(`/school-portal-actions/${orderData.id}`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      <h1>School Portal Login</h1>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      <div>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default SchoolPortalLogin;
