// Dashboard.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import Timer from './Timer';
import LeaveGuard from './LeaveGuard'; // ← added

const Dashboard = () => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  // leave-warning: active when timer is running or paused
  const [guardActive, setGuardActive] = useState(false); // ← added

  // -------------------------
  // Active tasks tile data
  // -------------------------
  const [tasks, setTasks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null); // only one open at a time

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingTasks(true);
      setErrorTasks(null);

      // Only ACTIVE tasks
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

      // Subtasks under these active tasks (active + completed)
      if ((t || []).length) {
        const ids = (t || []).map(x => x.id);
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
    subs.forEach(s => {
      if (!m.has(s.task_id)) m.set(s.task_id, []);
      m.get(s.task_id).push(s);
    });
    return m; // Map<task_id, Subtask[]>
  }, [subs]);

  // -------------------------
  // Yearly heatmap data
  // -------------------------
  const [mode, setMode] = useState('hours'); // 'hours' or 'items'
  const [hoursByDay, setHoursByDay] = useState(new Map()); // key 'YYYY-MM-DD' -> hours
  const [itemsByDay, setItemsByDay] = useState(new Map()); // key 'YYYY-MM-DD' -> count
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [errorHeatmap, setErrorHeatmap] = useState(null);

  const today0 = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);
  const start0 = useMemo(() => {
    const d = new Date(today0); d.setDate(d.getDate() - 364); d.setHours(0,0,0,0); return d;
  }, [today0]);

  const toKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const toLocalDayKey = (iso) => {
    const d = new Date(iso); d.setHours(0,0,0,0); return toKey(d);
  };

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingHeatmap(true);
      setErrorHeatmap(null);
      const startISO = start0.toISOString();

      // 1) Hours/day from journal entries
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
        (entries || []).forEach(e => {
          const key = toLocalDayKey(e.started_at);
          const hrs = (e.duration_seconds || 0) / 3600;
          m.set(key, (m.get(key) || 0) + hrs);
        });
        setHoursByDay(m);
      }

      // 2) Items/day (task + subtask completions)
      const [{ data: tDone, error: e1 }, { data: sDone, error: e2 }] = await Promise.all([
        supabase.from('tasks').select('completed_at').eq('user_id', userId).gte('completed_at', startISO),
        supabase.from('subtasks').select('completed_at').eq('user_id', userId).gte('completed_at', startISO),
      ]);

      if (e1 || e2) {
        setErrorHeatmap((e1?.message || e2?.message) ?? 'Failed to load completion data');
        setItemsByDay(new Map());
      } else {
        const m2 = new Map();
        (tDone || []).forEach(r => {
          const key = toLocalDayKey(r.completed_at);
          m2.set(key, (m2.get(key) || 0) + 1);
        });
        (sDone || []).forEach(r => {
          const key = toLocalDayKey(r.completed_at);
          m2.set(key, (m2.get(key) || 0) + 1);
        });
        setItemsByDay(m2);
      }

      setLoadingHeatmap(false);
    };
    load();
  }, [userId, start0]);

  // Build weeks grid aligned to previous Sunday (GitHub-style)
  const { weeks, maxValue, weekStarts, monthSegments } = useMemo(() => {
    const alignedStart = new Date(start0);
    alignedStart.setDate(alignedStart.getDate() - alignedStart.getDay()); // Sunday start
    const days = [];
    for (let d = new Date(alignedStart); d <= today0; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    const weeksArr = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArr.push(days.slice(i, i + 7));
    }

    const map = mode === 'hours' ? hoursByDay : itemsByDay;
    let maxV = 0; map.forEach(v => { if (v > maxV) maxV = v; });

    const weekStarts = weeksArr.map(w => w[0]);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const segs = [];
    if (weekStarts.length) {
      let curMonth = weekStarts[0].getMonth();
      let segStart = 0;
      for (let i = 1; i < weekStarts.length; i++) {
        const m = weekStarts[i].getMonth();
        if (m !== curMonth) {
          segs.push({ label: monthNames[curMonth], weeks: i - segStart });
          curMonth = m; segStart = i;
        }
      }
      // last
      const lastMonth = weekStarts[weekStarts.length - 1].getMonth();
      segs.push({ label: monthNames[lastMonth], weeks: weekStarts.length - segStart });
    }

    return { weeks: weeksArr, maxValue: maxV || 0, weekStarts, monthSegments: segs };
  }, [start0, today0, mode, hoursByDay, itemsByDay]);

  // Value + level functions (levels 0..4)
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

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="max-w-5xl mx-auto">
      <LeaveGuard when={guardActive} /> {/* ← added */}

      {/* Header */}
      <section className="rounded-3xl p-6 border bg-[var(--bg)]">
        <h1 className="text-3xl font-bold">dashboard</h1>
        <p className="opacity-80 mt-1">welcome, {session?.user?.email}</p>
      </section>

      {/* Focus Timer */}
      <section className="mt-6">
        <div className="border rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-3">focus timer</h2>
          <p className="opacity-80 text-sm mb-4">
            start the timer; do the work; then write what you accomplished.
          </p>
          <Timer onGuardChange={setGuardActive} /> {/* ← only change to Timer usage */}
        </div>
      </section>

      {/* Active tasks tile (expand one at a time) */}
      <section className="mt-4">
        <div className="border rounded-3xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">active tasks</h2>
            <Link to="/tasks" className="underline">add more tasks</Link>
          </div>

          {loadingTasks && <p className="mt-3">loading tasks…</p>}
          {errorTasks && <p className="mt-3 text-red-500">error: {errorTasks}</p>}
          {!loadingTasks && tasks.length === 0 && (
            <p className="mt-3 opacity-80 text-sm">
              no active tasks yet. <Link to="/tasks" className="underline">create some</Link>.
            </p>
          )}

          {!!tasks.length && (
            <ul className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {tasks.map((t) => {
                const list = subsByTask.get(t.id) || [];
                const remaining = list.filter(s => !s.completed_at).length;
                const expanded = expandedTaskId === t.id;

                return (
                  <li key={t.id} className="border rounded-xl">
                    {/* Row header: click to expand/collapse */}
                    <button
                      type="button"
                      className="w-full p-3 flex items-center justify-between gap-3 text-left"
                      onClick={() => setExpandedTaskId(expanded ? null : t.id)}
                      aria-expanded={expanded}
                      aria-controls={`task-panel-${t.id}`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {/* caret */}
                        <svg
                          className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M7 6l6 4-6 4V6z" fill="currentColor" />
                        </svg>
                        <span className="font-medium truncate">{t.title}</span>
                      </div>
                      <span className="text-xs opacity-70 whitespace-nowrap">
                        {remaining > 0
                          ? `${remaining} subtask${remaining > 1 ? 's' : ''} left`
                          : (list.length ? 'all subtasks complete' : 'no subtasks')}
                      </span>
                    </button>

                    {/* Expandable panel (only one open at a time) */}
                    {expanded && (
                      <div
                        id={`task-panel-${t.id}`}
                        className="px-3 pb-3"
                      >
                        {!list.length ? (
                          <p className="text-sm opacity-75">no subtasks yet.</p>
                        ) : (
                          <ul className="mt-2 ml-6 space-y-1">
                            {list.map((s) => {
                              const done = !!s.completed_at;
                              return (
                                <li key={s.id} className="flex items-center gap-2">
                                  <input type="checkbox" checked={done} readOnly disabled className="opacity-70" />
                                  <span className={done ? 'line-through opacity-70' : ''}>{s.title}</span>
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
        </div>
      </section>

      {/* Yearly heatmap */}
      <section className="mt-4">
        <div className="border rounded-3xl p-6 gh-heatmap">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">activity in the last year</h2>

            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setMode('hours')}
                className={`px-3 py-1.5 border rounded-lg hover:border-[var(--border)] ${
                  mode === 'hours' ? 'font-medium opacity-100' : 'opacity-80'
                }`}
              >
                hours / day
              </button>
              <button
                onClick={() => setMode('items')}
                className={`px-3 py-1.5 border rounded-lg hover:border-[var(--border)] ${
                  mode === 'items' ? 'font-medium opacity-100' : 'opacity-80'
                }`}
              >
                tasks / day
              </button>
            </div>
          </div>

          {loadingHeatmap && <p className="mt-3">loading activity…</p>}
          {errorHeatmap && <p className="mt-3 text-red-500">error: {errorHeatmap}</p>}

          {!loadingHeatmap && (
            <>
              {/* horizontal scroll wrapper to avoid overflow on small screens */}
              <div className="mt-4 overflow-x-auto">
                <div className="w-max">
                  {/* Month labels */}
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
                    {/* Day labels */}
                    <div className="gh-days">
                      {[0,1,2,3,4,5,6].map((d) => (
                        <div key={d} className="row">
                          {(d === 0 && 'Mon') || (d === 2 && 'Wed') || (d === 4 && 'Fri') || ''}
                        </div>
                      ))}
                    </div>

                    {/* Grid (weeks x days) */}
                    <div className="gh-grid">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="gh-week">
                          {week.map((d, di) => {
                            const v = valueForDay(d);
                            const lvl = levelForValue(v);
                            const title =
                              mode === 'hours'
                                ? `${d.toLocaleDateString()}: ${v.toFixed(2)}h`
                                : `${d.toLocaleDateString()}: ${v} item${v === 1 ? '' : 's'}`;
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

              {/* Legend */}
              <div className="mt-3 flex items-center gap-2 text-xs opacity-80">
                <span>less</span>
                {[0,1,2,3,4].map(l => (
                  <span key={l} className={`gh-cell ${l ? `gh-lvl-${l}` : ''}`} />
                ))}
                <span>more</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Helpful cards */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="p-4 border rounded-2xl">
          <h3 className="font-semibold mb-1">how it works</h3>
          <p className="opacity-80 text-sm">
            start a session; focus; then jot a short note. it'll appear in history.
          </p>
        </div>

        <div className="p-4 border rounded-2xl">
          <h3 className="font-semibold mb-1">history</h3>
          <p className="opacity-80 text-sm">
            review past sessions, durations, and notes.
          </p>
          <Link to="/history" className="inline-block mt-2 border px-3 py-1.5 rounded-lg hover:border-[var(--border)]">
            open history
          </Link>
        </div>

        <div className="p-4 border rounded-2xl">
          <h3 className="font-semibold mb-1">tasks</h3>
          <p className="opacity-80 text-sm">
            create tasks and subtasks you can mark as completed after each session.
          </p>
          <Link to="/tasks" className="inline-block mt-2 border px-3 py-1.5 rounded-lg hover:border-[var(--border)]">
            open tasks
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
