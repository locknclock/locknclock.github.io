import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import Timer from './Timer';
import LeaveGuard from './LeaveGuard';

const Dashboard = () => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const [guardActive, setGuardActive] = useState(false);

  // -------------------------
  // Active tasks tile data
  // -------------------------
  const [tasks, setTasks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoadingTasks(true);
      setErrorTasks(null);

      const { data: t, error: te } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .is('completed_at', null)
        .order('created_at', { ascending: true });

      if (te) {
        setErrorTasks(te.message);
        setTasks([]);
        setSubs([]);
        setLoadingTasks(false);
        return;
      }

      setTasks(t || []);

      if ((t || []).length) {
        const ids = (t || []).map((x) => x.id);
        const { data: s, error: se } = await supabase
          .from('subtasks')
          .select('*')
          .eq('user_id', userId)
          .in('task_id', ids)
          .order('created_at', { ascending: true });

        if (se) {
          setErrorTasks(se.message);
          setSubs([]);
        } else {
          setSubs(s || []);
        }
      } else {
        setSubs([]);
      }

      setLoadingTasks(false);
    };

    load();
  }, [userId]);

  const subsByTask = useMemo(() => {
    const m = new Map();
    subs.forEach((s) => {
      if (!m.has(s.task_id)) m.set(s.task_id, []);
      m.get(s.task_id).push(s);
    });
    return m;
  }, [subs]);

  // -------------------------
  // Yearly heatmap data
  // -------------------------
  const [mode, setMode] = useState('hours');
  const [hoursByDay, setHoursByDay] = useState(new Map());
  const [itemsByDay, setItemsByDay] = useState(new Map());
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [errorHeatmap, setErrorHeatmap] = useState(null);

  const today0 = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const start0 = useMemo(() => {
    const d = new Date(today0);
    d.setDate(d.getDate() - 364);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today0]);

  const toKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toLocalDayKey = (iso) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return toKey(d);
  };

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoadingHeatmap(true);
      setErrorHeatmap(null);
      const startISO = start0.toISOString();

      const { data: entries, error: e0 } = await supabase
        .from('journal_entries')
        .select('started_at, ended_at, duration_seconds')
        .eq('user_id', userId)
        .gte('started_at', startISO);

      if (e0) {
        setErrorHeatmap(e0.message);
        setHoursByDay(new Map());
      } else {
        const m = new Map();
        (entries || []).forEach((e) => {
          const key = toLocalDayKey(e.started_at);
          const hrs = (e.duration_seconds || 0) / 3600;
          m.set(key, (m.get(key) || 0) + hrs);
        });
        setHoursByDay(m);
      }

      const [{ data: tDone, error: e1 }, { data: sDone, error: e2 }] =
        await Promise.all([
          supabase
            .from('tasks')
            .select('completed_at')
            .eq('user_id', userId)
            .gte('completed_at', startISO),
          supabase
            .from('subtasks')
            .select('completed_at')
            .eq('user_id', userId)
            .gte('completed_at', startISO),
        ]);

      if (e1 || e2) {
        setErrorHeatmap(
          (e1?.message || e2?.message) ?? 'Failed to load completion data'
        );
        setItemsByDay(new Map());
      } else {
        const m2 = new Map();
        (tDone || []).forEach((r) => {
          const key = toLocalDayKey(r.completed_at);
          m2.set(key, (m2.get(key) || 0) + 1);
        });
        (sDone || []).forEach((r) => {
          const key = toLocalDayKey(r.completed_at);
          m2.set(key, (m2.get(key) || 0) + 1);
        });
        setItemsByDay(m2);
      }

      setLoadingHeatmap(false);
    };

    load();
  }, [userId, start0]);

  const { weeks, maxValue, monthSegments } = useMemo(() => {
    const alignedStart = new Date(start0);
    alignedStart.setDate(alignedStart.getDate() - alignedStart.getDay());

    const days = [];
    for (
      let d = new Date(alignedStart);
      d <= today0;
      d.setDate(d.getDate() + 1)
    ) {
      days.push(new Date(d));
    }

    const weeksArr = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArr.push(days.slice(i, i + 7));
    }

    const map = mode === 'hours' ? hoursByDay : itemsByDay;
    let maxV = 0;
    map.forEach((v) => {
      if (v > maxV) maxV = v;
    });

    const weekStarts = weeksArr.map((w) => w[0]);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const segs = [];
    if (weekStarts.length) {
      let curMonth = weekStarts[0].getMonth();
      let segStart = 0;

      for (let i = 1; i < weekStarts.length; i++) {
        const m = weekStarts[i].getMonth();
        if (m !== curMonth) {
          segs.push({ label: monthNames[curMonth], weeks: i - segStart });
          curMonth = m;
          segStart = i;
        }
      }

      const lastMonth = weekStarts[weekStarts.length - 1].getMonth();
      segs.push({
        label: monthNames[lastMonth],
        weeks: weekStarts.length - segStart,
      });
    }

    return {
      weeks: weeksArr,
      maxValue: maxV || 0,
      monthSegments: segs,
    };
  }, [start0, today0, mode, hoursByDay, itemsByDay]);

  const valueForDay = (d) => {
    const key = toKey(d);
    const map = mode === 'hours' ? hoursByDay : itemsByDay;
    return map.get(key) || 0;
  };

  const levelForValue = (v) => {
    if (!v || !maxValue) return 0;
    const r = v / maxValue;
    if (r >= 0.75) return 4;
    if (r >= 0.5) return 3;
    if (r >= 0.25) return 2;
    return 1;
  };

  return (
    <main className="app-shell">
      <LeaveGuard when={guardActive} />

      <header className="mb-12">
        <h1 className="page-title">dashboard</h1>
        <p className="meta-text mt-3">welcome, {session?.user?.email}</p>
      </header>

      <section>
        <div className="mb-4">
          <p className="section-title">focus timer</p>
          <p className="meta-text mt-3 max-w-2xl">
            start the timer, do the work, then save a short review of what you
            accomplished.
          </p>
        </div>

        <Timer onGuardChange={setGuardActive} />
      </section>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <p className="section-title">active tasks</p>
          <Link to="/tasks" className="button-ghost no-underline">
            open tasks
          </Link>
        </div>

        <div className="divider-subtle" />

        {loadingTasks && <p className="meta-text pt-5">loading tasks…</p>}
        {errorTasks && <p className="pt-5 text-sm text-red-400">error: {errorTasks}</p>}

        {!loadingTasks && !errorTasks && tasks.length === 0 && (
          <p className="meta-text pt-5">
            no active tasks yet.{' '}
            <Link to="/tasks">create a few</Link>
            .
          </p>
        )}

        {!!tasks.length && (
          <ul className="mt-4 max-h-[26rem] space-y-3 overflow-auto pr-1">
            {tasks.map((t) => {
              const list = subsByTask.get(t.id) || [];
              const remaining = list.filter((s) => !s.completed_at).length;
              const expanded = expandedTaskId === t.id;

              return (
                <li key={t.id} className="surface-row overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                    onClick={() =>
                      setExpandedTaskId(expanded ? null : t.id)
                    }
                    aria-expanded={expanded}
                    aria-controls={`task-panel-${t.id}`}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <svg
                        className={`shrink-0 text-white/45 transition-transform ${
                          expanded ? 'rotate-90' : ''
                        }`}
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path d="M7 6l6 4-6 4V6z" fill="currentColor" />
                      </svg>

                      <span className="task-title truncate">{t.title}</span>
                    </div>

                    <span className="meta-text hidden whitespace-nowrap sm:block">
                      {remaining > 0
                        ? `${remaining} subtask${remaining > 1 ? 's' : ''} left`
                        : list.length
                        ? 'all subtasks complete'
                        : 'no subtasks'}
                    </span>
                  </button>

                  {expanded && (
                    <div
                      id={`task-panel-${t.id}`}
                      className="row-divider px-4 pb-4 pt-3"
                    >
                      {!list.length ? (
                        <p className="meta-text">no subtasks yet.</p>
                      ) : (
                        <ul className="ml-1 space-y-2">
                          {list.map((s) => {
                            const done = !!s.completed_at;
                            return (
                              <li
                                key={s.id}
                                className="flex items-center gap-3 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={done}
                                  readOnly
                                  disabled
                                  style={{ accentColor: 'var(--link)' }}
                                  className="shrink-0 opacity-70"
                                />
                                <span
                                  className={
                                    done
                                      ? 'text-white/45 line-through'
                                      : 'text-white/80'
                                  }
                                >
                                  {s.title}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <div className="mb-4 flex items-end justify-between gap-4">
          <p className="section-title">activity in the last year</p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('hours')}
              className={mode === 'hours' ? 'button-primary' : 'button-subtle'}
            >
              hours / day
            </button>
            <button
              type="button"
              onClick={() => setMode('items')}
              className={mode === 'items' ? 'button-primary' : 'button-subtle'}
            >
              tasks / day
            </button>
          </div>
        </div>

        <div className="surface-row gh-heatmap p-5 sm:p-6">
          {loadingHeatmap && <p className="meta-text">loading activity…</p>}
          {errorHeatmap && <p className="text-sm text-red-400">error: {errorHeatmap}</p>}

          {!loadingHeatmap && !errorHeatmap && (
            <>
              <div className="overflow-x-auto">
                <div className="w-max">
                  <div className="gh-months">
                    {monthSegments.map((seg, i) => {
                      const colWidth = `calc(var(--hm-size) + var(--hm-gap))`;
                      return (
                        <div
                          key={i}
                          style={{
                            width: `calc((${colWidth}) * ${seg.weeks})`,
                            minWidth: `calc((${colWidth}) * ${seg.weeks})`,
                          }}
                        >
                          {seg.weeks >= 2 ? seg.label : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-1 flex">
                    <div className="gh-days">
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <div key={d} className="row">
                          {(d === 1 && 'Mon') ||
                            (d === 3 && 'Wed') ||
                            (d === 5 && 'Fri') ||
                            ''}
                        </div>
                      ))}
                    </div>

                    <div className="gh-grid">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="gh-week">
                          {week.map((d, di) => {
                            const v = valueForDay(d);
                            const lvl = levelForValue(v);
                            const title =
                              mode === 'hours'
                                ? `${d.toLocaleDateString()}: ${v.toFixed(2)}h`
                                : `${d.toLocaleDateString()}: ${v} item${
                                    v === 1 ? '' : 's'
                                  }`;

                            return (
                              <div
                                key={di}
                                className={`gh-cell ${lvl ? `gh-lvl-${lvl}` : ''}`}
                                title={title}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="meta-text mt-4 flex items-center gap-2">
                <span>less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <span
                    key={l}
                    className={`gh-cell ${l ? `gh-lvl-${l}` : ''}`}
                  />
                ))}
                <span>more</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mt-16 grid gap-3 md:grid-cols-3">
        <div className="surface-row p-4">
          <p className="section-title">how it works</p>
          <p className="meta-text mt-3">
            run a session, stay focused, then leave a short note so it shows up
            in history.
          </p>
        </div>

        <div className="surface-row p-4">
          <p className="section-title">history</p>
          <p className="meta-text mt-3">
            review previous sessions, durations, and notes.
          </p>
          <Link
            to="/history"
            className="button-ghost no-underline mt-4 inline-flex"
          >
            open history
          </Link>
        </div>

        <div className="surface-row p-4">
          <p className="section-title">tasks</p>
          <p className="meta-text mt-3">
            manage tasks and subtasks that you can complete after each session.
          </p>
          <Link
            to="/tasks"
            className="button-ghost no-underline mt-4 inline-flex"
          >
            open tasks
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;