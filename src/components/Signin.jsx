// Signin.jsx

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
      <main className="pt-20 px-4 text-[var(--fg)]">
        <div className="max-w-md mx-auto">
          <section className="border rounded-3xl p-6">
            <h1 className="text-3xl font-bold">lock in. clock in.</h1>
            <p className="opacity-80 text-sm mt-1">sign in to continue.</p>

            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm mb-1 opacity-80">
                  email.
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border rounded-lg p-3"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm mb-1 opacity-80">
                  password.
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border rounded-lg p-3"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 border rounded-lg py-2 hover:border-[var(--border)] disabled:opacity-60"
              >
                {loading ? 'signing in…' : 'sign in.'}
              </button>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <p className="opacity-80 text-sm pt-2">
                don't have an account?{' '}
                <Link to="/signup" className="underline font-semibold">
                  sign up
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
