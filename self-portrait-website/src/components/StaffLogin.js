// src/components/StaffLogin.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function StaffLogin({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // StaffLogin.js
  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await fetch('/api/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      // Now that login succeeded, do a second fetch to /api/check-auth:
      const checkRes = await fetch('/api/check-auth', { credentials: 'include' });
      const data = await checkRes.json();

      // The parent wants to know both isLoggedIn and isAdmin:
      // We'll pass them up in onLogin().
      onLogin(data.logged_in, data.is_admin, data.username);

      navigate('/');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    }
  }





  return (
    <div>
      <h1>Staff Login</h1>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <br />
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default StaffLogin;

