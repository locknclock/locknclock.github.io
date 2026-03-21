import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';

const HalfYearActivityDemo = () => {
  const [metric, setMetric] = useState('hours');

  const startOfWeek = (d) => {
    const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = nd.getDay();
    nd.setDate(nd.getDate() - diff);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };

  const { weeks, monthLabels } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();

    // Jan 1 -> Jun 30
    const rangeStart = new Date(year, 0, 1);
    const rangeEnd = new Date(year, 5, 30);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    const firstWeekStart = startOfWeek(rangeStart);
    const lastWeekStart = startOfWeek(rangeEnd);
    const lastGridDate = new Date(lastWeekStart);
    lastGridDate.setDate(lastGridDate.getDate() + 6);

    const dayHash = (d) => {
      const key =
        d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return (((key * 2654435761) >>> 0) % 1000) / 1000;
    };

    const weekendWeight = (d) => {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return 0.45;
      if (dow === 5) return 0.85;
      return 1.0;
    };

    const toLevel = (raw, d) => {
      const w = weekendWeight(d);
      const r = Math.min(1, raw * w);

      const shaped =
        metric === 'tasks' ? Math.pow(r, 1.2) : Math.pow(r, 0.9);

      if (metric === 'hours') {
        if (shaped < 0.12) return 0;
        if (shaped < 0.32) return 1;
        if (shaped < 0.55) return 2;
        if (shaped < 0.78) return 3;
        return 4;
      }

      if (shaped < 0.3) return 0;
      if (shaped < 0.5) return 1;
      if (shaped < 0.7) return 2;
      if (shaped < 0.86) return 3;
      return 4;
    };

    const weeksArr = [];
    const labels = [];

    for (
      let colStart = new Date(firstWeekStart), colIdx = 0;
      colStart <= lastGridDate;
      colStart = new Date(
        colStart.getFullYear(),
        colStart.getMonth(),
        colStart.getDate() + 7
      ),
        colIdx++
    ) {
      const days = [];
      let monthLabel = null;

      for (let i = 0; i < 7; i++) {
        const d = new Date(colStart);
        d.setDate(colStart.getDate() + i);

        const inRange = d >= rangeStart && d <= rangeEnd;
        const lvl = inRange ? toLevel(dayHash(d), d) : -1;

        if (inRange && d.getDate() === 1 && d.getMonth() <= 5) {
          monthLabel = d.toLocaleString(undefined, { month: 'short' });
        }

        days.push({ date: d, lvl, inRange });
      }

      if (monthLabel) labels.push({ index: colIdx, label: monthLabel });
      weeksArr.push(days);
    }

    if (!labels.some((l) => l.index === 0)) {
      labels.unshift({ index: 0, label: 'Jan' });
    }

    return { weeks: weeksArr, monthLabels: labels };
  }, [metric]);

  const tooltipFor = (date, lvl) => {
    const ds = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (lvl <= 0) return `${ds} • no activity`;

    if (metric === 'hours') {
      const ranges = ['0h', '1–2h', '2–3.5h', '3.5–6h', '6–10h'];
      return `${ds} • ${ranges[lvl]}`;
    }

    const counts = ['0 tasks', '1 task', '2 tasks', '3 tasks', '4–5 tasks'];
    return `${ds} • ${counts[lvl]}`;
  };

  const isTasks = metric === 'tasks';

  return (
    <div aria-label="Half-year activity demo" className="gh-heatmap">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          className={metric === 'hours' ? 'button-primary' : 'button-subtle'}
          onClick={() => setMetric('hours')}
          aria-pressed={metric === 'hours'}
        >
          hours
        </button>
        <button
          type="button"
          className={metric === 'tasks' ? 'button-primary' : 'button-subtle'}
          onClick={() => setMetric('tasks')}
          aria-pressed={metric === 'tasks'}
        >
          tasks
        </button>
      </div>

      <div className="gh-months mb-2 relative">
        {monthLabels.map(({ index, label }) => (
          <span
            key={`${index}-${label}`}
            style={{
              transform: `translateX(calc(${index} * (var(--hm-size) + var(--hm-gap))))`,
              position: 'absolute',
            }}
          >
            {label}
          </span>
        ))}
        <span aria-hidden className="invisible">
          MMM
        </span>
      </div>

      <div className="flex">
        <div className="gh-days">
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div className="row" key={dow}>
              {dow === 1 ? 'Mon' : dow === 3 ? 'Wed' : dow === 5 ? 'Fri' : ''}
            </div>
          ))}
        </div>

        <div className="gh-grid">
          {weeks.map((week, wi) => (
            <div className="gh-week" key={wi}>
              {week.map((cell, di) => {
                const cls = `gh-cell ${
                  cell.lvl > 0 ? `gh-lvl-${cell.lvl}` : ''
                } ${cell.inRange ? '' : 'opacity-30'}`;

                const style = isTasks
                  ? {
                      borderRadius: '9999px',
                      transform: 'scale(0.9)',
                      transformOrigin: 'center',
                    }
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

      <div className="meta-text mt-4 flex items-center gap-2">
        <span>less</span>
        <span
          className="gh-cell"
          style={
            isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined
          }
        />
        <span
          className="gh-cell gh-lvl-1"
          style={
            isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined
          }
        />
        <span
          className="gh-cell gh-lvl-2"
          style={
            isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined
          }
        />
        <span
          className="gh-cell gh-lvl-3"
          style={
            isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined
          }
        />
        <span
          className="gh-cell gh-lvl-4"
          style={
            isTasks ? { borderRadius: '9999px', transform: 'scale(0.9)' } : undefined
          }
        />
        <span>more</span>
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

    const { data, error } = await signUpNewUser(email, password);

    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to sign up');
      return;
    }

    if (data?.session || session) {
      navigate('/dashboard');
    } else {
      navigate('/signin');
    }
  };

  return (
    <>
      <PublicNavbar />

      <main className="app-shell">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="surface-row p-6 sm:p-7 lg:p-8">
            <p className="section-title">create account</p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--fg)] sm:text-5xl">
              create your workspace
            </h1>

            <p className="meta-text mt-4 max-w-md">
              a simple place to track focused sessions, keep a working journal,
              and move tasks forward.
            </p>

            <form onSubmit={handleSignUp} className="mt-8 space-y-5">
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
                  autoComplete="new-password"
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
                {loading ? 'creating account…' : 'sign up'}
              </button>

              <p className="meta-text pt-1">
                already have an account?{' '}
                <Link
                  to="/signin"
                  className="no-underline text-[var(--fg)] transition hover:text-[var(--link)]"
                >
                  sign in
                </Link>
                .
              </p>
            </form>
          </section>

          <section className="space-y-4">
            <div className="surface-row p-5">
              <p className="section-title">how it works</p>
              <p className="meta-text mt-3">
                start a focus session, do the work, then save a short review so
                it becomes part of your history.
              </p>
            </div>

            <div className="surface-row p-5">
              <p className="section-title">why journal</p>
              <p className="meta-text mt-3">
                quick summaries make weekly reviews easier and help you see
                real progress over time.
              </p>
            </div>

            <div className="surface-row p-5">
              <p className="section-title">privacy</p>
              <p className="meta-text mt-3">
                your entries are visible only to you, with row-level protections
                in your Supabase-backed data model.
              </p>
            </div>

            <div className="surface-row p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-title">activity preview</p>
                  <p className="meta-text mt-3">
                    switch between time spent and completed tasks.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="w-max min-w-full">
                  <HalfYearActivityDemo />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Signup;