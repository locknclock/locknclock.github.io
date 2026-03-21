// PublicNavbar.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const PublicNavbar = () => {
  const { pathname } = useLocation();
  const onSignin = pathname.startsWith('/signin');
  const onSignup = pathname.startsWith('/signup') || pathname === '/';

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onDown = (e) => e.key === 'Escape' && setOpen(false);
    const onClick = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', onDown);
      document.addEventListener('mousedown', onClick);
    }
    return () => {
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const LinkBtn = ({ to, label, active }) => (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`px-3 py-1.5 border rounded-lg hover:border-[var(--border)] ${
        active ? 'opacity-100 font-medium' : 'opacity-90 hover:opacity-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand as plain <p>: b[lock]outc[lock]in with green "lock" */}
        <p className="font-bold tracking-wide flex items-center gap-0.5" aria-label="locknclock">
          lock<span className="text-[var(--cadmium-red)]">n</span>clock 
        </p>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          {onSignup && <LinkBtn to="/signin" label="sign in" active={false} />}
          {onSignin && <LinkBtn to="/signup" label="sign up" active={false} />}
        </div>

        {/* Mobile hamburger */}
        <div className="sm:hidden">
          <button
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="public-menu"
            onClick={() => setOpen((v) => !v)}
            className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)]"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          ref={panelRef}
          id="public-menu"
          className="sm:hidden absolute right-4 top-14 border rounded-2xl p-3 bg-[var(--bg)] text-[var(--fg)] w-56 shadow-lg"
        >
          <div className="flex flex-col gap-2">
            {onSignup && <LinkBtn to="/signin" label="sign in" active={false} />}
            {onSignin && <LinkBtn to="/signup" label="sign up" active={false} />}
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
