// Footer.jsx

import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="opacity-80 text-sm">© {year} locknclock</p>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/privacy" className="underline">privacy policy</Link>
          <Link to="/terms" className="underline">terms of service</Link>
          {/* Optional quick contact link */}
          <a href="mailto:ahmedkhalil2719@yahoo.com" className="underline">contact</a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
