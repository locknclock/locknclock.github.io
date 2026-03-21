import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/format';

const History = () => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const [entries, setEntries] = useState([]);
  const [links, setLinks] = useState([]);
  const [tasksById, setTasksById] = useState(new Map());
  const [subsById, setSubsById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: es, error: e0 } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (e0) {
        setError(e0.message);
        setLoading(false);
        return;
      }

      setEntries(es || []);

      const entryIds = (es || []).map((e) => e.id);
      if (!entryIds.length) {
        setLinks([]);
        setTasksById(new Map());
        setSubsById(new Map());
        setLoading(false);
        return;
      }

      const { data: lnk, error: e1 } = await supabase
        .from('entry_tasks')
        .select('*')
        .in('entry_id', entryIds);

      if (e1) {
        setError(e1.message);
        setLoading(false);
        return;
      }

      setLinks(lnk || []);

      const taskIds = Array.from(
        new Set((lnk || []).map((r) => r.task_id).filter(Boolean))
      );
      const subIds = Array.from(
        new Set((lnk || []).map((r) => r.subtask_id).filter(Boolean))
      );

      const [{ data: trows }, { data: srows }] = await Promise.all([
        taskIds.length
          ? supabase.from('tasks').select('id,title').in('id', taskIds)
          : Promise.resolve({ data: [] }),
        subIds.length
          ? supabase.from('subtasks').select('id,task_id,title').in('id', subIds)
          : Promise.resolve({ data: [] }),
      ]);

      setTasksById(new Map((trows || []).map((t) => [t.id, t])));
      setSubsById(new Map((srows || []).map((s) => [s.id, s])));
      setLoading(false);
    };

    load();
  }, [userId]);

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const linksByEntry = useMemo(() => {
    const m = new Map();
    links.forEach((l) => {
      if (!m.has(l.entry_id)) m.set(l.entry_id, []);
      m.get(l.entry_id).push(l);
    });
    return m;
  }, [links]);

  const grouped = useMemo(() => {
    const map = new Map();

    entries.forEach((e) => {
      const d = new Date(e.started_at);
      const key = dayFormatter.format(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });

    return Array.from(map.entries());
  }, [entries, dayFormatter]);

  if (!session) return null;

  return (
    <main className="app-shell">
      <header className="mb-12">
        <h1 className="page-title">history</h1>
        <p className="meta-text mt-3">
          previous focus sessions, notes, and completed work.
        </p>
      </header>

      {loading && <p className="meta-text">loading…</p>}
      {error && <p className="text-sm text-red-400">error: {error}</p>}

      {!loading && !entries.length && (
        <section className="mt-10">
          <div className="mb-4">
            <p className="section-title">session log</p>
          </div>
          <div className="divider-subtle" />
          <p className="meta-text pt-5">no entries yet.</p>
        </section>
      )}

      {!!grouped.length && (
        <div className="space-y-12">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <div className="mb-4">
                <p className="section-title">{day}</p>
              </div>

              <div className="divider-subtle" />

              <div className="mt-4 space-y-3">
                {items.map((e) => {
                  const duration = formatDuration(e.duration_seconds);
                  const started = new Date(e.started_at);
                  const ended = new Date(e.ended_at);

                  const timeRange = `${started.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}–${ended.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`;

                  const l = linksByEntry.get(e.id) || [];
                  const itemsList = l.map((x) => {
                    const t = tasksById.get(x.task_id);
                    const s = x.subtask_id ? subsById.get(x.subtask_id) : null;

                    return {
                      key: `${x.task_id}:${x.subtask_id || 'none'}`,
                      taskTitle: t?.title || '(Task)',
                      subTitle: s?.title || null,
                    };
                  });

                  return (
                    <article key={e.id} className="surface-row p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="meta-text">{timeRange}</p>
                          <p className="mt-2 text-lg font-medium text-[var(--fg)]">
                            {duration}
                          </p>
                        </div>

                        <div className="meta-text-dim">
                          saved {ended.toLocaleDateString()}
                        </div>
                      </div>

                      {e.note && (
                        <div className="mt-5">
                          <p className="section-title">brief review</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">
                            {e.note}
                          </p>
                        </div>
                      )}

                      {!!itemsList.length && (
                        <div className="mt-5">
                          <p className="section-title">completed</p>
                          <ul className="mt-3 space-y-2">
                            {itemsList.map((it) => (
                              <li
                                key={it.key}
                                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80"
                              >
                                <span className="text-[var(--fg)]">
                                  {it.taskTitle}
                                </span>
                                {it.subTitle ? (
                                  <>
                                    <span className="text-white/30">—</span>
                                    <span className="text-white/60">
                                      {it.subTitle}
                                    </span>
                                  </>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};

export default History;