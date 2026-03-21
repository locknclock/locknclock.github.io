// AuthedLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const AuthedLayout = () => {
  return (
    <>
      <Navbar />
      <main className="pt-16 px-4">
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default AuthedLayout;
