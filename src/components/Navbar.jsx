// Navbar.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const NavItem = ({ to, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`px-3 py-1.5 border rounded-lg hover:border-[var(--border)] ${
      active ? 'opacity-100 font-medium' : 'opacity-80 hover:opacity-100'
    }`}
  >
    {label}
  </Link>
);

const Navbar = () => {
  const { signOut } = UserAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onDashboard = pathname.startsWith('/dashboard');
  const onHistory = pathname.startsWith('/history');
  const onTasks = pathname.startsWith('/tasks');

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      alert(err.message || 'Failed to sign out');
    }
  };

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on outside click / Esc
  useEffect(() => {
    const onDown = (e) => { if (e.key === 'Escape') setOpen(false); };
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand as plain <p>: b[lock]outc[lock]in with green "lock" */}
        <p className="font-bold tracking-wide flex items-center gap-0.5" aria-label="locknclock">
          lock<span className="text-[var(--cadmium-red)]">n</span>clock 
        </p>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          <NavItem to="/dashboard" label="dashboard" active={onDashboard} />
          <NavItem to="/tasks" label="tasks" active={onTasks} />
          <NavItem to="/history" label="history" active={onHistory} />
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)]"
          >
            sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <div className="sm:hidden">
          <button
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="auth-menu"
            onClick={() => setOpen((v) => !v)}
            className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)]"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          id="auth-menu"
          className="sm:hidden absolute right-4 top-14 border rounded-2xl p-3 bg-[var(--bg)] text-[var(--fg)] w-56 shadow-lg"
        >
          <div className="flex flex-col gap-2">
            <NavItem to="/dashboard" label="dashboard" active={onDashboard} onClick={() => setOpen(false)} />
            <NavItem to="/tasks" label="tasks" active={onTasks} onClick={() => setOpen(false)} />
            <NavItem to="/history" label="history" active={onHistory} onClick={() => setOpen(false)} />
            <button
              onClick={(e) => { handleSignOut(e); setOpen(false); }}
              className="mt-1 px-3 py-1.5 border rounded-lg text-left hover:border-[var(--border)]"
            >
              sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
