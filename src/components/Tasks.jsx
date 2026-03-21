import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

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
  const [isOpen, setIsOpen] = useState(false);

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
    <div className={`surface-row ${isInactive ? 'surface-row--inactive' : ''}`}>
      <div
        role="button"
        tabIndex={editingTask ? -1 : 0}
        onClick={() => {
          if (!editingTask) setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleHeaderKeyDown}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex flex-1 items-center gap-3">
          <svg
            className={`shrink-0 text-white/45 transition-transform ${isOpen ? 'rotate-90' : ''}`}
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
              className="input-compact flex-1 min-w-0"
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
            <span
              className={`task-title truncate ${isInactive ? 'task-title--inactive' : ''}`}
              title={task.title}
            >
              {task.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {!editingTask && hasSubs && (
            <span className="meta-text hidden sm:block whitespace-nowrap">
              {incompleteCount > 0
                ? `${incompleteCount} subtask${incompleteCount > 1 ? 's' : ''} left`
                : 'all subtasks complete'}
            </span>
          )}

          {!editingTask && !hasSubs && !isInactive && (
            <span className="meta-text hidden sm:block whitespace-nowrap">
              no subtasks
            </span>
          )}

          {editingTask ? (
            <>
              <button
                type="button"
                className="button-subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  saveTaskEdit();
                }}
              >
                save
              </button>
              <button
                type="button"
                className="button-ghost"
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
                className="button-ghost"
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
                  className="button-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTaskDoneNoSubs(task);
                  }}
                >
                  {task.completed_at ? 'reopen' : 'done'}
                </button>
              )}

              {isInactive && (
                <button
                  type="button"
                  className="button-ghost"
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
                className="button-danger"
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

      {isOpen && (
        <div className="row-divider px-4 pb-4 pt-3">
          {hasSubs ? (
            <ul className="space-y-1.5">
              {subs.map((s) => {
                const isEditing = editingId === s.id;
                const done = !!s.completed_at;

                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggleSubtaskDone(s)}
                      className="shrink-0 accent-[var(--link)]"
                    />

                    {isEditing ? (
                      <input
                        autoFocus
                        className="input-compact flex-1 min-w-0"
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
                          done ? 'text-white/40 line-through' : 'text-white/80'
                        }`}
                        title={s.title}
                      >
                        {s.title}
                      </span>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="button-subtle"
                          onClick={() => saveEdit(s)}
                        >
                          save
                        </button>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => setEditingId(null)}
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => startEdit(s)}
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          className="button-danger"
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
            <p className="meta-text">no subtasks</p>
          )}

          {!isInactive && (
            <form
              className="mt-4 flex flex-col sm:flex-row gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const v = newSub.trim();
                if (!v) return;
                await onAddSubtask(task, v);
                setNewSub('');
              }}
            >
              <input
                className="input-minimal flex-1"
                placeholder="add a subtask…"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
              />
              <button
                type="submit"
                className="button-primary w-full sm:w-auto"
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

    const [{ data: t, error: te }, { data: s, error: se }] =
      await Promise.all([
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
    loadAll();
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
    <main className="app-shell">
      <header className="mb-12">
        <h1 className="page-title">tasks</h1>
      </header>

      {loading && <p className="meta-text">loading…</p>}
      {err && <p className="text-sm text-red-400">error: {err}</p>}

      <section>
        <div className="mb-4">
          <p className="section-title">add a task</p>
        </div>

        <form
          onSubmit={addTask}
          className="flex flex-col sm:flex-row sm:items-center gap-2"
        >
          <input
            className="input-minimal flex-1"
            placeholder="task title"
            value={tTitle}
            onChange={(e) => setTTitle(e.target.value)}
          />
          <button
            type="submit"
            className="button-primary w-full sm:w-auto"
          >
            add task
          </button>
        </form>
      </section>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <p className="section-title">active tasks</p>
          {!!activeTasks.length && (
            <p className="meta-text-dim">{activeTasks.length} total</p>
          )}
        </div>

        <div className="divider-subtle" />

        {!activeTasks.length ? (
          <p className="meta-text pt-5">no active tasks.</p>
        ) : (
          <div className="mt-4 space-y-3">
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
        )}
      </section>

      <section className="mt-16">
        <div className="mb-4 flex items-end justify-between gap-4">
          <p className="section-title">inactive tasks</p>
          {!!inactiveTasks.length && (
            <p className="meta-text-dim">{inactiveTasks.length} archived</p>
          )}
        </div>

        <div className="divider-subtle" />

        {!inactiveTasks.length ? (
          <p className="meta-text pt-5">no inactive tasks.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {inactiveTasks.map((t) => {
              const finished = t.completed_at ? new Date(t.completed_at) : null;

              return (
                <div key={t.id}>
                  {finished && (
                    <div className="mb-2 px-1 meta-text-dim">
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
        )}
      </section>
    </main>
  );
};

export default Tasks;