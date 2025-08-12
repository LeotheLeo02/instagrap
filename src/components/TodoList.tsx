import React, { useEffect, useState } from 'react';
import { TodoListProps, CriteriaPreset } from '../types';
import { styles } from '../utils/styles';
import { getSavedCriteria, setTodoCriteriaPreset } from '../utils/api';

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  loadingTodos,
  loginState,
  onAddTodo,
  onRunTodo,
  onToggleManualComplete,
  onDeleteTodo,
  onDownloadResults,
  setTodos
}) => {
  const [newTodo, setNewTodo] = useState({
    target_account: '',
    target_count: 50,
    bio_agents: 3,
    batch_size: 30,
    criteria_preset_id: '' as string | null
  });
  // Track per-todo immediate sending state to give instant UI feedback on Run
  const [isStartingMap, setIsStartingMap] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState({
    pending: true,
    running: true,
    completed: true,
    failed: true,
  });
  // Criteria presets selection for runs
  const [presets, setPresets] = useState<CriteriaPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);


  // Resolve preset id to human-readable name
  const getPresetName = (id?: string | null) => {
    if (!id) return 'Christian';
    const p = presets.find(pr => pr.id === id);
    return p ? p.name : 'Christian';
  };

  const reloadPresets = async () => {
    try {
      const data = await getSavedCriteria();
      setPresets(data.presets || []);
      setActivePresetId(data.active_id ?? null);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    reloadPresets();
    const onFocus = () => reloadPresets();
    const onUpdated = () => reloadPresets();
    window.addEventListener('focus', onFocus);
    window.addEventListener('criteria-presets-updated', onUpdated as any);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('criteria-presets-updated', onUpdated as any);
    };
  }, []);



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.target_account.trim()) {
      onAddTodo(newTodo as any);
      setNewTodo({
        target_account: '',
        target_count: 50,
        bio_agents: 3,
        batch_size: 30,
        criteria_preset_id: ''
      });
    }
  };

  const getStatusColor = (status: string, manuallyCompleted: boolean) => {
    if (manuallyCompleted) return { ...styles.badge, ...styles.badgeManual } as any;
    switch (status) {
      case 'pending': return { ...styles.badge, ...styles.badgePending } as any;
      case 'running': return { ...styles.badge, ...styles.badgeRunning } as any;
      case 'completed': return { ...styles.badge, ...styles.badgeCompleted } as any;
      case 'failed': return { ...styles.badge, ...styles.badgeFailed } as any;
      default: return { ...styles.badge, ...styles.badgePending } as any;
    }
  };

  const getStatusIcon = (status: string, manuallyCompleted: boolean) => {
    const common = { display: 'inline-block', verticalAlign: 'middle' } as const;
    if (manuallyCompleted) {
      return (
        <svg style={common} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    switch (status) {
      case 'pending':
        return (
          <svg style={common} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'running':
        return (
          <svg style={common} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M21 12a9 9 0 1 1-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'completed':
        return (
          <svg style={common} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'failed':
        return (
          <svg style={common} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return (
          <svg style={common} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const toTime = (s?: string) => (s ? new Date(s).getTime() : 0);
  const pendingTodos = todos.filter(t => t.status === 'pending');
  const runningTodos = todos
    .filter(t => t.status === 'running')
    .sort((a, b) => {
      const at = toTime(a.started_at) || toTime(a.created_at);
      const bt = toTime(b.started_at) || toTime(b.created_at);
      return bt - at; // most recent first
    });
  const completedTodos = todos
    .filter(t => t.status === 'completed')
    .sort((a, b) => {
      const at = toTime(a.completed_at) || toTime(a.started_at) || toTime(a.created_at);
      const bt = toTime(b.completed_at) || toTime(b.started_at) || toTime(b.created_at);
      return bt - at;
    });
  const failedTodos = todos
    .filter(t => t.status === 'failed')
    .sort((a, b) => {
      const at = toTime(a.completed_at) || toTime(a.started_at) || toTime(a.created_at);
      const bt = toTime(b.completed_at) || toTime(b.started_at) || toTime(b.created_at);
      return bt - at;
    });

  return (
    <section style={styles.section}>
      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Todos</h2>
          <span style={styles.pillCounter}>{todos.length}</span>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ ...styles.label, marginRight: 6 }}>Criteria preset</label>
              <select
                value={newTodo.criteria_preset_id ?? (activePresetId ?? '')}
                onChange={async (e) => {
                  const id = e.target.value || '';
                  setNewTodo({ ...newTodo, criteria_preset_id: id });
                }}
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 10 }}
                onFocus={reloadPresets}
              >
                <option value="">Christian</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Instagram Account</label>
              <input
                type="text"
                value={newTodo.target_account}
                onChange={(e) => setNewTodo({ ...newTodo, target_account: e.target.value })}
                placeholder="e.g., username"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Target Count</label>
              <input
                type="number"
                value={newTodo.target_count}
                onChange={(e) => setNewTodo({ ...newTodo, target_count: parseInt(e.target.value) || 50 })}
                min="1"
                max="500"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Bio Agents</label>
              <input
                type="number"
                value={newTodo.bio_agents}
                onChange={(e) => setNewTodo({ ...newTodo, bio_agents: parseInt(e.target.value) || 3 })}
                min="1"
                max="10"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Batch Size</label>
              <input
                type="number"
                value={newTodo.batch_size}
                onChange={(e) => setNewTodo({ ...newTodo, batch_size: parseInt(e.target.value) || 30 })}
                min="10"
                max="100"
                style={styles.input}
              />
            </div>
          </div>
          <div style={styles.formButtonRow}>
            <button type="submit" style={styles.button}>Add Todo</button>
            {loginState !== 'done' && (
              <span style={{ ...styles.badge, ...styles.badgePending }}>Login required to run tasks</span>
            )}
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Pending</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={styles.pillCounter}>{pendingTodos.length}</span>
            <button
              type="button"
              onClick={() => setOpenGroups(g => ({ ...g, pending: !g.pending }))}
              style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSubtle }}
            >
              {openGroups.pending ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {loadingTodos ? (
          <div style={styles.loading}>Loading todos...</div>
        ) : openGroups.pending ? (
          <div style={styles.todoList}>
            {pendingTodos.map((todo) => (
              <div key={todo.id} style={styles.todoItem}>
                <div style={styles.todoHeader}>
                  <div style={styles.todoInfo}>
                    <h4 style={styles.todoTitle}>
                      @{todo.target_account}
                      <span style={getStatusColor(todo.status, todo.manually_completed)}>
                        {/* Remove spinner icon in badge for running; show text only */}
                        {todo.status}
                      </span>
                    </h4>
                    <div style={styles.todoDetails}>
                      <span>Target: {todo.target_count}</span>
                      <span>Bio Agents: {todo.bio_agents}</span>
                      <span>Batch Size: {todo.batch_size}</span>
                      <span>Preset: {getPresetName(todo.criteria_preset_id)}</span>
                    </div>
                  </div>
                  <div style={styles.todoActions}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 8 }}>
                      <label style={{ ...styles.label, marginRight: 6 }}>Preset</label>
                      <select
                        value={todo.criteria_preset_id ?? ''}
                        onChange={async (e) => {
                          const id = e.target.value || '';
                          setTodos(prevTodos => 
                            prevTodos.map(t => 
                              t.id === todo.id 
                                ? { ...t, criteria_preset_id: id || null }
                                : t
                            )
                          );
                          await setTodoCriteriaPreset(todo.id, id);
                        }}
                        style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                        onFocus={reloadPresets}
                       >
                         <option value="">Christian</option>
                        {presets.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={async () => {
                        setIsStartingMap((m) => ({ ...m, [todo.id]: true }));
                        try {
                          console.log("Todo criteria_preset_id:", todo.criteria_preset_id);
                          await onRunTodo(todo.id, todo.criteria_preset_id);
                        } finally {
                          setIsStartingMap((m) => ({ ...m, [todo.id]: false }));
                        }
                      }}
                      disabled={loginState !== 'done' || !!isStartingMap[todo.id]}
                      style={{ 
                        ...styles.button, 
                        ...styles.smallButton, 
                        ...(loginState === 'done' && !isStartingMap[todo.id] ? styles.buttonSuccess : styles.buttonDisabled),
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                      }}
                      title={loginState !== 'done' ? 'Please log in to Instagram first' : (isStartingMap[todo.id] ? 'Starting…' : 'Run this scraping task')}
                    >
                      {isStartingMap[todo.id] ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden
                            style={{ animation: 'spin 1s linear infinite', transformOrigin: '50% 50%' }}>
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Starting…
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M5 12h9M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Run
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      disabled={!!isStartingMap[todo.id]}
                      style={{ 
                        ...styles.button, 
                        ...styles.smallButton, 
                        ...(!isStartingMap[todo.id] ? styles.buttonDanger : styles.buttonDisabled),
                        display: 'inline-flex', alignItems: 'center', gap: 8 
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Running</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={styles.pillCounter}>{runningTodos.length}</span>
            <button
              type="button"
              onClick={() => setOpenGroups(g => ({ ...g, running: !g.running }))}
              style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSubtle }}
            >
              {openGroups.running ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {loadingTodos ? (
          <div style={styles.loading}>Loading todos...</div>
        ) : openGroups.running ? (
          <div style={styles.todoList}>
            {runningTodos.map((todo) => (
              <div key={todo.id} style={styles.todoItem}>
                <div style={styles.todoHeader}>
                  <div style={styles.todoInfo}>
                    <h4 style={styles.todoTitle}>
                      @{todo.target_account}
                      <span style={getStatusColor(todo.status, todo.manually_completed)}>
                        {todo.status}
                      </span>
                    </h4>
                    <div style={styles.todoDetails}>
                      <span>Target: {todo.target_count}</span>
                      <span>Bio Agents: {todo.bio_agents}</span>
                      <span>Batch Size: {todo.batch_size}</span>
                      <span>Preset: {(todo as any).criteria_preset_name || getPresetName(todo.criteria_preset_id)}</span>
                    </div>
                    <div style={styles.todoDates}>
                      {todo.started_at && <small>Started: {formatDate(todo.started_at)}</small>}
                    </div>
                  </div>
                  <div style={styles.todoActions}>
                    <span
                      style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSubtle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden
                        style={{ animation: 'spin 1s linear infinite', transformOrigin: '50% 50%' }}>
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Running
                    </span>
                    <button
                      onClick={() => onToggleManualComplete(todo.id)}
                      style={{ ...styles.button, ...styles.smallButton, ...(todo.manually_completed ? styles.buttonSecondary : styles.buttonSuccess), display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      {todo.manually_completed ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M4 4v6h6M20 20v-6h-6M4 10l6-6M20 14l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Reset
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Mark Complete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Completed</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={styles.pillCounter}>{completedTodos.length}</span>
            <button
              type="button"
              onClick={() => setOpenGroups(g => ({ ...g, completed: !g.completed }))}
              style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSubtle }}
            >
              {openGroups.completed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {loadingTodos ? (
          <div style={styles.loading}>Loading todos...</div>
        ) : openGroups.completed ? (
          <div style={styles.todoList}>
            {completedTodos.map((todo) => (
              <div key={todo.id} style={styles.todoItem}>
                <div style={styles.todoHeader}>
                  <div style={styles.todoInfo}>
                    <h4 style={styles.todoTitle}>
                      @{todo.target_account}
                      <span style={getStatusColor(todo.status, todo.manually_completed)}>
                        {todo.status}
                      </span>
                    </h4>
                    <div style={styles.todoDetails}>
                      <span>Target: {todo.target_count}</span>
                      <span>Bio Agents: {todo.bio_agents}</span>
                      <span>Batch Size: {todo.batch_size}</span>
                      {todo.results && <span>Results: {todo.results.length}</span>}
                      <span>Preset: {(todo as any).criteria_preset_name || getPresetName(todo.criteria_preset_id)}</span>
                    </div>
                    <div style={styles.todoDates}>
                      {todo.completed_at && <small>Completed: {formatDate(todo.completed_at)}</small>}
                    </div>
                  </div>
                  <div style={styles.todoActions}>
                    {todo.results && todo.results.length > 0 && (
                      <button
                        onClick={() => onDownloadResults(todo)}
                        style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSuccess, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      style={{ ...styles.button, ...styles.smallButton, ...styles.buttonDanger, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Failed</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={styles.pillCounter}>{failedTodos.length}</span>
            <button
              type="button"
              onClick={() => setOpenGroups(g => ({ ...g, failed: !g.failed }))}
              style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSubtle }}
            >
              {openGroups.failed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {loadingTodos ? (
          <div style={styles.loading}>Loading todos...</div>
        ) : openGroups.failed ? (
          <div style={styles.todoList}>
            {failedTodos.map((todo) => (
              <div key={todo.id} style={styles.todoItem}>
                <div style={styles.todoHeader}>
                  <div style={styles.todoInfo}>
                    <h4 style={styles.todoTitle}>
                      @{todo.target_account}
                      <span style={getStatusColor(todo.status, todo.manually_completed)}>
                        {getStatusIcon(todo.status, todo.manually_completed)} {todo.status}
                      </span>
                    </h4>
                    <div style={styles.todoDetails}>
                      <span>Target: {todo.target_count}</span>
                      <span>Bio Agents: {todo.bio_agents}</span>
                      <span>Batch Size: {todo.batch_size}</span>
                      <span>Preset: {(todo as any).criteria_preset_name || getPresetName(todo.criteria_preset_id)}</span>
                    </div>
                    {todo.error_message && (
                      <div style={styles.errorMessage}>
                        <strong>Error:</strong> {todo.error_message}
                      </div>
                    )}
                  </div>
                  <div style={styles.todoActions}>
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      style={{ ...styles.button, ...styles.smallButton, ...styles.buttonDanger, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}; 