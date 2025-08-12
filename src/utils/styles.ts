export const styles = {
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    backgroundColor: '#f5f0e8',
    minHeight: '100vh',
    // Subtle outer border to balance wide gutters on very large screens
    borderLeft: '1px solid #e3dccf',
    borderRight: '1px solid #e3dccf',
  },

  h1: {
    textAlign: 'center' as const,
    color: '#2b2b2b',
    marginBottom: '8px',
    fontSize: '2.15rem',
    fontWeight: '800',
    letterSpacing: '-0.01em',
  },

  h2: {
    color: '#2b2b2b',
    marginBottom: '16px',
    fontSize: '1.35rem',
    fontWeight: '700',
  },

  sub: {
    textAlign: 'center' as const,
    color: '#6b6254',
    marginTop: '-6px',
    marginBottom: '20px',
    fontSize: '0.95rem',
  },

  h3: {
    color: '#2b2b2b',
    marginBottom: '15px',
    fontSize: '1.2rem',
    fontWeight: '700',
  },

  section: {
    marginBottom: '30px',
  },

  card: {
    backgroundColor: '#fffdf7',
    borderRadius: '8px',
    padding: '18px',
    border: '1px solid #cfc7b8',
    boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
    marginBottom: '20px',
  },

  // Minimal login bar replacing the heavier card
  loginBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    border: '1px solid #cfc7b8',
    background: '#fff9e8',
    borderRadius: '8px',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },

  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  label: {
    fontWeight: '500',
    color: '#374151',
    fontSize: '0.9rem',
  },

  input: {
    padding: '10px 12px',
    border: '1px solid #cfc7b8',
    borderRadius: '6px',
    fontSize: '1rem',
    backgroundColor: '#fffdf7',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  button: {
    padding: '10px 16px',
    backgroundColor: '#2b2b2b',
    color: '#f8f4e7',
    border: '1px solid #111',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.05s',
  },

  buttonSecondary: {
    backgroundColor: '#544f45',
  },

  buttonSuccess: {
    backgroundColor: '#2f5d2f',
  },

  buttonDanger: {
    backgroundColor: '#8b2f2f',
  },

  buttonSubtle: {
    backgroundColor: '#e6decd',
    color: '#2b2b2b',
  },

  buttonDisabled: {
    backgroundColor: '#bfbab0',
    cursor: 'not-allowed',
    opacity: 0.7,
  },

  smallButton: {
    padding: '8px 16px',
    fontSize: '0.9rem',
  },

  buttonGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },

  statusBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    marginLeft: '8px',
  },

  badge: {
    padding: '4px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  badgeTiny: {
    padding: '2px 6px',
    fontSize: '0.7rem',
  },
  badgePending: { background: '#efe7d7', color: '#4b4638' },
  badgeRunning: { background: '#fff2b2', color: '#7c6f1d' },
  badgeCompleted: { background: '#d8f2d0', color: '#2f5d2f' },
  badgeFailed: { background: '#f9d3d0', color: '#8b2f2f' },
  badgeManual: { background: '#d7e6f2', color: '#1e40af' },

  loading: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '20px',
  },

  emptyState: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '40px 20px',
    fontStyle: 'italic',
  },

  errorMessage: {
    backgroundColor: '#f9e7e5',
    border: '1px solid #e6b8b5',
    color: '#8b2f2f',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '12px',
    fontSize: '0.9rem',
  },

  // Loading screen styles
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center' as const,
  },

  loadingSpinner: {
    fontSize: '2rem',
    marginBottom: '1rem',
    // Removed transform/transition to let SVG animateTransform drive rotation
  },

  // Note and status styles
  note: {
    color: '#64748b',
    fontSize: '0.9rem',
  },

  ok: {
    color: '#16a34a',
    fontWeight: '500',
  },

  err: {
    color: '#dc2626',
    fontWeight: '500',
  },

  // Range input styles
  rangeContainer: {
    marginBottom: '1rem',
  },

  rangeInput: {
    width: '100%',
    marginTop: '0.5rem',
  },

  // Operation card styles
  operationCard: {
    padding: '1rem',
    margin: '0.5rem 0',
    border: '1px solid #cfc7b8',
    borderRadius: '8px',
    background: '#fffdf7',
  },

  // Todo List specific styles
  todoList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },

  todoItem: {
    border: '1px solid #cfc7b8',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#fffdf7',
  },

  todoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },

  todoInfo: {
    flex: '1',
  },

  todoTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#2b2b2b',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },

  todoDetails: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px',
    fontSize: '0.9rem',
    color: '#6b6254',
  },

  todoDates: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.8rem',
    color: '#8a8273',
  },

  todoActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },

  // Classification section styles
  classificationSection: {
    marginBottom: '20px',
  },

  classificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },

  classificationTitle: {
    color: '#2b2b2b',
    margin: '0',
    fontSize: '1.35rem',
    fontWeight: '700',
  },

  classificationButton: {
    padding: '8px 14px',
    backgroundColor: '#2b2b2b',
    color: '#f8f4e7',
    border: '1px solid #111',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  // Layout helpers (used with CSS classes for responsiveness)
  gridGap: {
    gap: '24px',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '8px 0 12px',
  },
  sectionTitle: {
    margin: 0,
    color: '#2b2b2b',
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  pillCounter: {
    padding: '4px 10px',
    borderRadius: '9999px',
    background: '#efe7d7',
    color: '#4b4638',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  formButtonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
}; 