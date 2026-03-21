import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

/** Task card:
 *  - single-column card
 *  - clickable header toggles dropdown with subtasks
 *  - edit/delete task
 *  - add/edit/delete subtasks
 *  - checkbox to complete subtasks
 *  - mark-done for tasks with no subtasks
 *  - reopen button for inactive tasks
 */
const TaskCard = ({
  task,
  subs,
  isInactive = false,
  onAddSubtask,
  onToggleSubtaskDone,
  onUpdateTaskTitle,
  onUpdateSubtaskTitle,
  onToggleTaskDoneNoSubs,
  onReopenTask,
  onDeleteTask,
  onDeleteSubtask,
}) => {
  const [newSub, setNewSub] = useState('');
  const [editingTask, setEditingTask] = useState(false);
  const [taskEditValue, setTaskEditValue] = useState(task.title);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isOpen, setIsOpen] = useState(false); // dropdown collapsed by default

  useEffect(() => {
    if (!editingTask) setTaskEditValue(task.title);
  }, [task.title, editingTask]);

  const hasSubs = subs.length > 0;
  const incompleteCount = subs.filter((s) => !s.completed_at).length;

  const startTaskEdit = () => {
    setEditingTask(true);
    setTaskEditValue(task.title);
  };

  const saveTaskEdit = async () => {
    const v = taskEditValue.trim();
    if (!v || v === task.title) {
      setEditingTask(false);
      setTaskEditValue(task.title);
      return;
    }
    await onUpdateTaskTitle(task, v);
    setEditingTask(false);
  };

  const cancelTaskEdit = () => {
    setEditingTask(false);
    setTaskEditValue(task.title);
  };

  const startEdit = (sub) => {
    setEditingId(sub.id);
    setEditValue(sub.title);
  };

  const saveEdit = async (sub) => {
    const v = editValue.trim();
    if (!v || v === sub.title) {
      setEditingId(null);
      return;
    }
    await onUpdateSubtaskTitle(sub, v);
    setEditingId(null);
  };

  const handleHeaderKeyDown = (e) => {
    if (editingTask) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="border rounded-2xl">
      {/* Header row: behaves like the dashboard's active-tasks accordion */}
      <div
        role="button"
        tabIndex={editingTask ? -1 : 0}
        onClick={() => {
          if (!editingTask) setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleHeaderKeyDown}
        className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex items-center gap-2 flex-1">
          {/* caret */}
          <svg
            className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M7 6l6 4-6 4V6z" fill="currentColor" />
          </svg>

          {editingTask ? (
            <input
              autoFocus
              className="flex-1 min-w-0 bg-transparent border rounded-lg p-2 text-sm font-semibold"
              value={taskEditValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setTaskEditValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') saveTaskEdit();
                if (e.key === 'Escape') cancelTaskEdit();
              }}
            />
          ) : (
            <span className="font-semibold truncate" title={task.title}>
              {task.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!editingTask && hasSubs && (
            <span className="text-xs opacity-70 whitespace-nowrap">
              {incompleteCount > 0
                ? `${incompleteCount} subtask${incompleteCount > 1 ? 's' : ''} left`
                : 'all subtasks complete'}
            </span>
          )}

          {!editingTask && !hasSubs && !isInactive && (
            <span className="text-xs opacity-70 whitespace-nowrap">
              no subtasks
            </span>
          )}

          {editingTask ? (
            <>
              <button
                type="button"
                className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)] text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  saveTaskEdit();
                }}
              >
                save
              </button>
              <button
                type="button"
                className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)] text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelTaskEdit();
                }}
              >
                cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)] text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  startTaskEdit();
                }}
              >
                edit
              </button>

              {!hasSubs && !isInactive && (
                <button
                  type="button"
                  className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)] text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTaskDoneNoSubs(task);
                  }}
                >
                  {task.completed_at ? 'Reopen' : 'mark done'}
                </button>
              )}

              {isInactive && (
                <button
                  type="button"
                  className="px-3 py-1.5 border rounded-lg hover:border-[var(--border)] text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReopenTask(task);
                  }}
                >
                  reopen
                </button>
              )}

              <button
                type="button"
                className="px-3 py-1.5 border rounded-lg hover:border-red-400 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task);
                }}
              >
                delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dropdown body: subtasks + controls */}
      {isOpen && (
        <div className="px-3 pb-3">
          {/* Subtasks list */}
          {hasSubs ? (
            <ul className="mt-1 space-y-1">
              {subs.map((s) => {
                const isEditing = editingId === s.id;
                const done = !!s.completed_at;

                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    {/* checkbox */}
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggleSubtaskDone(s)}
                      className="shrink-0"
                    />

                    {/* title or editor */}
                    {isEditing ? (
                      <input
                        autoFocus
                        className="flex-1 min-w-0 bg-transparent border rounded-lg p-1 px-2 text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(s);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`flex-1 min-w-0 break-words text-sm ${
                          done ? 'opacity-70 line-through' : ''
                        }`}
                        title={s.title}
                      >
                        {s.title}
                      </span>
                    )}

                    {/* controls (wrap on small) */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="px-2 py-1 border rounded-md hover:border-[var(--border)] text-xs"
                          onClick={() => saveEdit(s)}
                        >
                          save
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 border rounded-md hover:border-[var(--border)] text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="px-2 py-1 border rounded-md hover:border-[var(--border)] text-xs"
                          onClick={() => startEdit(s)}
                        >
                          edit
                        </button>

                        <button
                          type="button"
                          className="px-2 py-1 border rounded-md hover:border-red-400 text-xs"
                          onClick={() => onDeleteSubtask(s)}
                        >
                          delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-sm opacity-70">no subtasks</p>
          )}

          {/* Add subtask (active tasks only) */}
          {!isInactive && (
            <form
              className="mt-3 flex flex-col sm:flex-row gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const v = newSub.trim();
                if (!v) return;
                await onAddSubtask(task, v);
                setNewSub('');
              }}
            >
              <input
                className="flex-1 bg-transparent border rounded-lg p-2 text-sm"
                placeholder="add a subtask…"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
              />
              <button
                type="submit"
                className="px-3 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto text-sm"
              >
                add
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

const Tasks = () => {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const [tasks, setTasks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [tTitle, setTTitle] = useState('');

  const loadAll = async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);

    const [{ data: t, error: te }, { data: s, error: se }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('subtasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ]);

    if (te || se) setErr(te?.message || se?.message);
    setTasks(t || []);
    setSubs(s || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const subsByTask = useMemo(() => {
    const m = new Map();
    subs.forEach((s) => {
      if (!m.has(s.task_id)) m.set(s.task_id, []);
      m.get(s.task_id).push(s);
    });
    return m;
  }, [subs]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.completed_at),
    [tasks]
  );

  const inactiveTasks = useMemo(
    () =>
      tasks
        .filter((t) => !!t.completed_at)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at)),
    [tasks]
  );

  // --- Mutations ---

  const addTask = async (e) => {
    e.preventDefault();
    if (!tTitle.trim()) return;

    const { error } = await supabase
      .from('tasks')
      .insert({ user_id: userId, title: tTitle.trim() });

    if (error) return alert(error.message);
    setTTitle('');
    loadAll();
  };

  const updateTaskTitle = async (task, title) => {
    const { error } = await supabase
      .from('tasks')
      .update({ title })
      .eq('id', task.id)
      .eq('user_id', userId);

    if (error) return alert(error.message);
    loadAll();
  };

  const addSubtaskToTask = async (task, title) => {
    const { error } = await supabase
      .from('subtasks')
      .insert({ user_id: userId, task_id: task.id, title });

    if (error) return alert(error.message);
    loadAll();
  };

  const toggleSubtaskDone = async (sub) => {
    const next = sub.completed_at ? null : new Date().toISOString();

    const { error } = await supabase
      .from('subtasks')
      .update({ completed_at: next })
      .eq('id', sub.id)
      .eq('user_id', userId);

    if (error) return alert(error.message);
    loadAll(); // trigger should update parent task if all subs complete
  };

  const updateSubtaskTitle = async (sub, title) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ title })
      .eq('id', sub.id)
      .eq('user_id', userId);

    if (error) return alert(error.message);
    loadAll();
  };

  const deleteTask = async (task) => {
    const subCount = (subsByTask.get(task.id) || []).length;
    const ok = window.confirm(
      `Delete task "${task.title}"?${
        subCount ? ' This will also delete all of its subtasks.' : ''
      }`
    );
    if (!ok) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)
      .eq('user_id', userId);

    if (error) return alert(error.message);
    loadAll();
  };

  const deleteSubtask = async (sub) => {
    const ok = window.confirm(`Delete subtask "${sub.title}"?`);
    if (!ok) return;

    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', sub.id)
      .eq('user_id', userId);

    if (error) return alert(error.message);
    loadAll();
  };

  const toggleTaskDoneNoSubs = async (task) => {
    const hasSubs = (subsByTask.get(task.id) || []).length > 0;
    if (hasSubs) return;

    const next = task.completed_at ? null : new Date().toISOString();

    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: next })
      .eq('id', task.id)
      .eq('user_id', userId);

    if (error) return alert(error.message);
    loadAll();
  };

  const reopenTask = async (task) => {
    // Reopen task & all its subtasks
    const sids = (subsByTask.get(task.id) || []).map((s) => s.id);

    if (sids.length) {
      const { error: se } = await supabase
        .from('subtasks')
        .update({ completed_at: null })
        .in('id', sids)
        .eq('user_id', userId);

      if (se) return alert(se.message);
    }

    const { error: te } = await supabase
      .from('tasks')
      .update({ completed_at: null })
      .eq('id', task.id)
      .eq('user_id', userId);

    if (te) return alert(te.message);
    loadAll();
  };

  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">tasks</h1>
      {loading && <p>loading…</p>}
      {err && <p className="text-red-500">error: {err}</p>}

      {/* Create Task */}
      <section className="border rounded-3xl p-6">
        <h2 className="text-lg font-semibold mb-2">add a task</h2>
        <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 bg-transparent border rounded-lg p-3"
            placeholder="task title"
            value={tTitle}
            onChange={(e) => setTTitle(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 border rounded-lg hover:border-[var(--border)] w-full sm:w-auto"
          >
            add task
          </button>
        </form>
      </section>

      {/* Active tasks - single column, dropdown per task */}
      <section className="border rounded-3xl p-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">active tasks</h2>
        {!activeTasks.length && (
          <p className="opacity-80 text-sm">no active tasks.</p>
        )}

        <div className="space-y-3">
          {activeTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              subs={subsByTask.get(t.id) || []}
              isInactive={false}
              onAddSubtask={addSubtaskToTask}
              onToggleSubtaskDone={toggleSubtaskDone}
              onUpdateTaskTitle={updateTaskTitle}
              onUpdateSubtaskTitle={updateSubtaskTitle}
              onToggleTaskDoneNoSubs={toggleTaskDoneNoSubs}
              onDeleteTask={deleteTask}
              onDeleteSubtask={deleteSubtask}
            />
          ))}
        </div>
      </section>

      {/* Inactive tasks - single column, dropdown per task */}
      <section className="border rounded-3xl p-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">inactive tasks</h2>
        {!inactiveTasks.length && (
          <p className="opacity-80 text-sm">no inactive tasks.</p>
        )}

        <div className="space-y-3">
          {inactiveTasks.map((t) => {
            const finished = t.completed_at ? new Date(t.completed_at) : null;

            return (
              <div key={t.id}>
                {finished && (
                  <div className="mb-1 text-xs opacity-70">
                    completed {finished.toLocaleDateString()}
                  </div>
                )}

                <TaskCard
                  task={t}
                  subs={subsByTask.get(t.id) || []}
                  isInactive={true}
                  onAddSubtask={() => {}}
                  onToggleSubtaskDone={toggleSubtaskDone}
                  onUpdateTaskTitle={updateTaskTitle}
                  onUpdateSubtaskTitle={updateSubtaskTitle}
                  onToggleTaskDoneNoSubs={toggleTaskDoneNoSubs}
                  onReopenTask={reopenTask}
                  onDeleteTask={deleteTask}
                  onDeleteSubtask={deleteSubtask}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Tasks;