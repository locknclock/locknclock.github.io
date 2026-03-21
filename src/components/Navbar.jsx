import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';

const NavItem = ({ to, label, active, onClick, mobile = false }) => {
  const base =
    'no-underline transition';
  const desktopClass = active
    ? 'text-[var(--fg)]'
    : 'text-[var(--muted)] hover:text-[var(--fg)]';
  const mobileClass = active
    ? 'button-subtle text-left justify-start no-underline'
    : 'button-ghost text-left justify-start no-underline';

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={mobile ? mobileClass : `${base} ${desktopClass}`}
    >
      {label}
    </Link>
  );
};

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

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
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)]"
      style={{
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand as plain <p>: b[lock]outc[lock]in with green "lock" */}
        <p className="font-bold tracking-wide flex items-center gap-0.5" aria-label="locknclock">
          lock<span className="text-[var(--cadmium-red)]">n</span>clock 
        </p>

        <div className="hidden sm:flex items-center gap-6">
          <NavItem to="/dashboard" label="dashboard" active={onDashboard} />
          <NavItem to="/tasks" label="tasks" active={onTasks} />
          <NavItem to="/history" label="history" active={onHistory} />

          <button
            type="button"
            onClick={handleSignOut}
            className="button-subtle"
          >
            sign out
          </button>
        </div>

        <div className="sm:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="auth-menu"
            onClick={() => setOpen((v) => !v)}
            className="button-subtle"
          >
            menu
          </button>
        </div>
      </div>

      {open && (
        <div
          ref={panelRef}
          id="auth-menu"
          className="sm:hidden absolute right-4 top-[4.25rem] w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-xl"
        >
          <div className="flex flex-col gap-1">
            <NavItem
              to="/dashboard"
              label="dashboard"
              active={onDashboard}
              onClick={() => setOpen(false)}
              mobile
            />
            <NavItem
              to="/tasks"
              label="tasks"
              active={onTasks}
              onClick={() => setOpen(false)}
              mobile
            />
            <NavItem
              to="/history"
              label="history"
              active={onHistory}
              onClick={() => setOpen(false)}
              mobile
            />

            <div className="my-2 divider-subtle" />

            <button
              type="button"
              onClick={(e) => {
                handleSignOut(e);
                setOpen(false);
              }}
              className="button-danger text-left justify-start"
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