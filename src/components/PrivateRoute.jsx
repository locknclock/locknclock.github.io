// PrivateRoute.jsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { session, initializing } = UserAuth();
  const location = useLocation();

  // While Supabase initializes, show a loader
  if (initializing) {
    return <p>Loading...</p>;
  }

  // After init: session ? render children : redirect to signup
  return session ? (
    <>{children}</>
  ) : (
    <Navigate to="/signup" replace state={{ from: location }} />
  );
};

export default PrivateRoute;
