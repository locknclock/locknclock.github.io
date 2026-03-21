// Timer.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/format';

const Timer = ({ onGuardChange }) => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);   // last resume/start timestamp (ms)
  const [firstStart, setFirstStart] = useState(null); // first start of this session (Date)
  const [baseElapsed, setBaseElapsed] = useState(0);  // ms accumulated before current run
  const [elapsed, setElapsed] = useState(0);          // live ms (baseElapsed + now - startTime while running)

  // Review note
  const [needsNote, setNeedsNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Data for task selection
  const [tasks, setTasks] = useState([]);   // only ACTIVE tasks (completed_at IS NULL)
  const [subs, setSubs] = useState([]);     // all subtasks for those tasks (both active & completed)
  const [preCompletedSubs, setPreCompletedSubs] = useState(new Set()); // subtasks with completed_at != null

  // Selection for THIS session
  const [selectedSubs, setSelectedSubs] = useState(new Set());             // subtask IDs chosen now
  const [selectedNoSubTasks, setSelectedNoSubTasks] = useState(new Set()); // active tasks with NO subtasks chosen now

  // Saved popup
  const [showSaved, setShowSaved] = useState(false);
  const [savedInfo, setSavedInfo] = useState(null); // { started, ended, durationSeconds, note, groups: [{taskTitle, subtasks:[]}] }

  const intervalRef = useRef(null);
  const taskRefs = useRef({}); // to set checkbox.indeterminate

  // ========= NEW: notify dashboard to guard navigation when timing =========
  useEffect(() => {
    if (typeof onGuardChange === 'function') {
      onGuardChange(isRunning || isPaused);
    }
    return () => {
      if (typeof onGuardChange === 'function') onGuardChange(false);
    };
  }, [isRunning, isPaused, onGuardChange]);
  // ========================================================================

  // Load ONLY active tasks, and for those tasks load ALL of their subtasks (active + completed)
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

    const ids = activeTasks.map(x => x.id);
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
    setPreCompletedSubs(new Set((s || []).filter(st => !!st.completed_at).map(st => st.id)));
  };

  useEffect(() => { loadTasks(); /* eslint-disable-next-line */ }, [userId]);

  // Tick while running
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
    subs.forEach(s => {
      if (!m.has(s.task_id)) m.set(s.task_id, []);
      m.get(s.task_id).push(s);
    });
    return m; // Map<task_id, Subtask[]>
  }, [subs]);

  const allSubIdsForTask = (taskId) => (subsByTask.get(taskId) || []).map(s => s.id);
  const isSubCheckedDisplay = (id) => preCompletedSubs.has(id) || selectedSubs.has(id);

  const areAllSubsCheckedDisplay = (taskId) => {
    const ids = allSubIdsForTask(taskId);
    return ids.length > 0 && ids.every(id => isSubCheckedDisplay(id));
  };
  const areSomeSubsCheckedDisplay = (taskId) => {
    const ids = allSubIdsForTask(taskId);
    return ids.some(id => isSubCheckedDisplay(id)) && !areAllSubsCheckedDisplay(taskId);
  };

  // Keep parent checkbox "indeterminate" when some (but not all) subtasks are checked (including pre-completed)
  useEffect(() => {
    tasks.forEach(t => {
      const ref = taskRefs.current[t.id];
      if (!ref) return;
      const subCount = (subsByTask.get(t.id) || []).length;
      ref.indeterminate = subCount > 0 ? areSomeSubsCheckedDisplay(t.id) : false;
    });
  }, [tasks, subsByTask, selectedSubs, preCompletedSubs]);

  // --- Controls ---
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
    setBaseElapsed(elapsed); // lock in what we have so far
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setNeedsNote(true); // show review UI
  };

  // Clicking a TASK:
  //  • If it HAS subtasks → (de)select ALL of its NOT-YET-completed subtasks.
  //    (Already-completed subtasks remain checked & disabled.)
  //  • If it has NO subtasks → toggle parent-only selection set.
  const toggleTask = (taskId) => {
    const subIds = allSubIdsForTask(taskId);
    if (subIds.length > 0) {
      const mutableIds = subIds.filter(id => !preCompletedSubs.has(id));
      const allMutableSelected = mutableIds.length > 0 && mutableIds.every(id => selectedSubs.has(id));
      setSelectedSubs(prev => {
        const n = new Set(prev);
        if (allMutableSelected) {
          mutableIds.forEach(id => n.delete(id));
        } else {
          mutableIds.forEach(id => n.add(id));
        }
        return n;
      });
      // Ensure parent-only set is NOT used for tasks with subtasks
      setSelectedNoSubTasks(prev => {
        const n = new Set(prev);
        n.delete(taskId);
        return n;
      });
    } else {
      // No subtasks: toggle parent-only selection
      setSelectedNoSubTasks(prev => {
        const n = new Set(prev);
        if (n.has(taskId)) n.delete(taskId); else n.add(taskId);
        return n;
      });
    }
  };

  // Clicking a SUBTASK toggles just that subtask (unless it's already completed)
  const toggleSub = (subId, isPreCompleted) => {
    if (isPreCompleted) return; // disabled in UI, but guard anyway
    setSelectedSubs(prev => {
      const n = new Set(prev);
      if (n.has(subId)) n.delete(subId); else n.add(subId);
      return n;
    });
  };

  const buildSummaryGroups = () => {
    const taskById = new Map(tasks.map(t => [t.id, t]));
    const subById = new Map(subs.map(s => [s.id, s]));
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
    const durationSeconds = Math.round(elapsed / 1000); // use accumulated time

    setSaving(true);

    // 1) Save the journal entry
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

    // 2) Link tasks/subtasks to the entry (only the things completed THIS session)
    const subById = new Map(subs.map(s => [s.id, s]));
    const rows = [];

    selectedSubs.forEach(sid => {
      const s = subById.get(sid);
      if (s) rows.push({ entry_id: entry.id, task_id: s.task_id, subtask_id: s.id });
    });

    selectedNoSubTasks.forEach(tid => {
      rows.push({ entry_id: entry.id, task_id: tid, subtask_id: null });
    });

    if (rows.length) {
      const { error: e2 } = await supabase.from('entry_tasks').insert(rows);
      if (e2) {
        setSaving(false);
        return alert(e2.message || 'Saved entry but failed to link tasks');
      }
    }

    // 3) Mark completion timestamps for items finished THIS session
    const endedISO = endedAt.toISOString();

    if (selectedSubs.size) {
      await supabase
        .from('subtasks')
        .update({ completed_at: endedISO })
        .in('id', Array.from(selectedSubs))
        .eq('user_id', userId);
      // trigger sync_task_completion() may close parent tasks as needed
    }

    if (selectedNoSubTasks.size) {
      await supabase
        .from('tasks')
        .update({ completed_at: endedISO })
        .in('id', Array.from(selectedNoSubTasks))
        .eq('user_id', userId);
    }

    // 4) Build and show in-app summary popup BEFORE resetting state
    const summary = {
      started: startedAt,
      ended: endedAt,
      durationSeconds,
      note: note.trim(),
      groups: buildSummaryGroups(),
    };
    setSavedInfo(summary);
    setShowSaved(true);

    // 5) Refresh active tasks/subtasks so completed tasks disappear and newly-completed subtasks render struck-through
    await loadTasks();

    // 6) Reset local state for a fresh session
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
      <div className="mt-6 border rounded-2xl p-4 max-w-xl bg-[var(--bg)] text-[var(--fg)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-4xl font-bold tracking-wide">{timeStr}</div>

          {/* Buttons: wrap on small screens */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isRunning && !isPaused && !needsNote && (
              <button
                onClick={handleStart}
                className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
              >
                Start
              </button>
            )}

            {isRunning && !needsNote && (
              <>
                <button
                  onClick={handlePause}
                  className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
                >
                  Pause
                </button>
                <button
                  onClick={handleStop}
                  className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
                >
                  Stop
                </button>
              </>
            )}

            {isPaused && !needsNote && (
              <>
                <button
                  onClick={handleStart} // resume
                  className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
                >
                  Resume
                </button>
                <button
                  onClick={handleStop}
                  className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {needsNote && (
          <div className="mt-4">
            <label htmlFor="note" className="block mb-2 text-sm opacity-80">Brief review</label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 border rounded-lg bg-transparent"
              placeholder="What did you accomplish?"
            />

            {/* Completed tasks */}
            <div className="mt-4">
              <label className="text-sm opacity-80">Mark tasks/subtasks completed</label>
              {!tasks.length && (
                <p className="opacity-70 text-sm mt-2">No active tasks right now.</p>
              )}

              <div className="mt-2 space-y-3">
                {tasks.map(t => {
                  const list = subsByTask.get(t.id) || [];
                  const hasSubs = list.length > 0;
                  const checked = hasSubs
                    ? areAllSubsCheckedDisplay(t.id)
                    : selectedNoSubTasks.has(t.id);

                  return (
                    <div key={t.id} className="border rounded-lg p-3">
                      <label className="flex items-center gap-2">
                        <input
                          ref={(el) => (taskRefs.current[t.id] = el)}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(t.id)}
                        />
                        <span className="font-semibold">
                          {t.title}
                          {hasSubs && areSomeSubsCheckedDisplay(t.id) && (
                            <span className="ml-2 text-xs opacity-70">(some selected)</span>
                          )}
                        </span>
                      </label>

                      {hasSubs && (
                        <div className="mt-2 ml-6 space-y-1">
                          {list.map(s => {
                            const pre = preCompletedSubs.has(s.id);
                            const isChecked = pre || selectedSubs.has(s.id);
                            return (
                              <label key={s.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={pre}
                                  onChange={() => toggleSub(s.id, pre)}
                                />
                                <span className={pre ? 'opacity-70 line-through' : 'opacity-90'}>
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
            </div>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 border rounded-lg hover:border-[var(--border)] disabled:opacity-60 w-full sm:w-auto"
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved popup */}
      {showSaved && savedInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-[min(560px,92vw)] border rounded-2xl p-6 bg-[var(--bg)] text-[var(--fg)]">
            <h3 className="text-xl font-semibold">Entry saved</h3>
            <p className="opacity-80 text-sm mt-1">
              {savedInfo.started.toLocaleString()} → {savedInfo.ended.toLocaleTimeString()} ·{' '}
              {formatDuration(savedInfo.durationSeconds)}
            </p>

            {savedInfo.note && (
              <div className="mt-3">
                <div className="text-sm font-semibold opacity-90 mb-1">Brief review</div>
                <p className="whitespace-pre-wrap">{savedInfo.note}</p>
              </div>
            )}

            {!!savedInfo.groups.length && (
              <div className="mt-3">
                <div className="text-sm font-semibold opacity-90 mb-1">Completed</div>
                <ul className="space-y-2">
                  {savedInfo.groups.map((g, idx) => (
                    <li key={idx} className="border rounded-lg p-3">
                      <div className="font-semibold">{g.taskTitle}</div>
                      {g.subtasks?.length > 0 && (
                        <ul className="list-disc list-inside opacity-90 mt-1">
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

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => { setShowSaved(false); setSavedInfo(null); }}
                className="px-4 py-2 border rounded-lg hover:border-[var(--border)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Timer;
