// History.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/format';

const History = () => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const [entries, setEntries] = useState([]);
  const [links, setLinks] = useState([]); // entry_tasks
  const [tasksById, setTasksById] = useState(new Map());
  const [subsById, setSubsById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // load entries
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      // 1) entries
      const { data: es, error: e0 } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
      if (e0) { setError(e0.message); setLoading(false); return; }
      setEntries(es || []);

      // 2) links
      const ids = (es || []).map(e => e.id);
      if (!ids.length) { setLinks([]); setLoading(false); return; }

      const { data: lnk, error: e1 } = await supabase
        .from('entry_tasks')
        .select('*')
        .in('entry_id', ids);
      if (e1) { setError(e1.message); setLoading(false); return; }
      setLinks(lnk || []);

      // 3) fetch task/subtask titles for referenced ids
      const taskIds = Array.from(new Set((lnk || []).map(r => r.task_id).filter(Boolean)));
      const subIds = Array.from(new Set((lnk || []).map(r => r.subtask_id).filter(Boolean)));

      const [{ data: trows }, { data: srows }] = await Promise.all([
        taskIds.length ? supabase.from('tasks').select('id,title').in('id', taskIds) : Promise.resolve({ data: [] }),
        subIds.length ? supabase.from('subtasks').select('id,task_id,title').in('id', subIds) : Promise.resolve({ data: [] }),
      ]);

      setTasksById(new Map((trows || []).map(t => [t.id, t])));
      setSubsById(new Map((srows || []).map(s => [s.id, s])));

      setLoading(false);
    };
    load();
  }, [userId]);

  if (!session) return null;

  // Group entries by day
  const dayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const linksByEntry = useMemo(() => {
    const m = new Map();
    links.forEach(l => {
      if (!m.has(l.entry_id)) m.set(l.entry_id, []);
      m.get(l.entry_id).push(l);
    });
    return m;
  }, [links]);

  const grouped = useMemo(() => {
    const map = new Map();
    entries.forEach(e => {
      const d = new Date(e.started_at);
      const key = dayFormatter.format(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries()); // [ [day, entries[]], ... ]
  }, [entries]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">history</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !entries.length && <p>No entries yet.</p>}

      <div className="space-y-8">
        {grouped.map(([day, items]) => (
          <section key={day}>
            <h2 className="text-lg font-semibold mb-3 opacity-90">{day}</h2>
            <div className="space-y-3">
              {items.map((e) => {
                const duration = formatDuration(e.duration_seconds);
                const started = new Date(e.started_at);
                const ended = new Date(e.ended_at);
                const timeRange = `${started.toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit',
                })}–${ended.toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit',
                })}`;

                // resolve tasks for this entry
                const l = linksByEntry.get(e.id) || [];
                const itemsList = l.map(x => {
                  const t = tasksById.get(x.task_id);
                  const s = x.subtask_id ? subsById.get(x.subtask_id) : null;
                  return {
                    key: `${x.task_id}:${x.subtask_id || 'none'}`,
                    taskTitle: t?.title || '(Task)',
                    subTitle: s?.title || null,
                  };
                });

                return (
                  <div key={e.id} className="p-4 border rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm opacity-80">{timeRange}</div>
                      <div className="font-semibold">{duration}</div>
                    </div>
                    {e.note && <p className="mt-2 whitespace-pre-wrap">{e.note}</p>}

                    {!!itemsList.length && (
                      <div className="mt-3">
                        <div className="text-sm font-semibold opacity-90 mb-1">Completed</div>
                        <ul className="list-disc list-inside opacity-90">
                          {itemsList.map(it => (
                            <li key={it.key}>
                              {it.taskTitle}
                              {it.subTitle ? <> — <span className="opacity-90">{it.subTitle}</span></> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default History;
