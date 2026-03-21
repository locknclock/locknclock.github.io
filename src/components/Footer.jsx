import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title">locknclock</p>
            <p className="meta-text mt-3">© {year} locknclock</p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 sm:gap-5">
            <Link
              to="/privacy"
              className="button-ghost no-underline inline-flex items-center !px-0"
            >
              privacy policy
            </Link>

            <Link
              to="/terms"
              className="button-ghost no-underline inline-flex items-center !px-0"
            >
              terms of service
            </Link>

            <a
              href="mailto:itsahmedkhalil@gmail.com"
              className="button-ghost no-underline inline-flex items-center !px-0"
            >
              contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;