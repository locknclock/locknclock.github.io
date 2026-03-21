// Signup.jsx

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';

const HalfYearActivityDemo = () => {
  const [metric, setMetric] = useState('hours'); // 'hours' | 'tasks'

  const startOfWeek = (d) => {
    const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = nd.getDay(); // 0=Sun
    nd.setDate(nd.getDate() - diff);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };

  const { weeks, monthLabels } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();

    // Period: Jan 1 -> Jun 30 (inclusive)
    const rangeStart = new Date(year, 0, 1);   // Jan 1
    const rangeEnd   = new Date(year, 4, 15);  // Jun 30
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    // Expand to full weeks for a nice grid
    const firstWeekStart = startOfWeek(rangeStart);
    const lastWeekStart  = startOfWeek(rangeEnd);
    const lastGridDate   = new Date(lastWeekStart);
    lastGridDate.setDate(lastGridDate.getDate() + 6); // Saturday of last week

    const dayHash = (d) => {
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return (((key * 2654435761) >>> 0) % 1000) / 1000; // 0..1 deterministic
    };

    const weekendWeight = (d) => {
      const dow = d.getDay(); // 0 Sun .. 6 Sat
      if (dow === 0 || dow === 6) return 0.45; // weekends lower
      if (dow === 5) return 0.85;              // Fridays slightly lower
      return 1.0;                               // Mon–Thu
    };

    // Map raw 0..1 -> level 0..4, with metric-specific shaping
    const toLevel = (raw, d) => {
      const w = weekendWeight(d);
      const r = Math.min(1, raw * w);

      // different feel per metric
      const shaped = metric === 'tasks'
        ? Math.pow(r, 1.2)  // sparser highs
        : Math.pow(r, 0.9); // fuller mids

      if (metric === 'hours') {
        if (shaped < 0.12) return 0;
        if (shaped < 0.32) return 1;
        if (shaped < 0.55) return 2;
        if (shaped < 0.78) return 3;
        return 4;
      } else {
        if (shaped < 0.30) return 0;
        if (shaped < 0.50) return 1;
        if (shaped < 0.70) return 2;
        if (shaped < 0.86) return 3;
        return 4;
      }
    };

    const weeksArr = [];
    const labels = [];

    for (
      let colStart = new Date(firstWeekStart), colIdx = 0;
      colStart <= lastGridDate;
      colStart = new Date(colStart.getFullYear(), colStart.getMonth(), colStart.getDate() + 7), colIdx++
    ) {
      const days = [];
      let monthLabel = null;

      for (let i = 0; i < 7; i++) {
        const d = new Date(colStart);
        d.setDate(colStart.getDate() + i);

        const inRange = d >= rangeStart && d <= rangeEnd;
        const lvl = inRange ? toLevel(dayHash(d), d) : -1;

        if (inRange && d.getDate() === 1 && d.getMonth() <= 5) {
          monthLabel = d.toLocaleString(undefined, { month: 'short' }); // Jan..Jun
        }

        days.push({ date: d, lvl, inRange });
      }

      if (monthLabel) labels.push({ index: colIdx, label: monthLabel });
      weeksArr.push(days);
    }

    // Ensure first column labeled 'Jan'
    if (!labels.some(l => l.index === 0)) {
      labels.unshift({ index: 0, label: 'Jan' });
    }

    return { weeks: weeksArr, monthLabels: labels };
  }, [metric]);

  const tooltipFor = (date, lvl) => {
    const ds = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    if (lvl <= 0) return `${ds} • no activity`;
    if (metric === 'hours') {
      const ranges = ['0h', '1–2h', '2–3.5h', '3.5–6h', '6–10h'];
      return `${ds} • ${ranges[lvl]}`;
    } else {
      const counts = ['0 tasks', '1 task', '2 tasks', '3 tasks', '4–5 tasks'];
      return `${ds} • ${counts[lvl]}`;
    }
  };

  const isTasks = (metric === 'tasks');

  return (
    <div aria-label="Half-year activity demo" className="gh-heatmap">
      {/* Spaced buttons */}
      <div className="mb-3 flex items-center gap-2">
        <button
          className={`px-3 py-1.5 border rounded-lg transition-colors ${
            metric === 'hours' ? 'bg-white/5' : 'bg-transparent'
          }`}
          onClick={() => setMetric('hours')}
          aria-pressed={metric === 'hours'}
        >
          hours
        </button>
        <button
          className={`px-3 py-1.5 border rounded-lg transition-colors ${
            metric === 'tasks' ? 'bg-white/5' : 'bg-transparent'
          }`}
          onClick={() => setMetric('tasks')}
          aria-pressed={metric === 'tasks'}
        >
          tasks
        </button>
      </div>

      {/* Month labels */}
      <div className="gh-months mb-2 relative">
        {monthLabels.map(({ index, label }) => (
          <span
            key={index + label}
            style={{
              transform: `translateX(calc(${index} * (var(--hm-size) + var(--hm-gap))))`,
              position: 'absolute'
            }}
          >
            {label}
          </span>
        ))}
        <span aria-hidden className="invisible">MMM</span>
      </div>

      <div className="flex">
        {/* Weekday labels column:
            Render 7 rows (Sun..Sat), label only Mon(1)/Wed(3)/Fri(5) */}
        <div className="gh-days">
          {[0,1,2,3,4,5,6].map((dow) => (
            <div className="row" key={dow}>
              {dow === 0 ? 'Mon' : dow === 2 ? 'Wed' : dow === 4 ? 'Fri' : ''}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="gh-grid">
          {weeks.map((week, wi) => (
            <div className="gh-week" key={wi}>
              {week.map((cell, di) => {
                const cls = `gh-cell ${cell.lvl > 0 ? `gh-lvl-${cell.lvl}` : ''} ${cell.inRange ? '' : 'opacity-30'}`;
                const style = isTasks
                  ? { borderRadius: '9999px', transform: 'scale(0.9)', transformOrigin: 'center' }
                  : { borderRadius: '3px' };

                return (
                  <div
                    key={di}
                    className={cls + (isTasks ? ' transform-gpu' : '')}
                    style={style}
                    title={tooltipFor(cell.date, Math.max(cell.lvl, 0))}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs opacity-80">
        <span className="mr-1">less.</span>
        <span className="gh-cell" style={isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined}/>
        <span className="gh-cell gh-lvl-1" style={isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined}/>
        <span className="gh-cell gh-lvl-2" style={isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined}/>
        <span className="gh-cell gh-lvl-3" style={isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined}/>
        <span className="gh-cell gh-lvl-4" style={isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined}/>
        <span className="ml-1">more.</span>
      </div>
    </div>
  );
};

const Signup = () => {
  const { session, signUpNewUser } = UserAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUpNewUser(email, password);
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to sign up');
      return;
    }
    if (session) navigate('/dashboard');
    else navigate('/signin');
  };

  return (
    <>
      <PublicNavbar />
      <main className="pt-20 px-4 text-[var(--fg)]">
        <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-2">
          {/* Card: Sign up form */}
          <section className="border rounded-3xl p-6">
            <h1 className="text-3xl font-bold">create an account. </h1>
            <p className="opacity-80 text-sm mt-1">
              a simple way to timebox your work and journal what you accomplished.
            </p>

            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
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
                {loading ? 'creating account…' : 'sign up.'}
              </button>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <p className="opacity-80 text-sm pt-2">
                already have an account?{' '}
                <Link to="/signin" className="underline font-semibold">
                  sign in.
                </Link>
              </p>
            </form>
          </section>

          {/* Helpful cards */}
          <section className="space-y-4">
            <div className="p-4 border rounded-2xl">
              <h3 className="font-semibold mb-1">how it works.</h3>
              <p className="opacity-80 text-sm">
                start a focus session, do the work, and jot a short note. your
                note and duration show up in history.
              </p>
            </div>

            <div className="p-4 border rounded-2xl">
              <h3 className="font-semibold mb-1">why journal?</h3>
              <p className="opacity-80 text-sm">
                quick summaries make weekly reviews effortless and help you see
                progress over time.
              </p>
            </div>

            <div className="p-4 border rounded-2xl">
              <h3 className="font-semibold mb-1">privacy.</h3>
              <p className="opacity-80 text-sm">
                your entries are visible only to you. data is stored securely in
                a Supabase project with row-level policies.
              </p>
            </div>

            {/* NEW: Half-year example activity heatmap with toggle */}
            <div className="p-4 border rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">visualize activity.</h3>
              </div>
              <HalfYearActivityDemo />
              <p className="opacity-70 text-xs mt-3">
                toggle between hours and tasks.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Signup;
