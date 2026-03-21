import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/format';

const Timer = ({ onGuardChange }) => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [firstStart, setFirstStart] = useState(null);
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const [needsNote, setNeedsNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [preCompletedSubs, setPreCompletedSubs] = useState(new Set());

  const [selectedSubs, setSelectedSubs] = useState(new Set());
  const [selectedNoSubTasks, setSelectedNoSubTasks] = useState(new Set());

  const [showSaved, setShowSaved] = useState(false);
  const [savedInfo, setSavedInfo] = useState(null);

  const intervalRef = useRef(null);
  const taskRefs = useRef({});

  useEffect(() => {
    if (typeof onGuardChange === 'function') {
      onGuardChange(isRunning || isPaused);
    }

    return () => {
      if (typeof onGuardChange === 'function') onGuardChange(false);
    };
  }, [isRunning, isPaused, onGuardChange]);

  const loadTasks = async () => {
    if (!userId) return;

    const { data: t, error: te } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .is('completed_at', null)
      .order('created_at', { ascending: true });

    if (te) {
      console.error(te);
      setTasks([]);
      setSubs([]);
      setPreCompletedSubs(new Set());
      return;
    }

    const activeTasks = t || [];
    setTasks(activeTasks);

    if (!activeTasks.length) {
      setSubs([]);
      setPreCompletedSubs(new Set());
      return;
    }

    const ids = activeTasks.map((x) => x.id);
    const { data: s, error: se } = await supabase
      .from('subtasks')
      .select('*')
      .eq('user_id', userId)
      .in('task_id', ids)
      .order('created_at', { ascending: true });

    if (se) {
      console.error(se);
      setSubs([]);
      setPreCompletedSubs(new Set());
      return;
    }

    setSubs(s || []);
    setPreCompletedSubs(
      new Set((s || []).filter((st) => !!st.completed_at).map((st) => st.id))
    );
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (isRunning && startTime != null) {
      intervalRef.current = setInterval(() => {
        setElapsed(baseElapsed + (Date.now() - startTime));
      }, 250);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, startTime, baseElapsed]);

  const subsByTask = useMemo(() => {
    const m = new Map();
    subs.forEach((s) => {
      if (!m.has(s.task_id)) m.set(s.task_id, []);
      m.get(s.task_id).push(s);
    });
    return m;
  }, [subs]);

  const allSubIdsForTask = (taskId) =>
    (subsByTask.get(taskId) || []).map((s) => s.id);

  const isSubCheckedDisplay = (id) =>
    preCompletedSubs.has(id) || selectedSubs.has(id);

  const areAllSubsCheckedDisplay = (taskId) => {
    const ids = allSubIdsForTask(taskId);
    return ids.length > 0 && ids.every((id) => isSubCheckedDisplay(id));
  };

  const areSomeSubsCheckedDisplay = (taskId) => {
    const ids = allSubIdsForTask(taskId);
    return (
      ids.some((id) => isSubCheckedDisplay(id)) &&
      !areAllSubsCheckedDisplay(taskId)
    );
  };

  useEffect(() => {
    tasks.forEach((t) => {
      const ref = taskRefs.current[t.id];
      if (!ref) return;
      const subCount = (subsByTask.get(t.id) || []).length;
      ref.indeterminate =
        subCount > 0 ? areSomeSubsCheckedDisplay(t.id) : false;
    });
  }, [tasks, subsByTask, selectedSubs, preCompletedSubs]);

  const startNew = () => {
    setFirstStart(new Date());
    setStartTime(Date.now());
    setBaseElapsed(0);
    setElapsed(0);
    setIsRunning(true);
    setIsPaused(false);

    setNeedsNote(false);
    setNote('');
    setSelectedSubs(new Set());
    setSelectedNoSubTasks(new Set());
  };

  const resume = () => {
    setStartTime(Date.now());
    setIsRunning(true);
    setIsPaused(false);
  };

  const handleStart = () => {
    if (isPaused) return resume();
    return startNew();
  };

  const handlePause = () => {
    if (!isRunning) return;
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(true);
    setBaseElapsed(elapsed);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setNeedsNote(true);
  };

  const toggleTask = (taskId) => {
    const subIds = allSubIdsForTask(taskId);

    if (subIds.length > 0) {
      const mutableIds = subIds.filter((id) => !preCompletedSubs.has(id));
      const allMutableSelected =
        mutableIds.length > 0 && mutableIds.every((id) => selectedSubs.has(id));

      setSelectedSubs((prev) => {
        const n = new Set(prev);
        if (allMutableSelected) {
          mutableIds.forEach((id) => n.delete(id));
        } else {
          mutableIds.forEach((id) => n.add(id));
        }
        return n;
      });

      setSelectedNoSubTasks((prev) => {
        const n = new Set(prev);
        n.delete(taskId);
        return n;
      });
    } else {
      setSelectedNoSubTasks((prev) => {
        const n = new Set(prev);
        if (n.has(taskId)) n.delete(taskId);
        else n.add(taskId);
        return n;
      });
    }
  };

  const toggleSub = (subId, isPreCompleted) => {
    if (isPreCompleted) return;

    setSelectedSubs((prev) => {
      const n = new Set(prev);
      if (n.has(subId)) n.delete(subId);
      else n.add(subId);
      return n;
    });
  };

  const buildSummaryGroups = () => {
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const subById = new Map(subs.map((s) => [s.id, s]));
    const groupsMap = new Map();

    selectedSubs.forEach((sid) => {
      const s = subById.get(sid);
      if (!s) return;

      if (!groupsMap.has(s.task_id)) {
        const t = taskById.get(s.task_id);
        groupsMap.set(s.task_id, {
          taskTitle: t?.title || '(Task)',
          subtasks: [],
        });
      }

      groupsMap.get(s.task_id).subtasks.push(s.title);
    });

    selectedNoSubTasks.forEach((tid) => {
      if (!groupsMap.has(tid)) {
        const t = taskById.get(tid);
        if (!t) return;

        groupsMap.set(tid, {
          taskTitle: t.title || '(Task)',
          subtasks: [],
        });
      }
    });

    return Array.from(groupsMap.values());
  };

  const handleSave = async () => {
    if (!userId) return;

    const endedAt = new Date();
    const startedAt = firstStart || new Date(endedAt.getTime() - elapsed);
    const durationSeconds = Math.round(elapsed / 1000);

    setSaving(true);

    const { data: entry, error: e1 } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        note: note.trim(),
      })
      .select()
      .single();

    if (e1) {
      setSaving(false);
      return alert(e1.message || 'Failed to save entry');
    }

    const subById = new Map(subs.map((s) => [s.id, s]));
    const rows = [];

    selectedSubs.forEach((sid) => {
      const s = subById.get(sid);
      if (s) rows.push({ entry_id: entry.id, task_id: s.task_id, subtask_id: s.id });
    });

    selectedNoSubTasks.forEach((tid) => {
      rows.push({ entry_id: entry.id, task_id: tid, subtask_id: null });
    });

    if (rows.length) {
      const { error: e2 } = await supabase.from('entry_tasks').insert(rows);
      if (e2) {
        setSaving(false);
        return alert(e2.message || 'Saved entry but failed to link tasks');
      }
    }

    const endedISO = endedAt.toISOString();

    if (selectedSubs.size) {
      await supabase
        .from('subtasks')
        .update({ completed_at: endedISO })
        .in('id', Array.from(selectedSubs))
        .eq('user_id', userId);
    }

    if (selectedNoSubTasks.size) {
      await supabase
        .from('tasks')
        .update({ completed_at: endedISO })
        .in('id', Array.from(selectedNoSubTasks))
        .eq('user_id', userId);
    }

    const summary = {
      started: startedAt,
      ended: endedAt,
      durationSeconds,
      note: note.trim(),
      groups: buildSummaryGroups(),
    };

    setSavedInfo(summary);
    setShowSaved(true);

    await loadTasks();

    setSaving(false);
    setNeedsNote(false);
    setNote('');
    setStartTime(null);
    setFirstStart(null);
    setBaseElapsed(0);
    setElapsed(0);
    setIsRunning(false);
    setIsPaused(false);
    setSelectedSubs(new Set());
    setSelectedNoSubTasks(new Set());
  };

  const handleCancel = () => {
    setNeedsNote(false);
    setNote('');
  };

  const timeStr = formatDuration(Math.floor(elapsed / 1000));

  return (
    <>
      <div className="surface-row overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-title">session</p>
              <div className="mt-3 text-5xl font-semibold tracking-tight text-[var(--fg)] sm:text-6xl">
                {timeStr}
              </div>
              <p className="meta-text mt-3">
                {needsNote
                  ? 'review and save this session'
                  : isRunning
                  ? 'running'
                  : isPaused
                  ? 'paused'
                  : 'ready'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isRunning && !isPaused && !needsNote && (
                <button type="button" onClick={handleStart} className="button-primary">
                  start
                </button>
              )}

              {isRunning && !needsNote && (
                <>
                  <button
                    type="button"
                    onClick={handlePause}
                    className="button-subtle"
                  >
                    pause
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="button-primary"
                  >
                    stop
                  </button>
                </>
              )}

              {isPaused && !needsNote && (
                <>
                  <button
                    type="button"
                    onClick={handleStart}
                    className="button-primary"
                  >
                    resume
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="button-subtle"
                  >
                    stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {needsNote && (
          <div className="row-divider px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div>
                <p className="section-title">brief review</p>
                <textarea
                  id="note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input-minimal mt-3 min-h-[120px] resize-y"
                  placeholder="what did you accomplish?"
                />
              </div>

              <div>
                <p className="section-title">mark completed</p>

                {!tasks.length && (
                  <p className="meta-text mt-3">no active tasks right now.</p>
                )}

                {!!tasks.length && (
                  <div className="mt-3 max-h-[24rem] space-y-3 overflow-auto pr-1">
                    {tasks.map((t) => {
                      const list = subsByTask.get(t.id) || [];
                      const hasSubs = list.length > 0;
                      const checked = hasSubs
                        ? areAllSubsCheckedDisplay(t.id)
                        : selectedNoSubTasks.has(t.id);

                      return (
                        <div key={t.id} className="surface-row p-3">
                          <label className="flex items-center gap-3">
                            <input
                              ref={(el) => (taskRefs.current[t.id] = el)}
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTask(t.id)}
                              style={{ accentColor: 'var(--link)' }}
                              className="shrink-0"
                            />
                            <span className="task-title">
                              {t.title}
                              {hasSubs && areSomeSubsCheckedDisplay(t.id) && (
                                <span className="ml-2 text-[11px] text-[var(--muted)]">
                                  some selected
                                </span>
                              )}
                            </span>
                          </label>

                          {hasSubs && (
                            <div className="mt-3 ml-7 space-y-2">
                              {list.map((s) => {
                                const pre = preCompletedSubs.has(s.id);
                                const isChecked = pre || selectedSubs.has(s.id);

                                return (
                                  <label
                                    key={s.id}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={pre}
                                      onChange={() => toggleSub(s.id, pre)}
                                      style={{ accentColor: 'var(--link)' }}
                                      className="shrink-0"
                                    />
                                    <span
                                      className={
                                        pre
                                          ? 'text-white/40 line-through'
                                          : 'text-white/80'
                                      }
                                    >
                                      {s.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="button-primary disabled:opacity-60"
              >
                {saving ? 'saving…' : 'save entry'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="button-ghost"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {showSaved && savedInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div
            className="w-full max-w-2xl rounded-2xl border p-6"
            style={{
              background: 'var(--surface-1)',
              borderColor: 'var(--border)',
              boxShadow: '0 18px 60px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-title">entry saved</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--fg)]">
                  session recorded
                </h3>
                <p className="meta-text mt-2">
                  {savedInfo.started.toLocaleString()} →{' '}
                  {savedInfo.ended.toLocaleTimeString()} ·{' '}
                  {formatDuration(savedInfo.durationSeconds)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSaved(false);
                  setSavedInfo(null);
                }}
                className="button-ghost"
              >
                close
              </button>
            </div>

            {savedInfo.note && (
              <div className="mt-5">
                <p className="section-title">brief review</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-white/85">
                  {savedInfo.note}
                </p>
              </div>
            )}

            {!!savedInfo.groups.length && (
              <div className="mt-5">
                <p className="section-title">completed</p>
                <ul className="mt-3 space-y-3">
                  {savedInfo.groups.map((g, idx) => (
                    <li key={idx} className="surface-row p-3">
                      <div className="task-title">{g.taskTitle}</div>

                      {g.subtasks?.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                          {g.subtasks.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Timer;