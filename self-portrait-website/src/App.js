import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './fonts.css';

import './App.css';
import Navigation from './components/Navigation'; // Updated import
import Dashboard from './components/Dashboard';
import OrderList from './components/OrderList';
import ProcessSlider from './components/ProcessSlider';
import ProcessSliderDetail from './components/ProcessSliderDetail';
import ContactForm from './components/ContactForm';
import SchoolPortalLogin from './components/SchoolPortalLogin';
import SchoolPortalActions from './components/SchoolPortalActions';
import ArtworkManagement from './components/ArtworkManagement';
import UserManagement from './components/UserManagement';
import StaffLogin from './components/StaffLogin';
import PrivateRoute from './PrivateRoute';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

    useEffect(() => {
      async function checkSession() {
        try {
          const res = await fetch('/api/check-auth', { credentials: 'include' });
          const data = await res.json();
          console.log('Check session data:', data);  // Add this line
          if (data.logged_in) {
            setIsAdmin(data.is_admin);
            setIsLoggedIn(true);
            setUsername(data.username || '');
          } else {
            setIsLoggedIn(false);
          }
        } catch (err) {
          console.error('Session check failed:', err);
          setIsLoggedIn(false);
        }
      }
      checkSession();
    }, []);


  return (
    <Router>
      <div className="App">
        <Navigation isLoggedIn={isLoggedIn} isAdmin={isAdmin} username={username} setIsLoggedIn={setIsLoggedIn} />
        <div className="App-content">
          <Routes>
            <Route path="/contact-form" element={<ContactForm />} />
            <Route path="/school-portal-login" element={<SchoolPortalLogin />} />
            <Route
              path="/staff-login"
              element={
                <StaffLogin
                  onLogin={(loggedIn, adminStatus, user) => {
                    setIsLoggedIn(loggedIn);
                    setIsAdmin(adminStatus);
                    setUsername(user); // Update username on login
                  }}
                />
              }
            />
            <Route path="/school-portal-actions/:orderId" element={<SchoolPortalActions />} />
            <Route
              path="/"
              element={
                <PrivateRoute isLoggedIn={isLoggedIn}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <PrivateRoute isLoggedIn={isLoggedIn}>
                  <OrderList />
                </PrivateRoute>
              }
            />
            <Route
              path="/process-slider"
              element={
                <PrivateRoute isLoggedIn={isLoggedIn}>
                  <ProcessSlider />
                </PrivateRoute>
              }
            />
            <Route
              path="/process-slider/:orderId"
              element={
                <PrivateRoute isLoggedIn={isLoggedIn}>
                  <ProcessSliderDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/artwork-management"
              element={
                <PrivateRoute isLoggedIn={isLoggedIn}>
                  <ArtworkManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <PrivateRoute isLoggedIn={isLoggedIn}>
                  {isAdmin ? <UserManagement /> : <h2>Unauthorized</h2>}
                </PrivateRoute>
              }
            />
            <Route path="*" element={<h2 style={{ padding: '1rem' }}>Page Not Found</h2>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
