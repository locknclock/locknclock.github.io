import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';

const Signin = () => {
  const { signInUser } = UserAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signInUser(email, password);

    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to sign in');
      return;
    }

    navigate('/dashboard');
  };

  return (
    <>
      <PublicNavbar />

      <main className="app-shell">
        <div className="mx-auto max-w-xl">
          <section className="surface-row p-6 sm:p-7 lg:p-8">
            <p className="section-title">sign in</p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--fg)] sm:text-5xl">
              lock in. <br /> clock in.
            </h1>

            <form onSubmit={handleSignIn} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm text-[var(--muted)]"
                >
                  email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-minimal"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm text-[var(--muted)]"
                >
                  password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-minimal"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full disabled:opacity-60"
              >
                {loading ? 'signing in…' : 'sign in'}
              </button>

              <p className="meta-text pt-1">
                don&apos;t have an account?{' '}
                <Link
                  to="/signup"
                  className="no-underline text-[var(--fg)] transition hover:text-[var(--link)]"
                >
                  create one
                </Link>
                .
              </p>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Signin;