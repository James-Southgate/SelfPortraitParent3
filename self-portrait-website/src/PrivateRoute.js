// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/staff-login" replace />;
  }
  return children;
}

export default PrivateRoute;
