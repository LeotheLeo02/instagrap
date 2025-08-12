import React, { useState, useEffect } from 'react';
import { 
  getClassificationCriteria, 
  resetClassificationPrompt,
  getSavedCriteria,
  createCriteriaPreset,
  renameCriteriaPreset,
  updateCriteriaPresetContent,
  deleteCriteriaPreset,
  setActiveCriteria
} from '../utils/api';
import { CriteriaPreset } from '../types';

interface ClassificationCriteriaProps {
  onClose?: () => void;
}

export const ClassificationCriteria: React.FC<ClassificationCriteriaProps> = ({ onClose }) => {
  const [criteria, setCriteria] = useState('');
  const [originalCriteria, setOriginalCriteria] = useState(''); // Track original to detect changes
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  // Presets state
  const [presets, setPresets] = useState<CriteriaPreset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState<boolean>(true);
  const [newPresetName, setNewPresetName] = useState<string>("");

  // Notify other components (e.g., TodoList) that presets changed
  const notifyPresetsUpdated = () => {
    try { window.dispatchEvent(new Event('criteria-presets-updated')); } catch {}
  };

  useEffect(() => {
    // Initialize by loading presets first; the sync effect below will
    // set the editor text from the active preset or fallback to backend default.
    loadPresets();
  }, []);

  // Sync editor when active preset changes
  useEffect(() => {
    if (!isLoadingPresets) {
      if (activeId) {
        const p = presets.find(p => p.id === activeId);
        if (p) {
          setCriteria(p.criteria);
          setOriginalCriteria(p.criteria);
          setIsLoading(false);
          return;
        }
      }
      (async () => {
        try {
          setIsLoading(true);
          const response = await getClassificationCriteria();
          const extracted = response.criteria || '';
          setCriteria(extracted);
          setOriginalCriteria(extracted);
        } catch {}
        finally {
          setIsLoading(false);
        }
      })();
    }
  }, [activeId, isLoadingPresets, presets]);

  const loadPrompt = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      console.log("🔄 Loading classification prompt from backend...");
      
      const response = await getClassificationCriteria();
      const extracted = response.criteria || '';
      setCriteria(extracted);
      setOriginalCriteria(extracted);
      setLastSaved(new Date().toLocaleTimeString());
      
      console.log("✅ Classification prompt loaded successfully");
      setSuccess(`Prompt loaded successfully at ${new Date().toLocaleTimeString()}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("❌ Failed to load prompt:", err);
      setError(`Failed to load prompt: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      // Persist into presets storage: update active preset if set; otherwise create one
      if (activeId) {
        await updateCriteriaPresetContent(activeId, criteria);
        await loadPresets();
      } else {
        const defaultName = newPresetName.trim() || `Preset ${new Date().toLocaleString()}`;
        const id = await createCriteriaPreset(defaultName, criteria);
        // Set active first so the subsequent load reflects the new preset
        await setActiveCriteria(id);
        await loadPresets();
        setActiveId(id);
      }
      // Emit a custom event so other components (e.g., TodoList) refresh preset list
      try { window.dispatchEvent(new Event('criteria-presets-updated')); } catch {}
      setOriginalCriteria(criteria);
      setLastSaved(new Date().toLocaleTimeString());
      setSuccess(`Saved to ${activeId ? 'active preset' : 'new preset'} at ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const loadPresets = async () => {
    try {
      setIsLoadingPresets(true);
      setIsLoading(true);
      const data = await getSavedCriteria();
      setPresets(data.presets || []);
      setActiveId(data.active_id ?? null);
    } catch (err: any) {
      console.error('❌ Failed to load saved criteria presets:', err);
    } finally {
      setIsLoadingPresets(false);
      setIsLoading(false);
    }
  };

  const handleCreatePreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;
    try {
      const id = await createCriteriaPreset(name, criteria);
      setNewPresetName('');
      // Set active first so subsequent load reflects it
      await setActiveCriteria(id);
      await loadPresets();
      setActiveId(id);
      notifyPresetsUpdated();
    } catch (err: any) {
      console.error('❌ Failed to create preset:', err);
      setError(`Failed to create preset: ${err.message}`);
    }
  };

  const handleRenamePreset = async (id: string, name: string) => {
    try {
      await renameCriteriaPreset(id, name);
      await loadPresets();
      notifyPresetsUpdated();
    } catch (err: any) {
      console.error('❌ Failed to rename preset:', err);
      setError(`Failed to rename preset: ${err.message}`);
    }
  };

  // removed per UI: updates happen via Save on active preset

  const handleDeletePreset = async (id: string) => {
    try {
      await deleteCriteriaPreset(id);
      await loadPresets();
      notifyPresetsUpdated();
    } catch (err: any) {
      console.error('❌ Failed to delete preset:', err);
      setError(`Failed to delete preset: ${err.message}`);
    }
  };

  const handleSetActive = async (id: string | null) => {
    try {
      await setActiveCriteria(id);
      setActiveId(id);
      notifyPresetsUpdated();
    } catch (err: any) {
      console.error('❌ Failed to set active preset:', err);
      setError(`Failed to set active preset: ${err.message}`);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      console.log("🔄 Resetting classification prompt to default...");
      await resetClassificationPrompt();
      // After reset, fetch fresh criteria for accuracy
      const fresh = await getClassificationCriteria();
      const extracted = fresh.criteria || '';
      setCriteria(extracted);
      setOriginalCriteria(extracted);
      setLastSaved(new Date().toLocaleTimeString());
      
      console.log("✅ Classification prompt reset successfully");
      setSuccess(`Prompt reset to default and persisted at ${new Date().toLocaleTimeString()}`);
      
      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("❌ Failed to reset prompt:", err);
      setError(`Failed to reset prompt: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if prompt has been modified
  const hasChanges = criteria !== originalCriteria;

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Classification Criteria</h2>
          {onClose && (
            <button onClick={onClose} style={styles.closeButton}>
              ✕
            </button>
          )}
        </div>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Edit Classification Criteria</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        )}
      </div>

      <div style={styles.content}>
        <p style={styles.description}>
          Modify the criteria used to classify Instagram profiles. Changes are managed locally via presets. The backend default is only used when no preset is active.
        </p>

        {/* Status indicator */}
        <div style={styles.statusContainer}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Status:</span>
            <span style={hasChanges ? styles.statusModified : styles.statusSaved}>
              {hasChanges ? 'Modified (not saved)' : 'Saved'}
            </span>
          </div>
          {lastSaved && (
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Last saved:</span>
              <span style={styles.statusTime}>{lastSaved}</span>
            </div>
          )}
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}

        <div style={styles.textareaContainer}>
          <div style={styles.labelContainer}>
            <label htmlFor="criteria" style={styles.label}>
              Define what qualifies as "yes":
            </label>
            <button
              onClick={loadPrompt}
              style={styles.refreshButton}
              disabled={isLoading}
              title="Reload prompt from backend"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M4 4v6h6M20 20v-6h-6M4 10l6-6M20 14l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Refresh
              </span>
            </button>
          </div>
          <textarea
            id="criteria"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            style={{
              ...styles.textarea,
              borderColor: hasChanges ? '#f59e0b' : '#d1d5db',
              borderWidth: hasChanges ? '2px' : '1px',
            }}
            placeholder="Describe what should count as a yes signal…"
            rows={12}
          />
          <div style={styles.textareaFooter}>
            {hasChanges && (
              <div style={styles.unsavedIndicator}>
                You have unsaved changes
              </div>
            )}
            <div style={styles.characterCount}>
              {criteria.length} characters
            </div>
          </div>
        </div>

        <div style={styles.presetsContainer}>
          <div style={styles.labelContainer}>
            <label style={styles.label}>Saved Presets</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', color: '#374151' }}>Active:</label>
              <select
                value={activeId ?? ''}
                onChange={(e) => handleSetActive(e.target.value || null)}
                style={styles.select}
              >
                <option value="">Christian</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingPresets ? (
            <div style={styles.loading}>Loading presets...</div>
          ) : presets.length === 0 ? (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No presets saved yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {presets.map((p) => (
                <div key={p.id} style={styles.presetRow}>
                  <input
                    type="text"
                    defaultValue={p.name}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== p.name) handleRenamePreset(p.id, name);
                    }}
                    style={{ ...styles.textInput, flex: 2 }}
                  />
                  <button
                    onClick={() => handleDeletePreset(p.id)}
                    style={{ ...styles.resetButton, background: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c' }}
                    title="Delete preset"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="New preset name"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              style={{ ...styles.textInput, flex: 2 }}
            />
            <button onClick={handleCreatePreset} style={{ ...styles.saveButton, flex: 1 }}>Save as new preset</button>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            onClick={handleReset}
            style={styles.resetButton}
            disabled={isSaving}
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            style={{
              ...styles.saveButton,
              opacity: hasChanges ? 1 : 0.6,
              cursor: hasChanges ? 'pointer' : 'not-allowed',
            }}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : hasChanges ? 'Save (local)' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#fffdf7',
    borderRadius: '8px',
    border: '1px solid #cfc7b8',
    boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
    padding: '20px',
    width: '100%',
    margin: '0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #cfc7b8',
    paddingBottom: '10px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2b2b2b',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  description: {
    margin: 0,
    color: '#6b6254',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
  error: {
    background: '#f9e7e5',
    border: '1px solid #e6b8b5',
    color: '#8b2f2f',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  success: {
    background: '#d8f2d0',
    border: '1px solid #b9e4ac',
    color: '#2f5d2f',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '12px',
    background: '#efe7d7',
    border: '1px solid #cfc7b8',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontWeight: '500',
    color: '#374151',
  },
  statusSaved: {
    color: '#2f5d2f',
    fontWeight: '700',
  },
  statusModified: {
    color: '#8b2f2f',
    fontWeight: '700',
  },
  statusTime: {
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  unsavedIndicator: {
    color: '#f59e0b',
    fontSize: '0.75rem',
    fontWeight: '500',
    marginTop: '4px',
  },
  labelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    background: '#e6decd',
    border: '1px solid #cfc7b8',
    color: '#2b2b2b',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  textareaFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  characterCount: {
    color: '#6b7280',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  textareaContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontWeight: '700',
    color: '#2b2b2b',
    fontSize: '0.875rem',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #cfc7b8',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.5',
    resize: 'vertical' as const,
    minHeight: '200px',
    background: '#fffdf7',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  resetButton: {
    background: '#e6decd',
    border: '1px solid #cfc7b8',
    color: '#2b2b2b',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  saveButton: {
    background: '#2b2b2b',
    border: '1px solid #111',
    color: '#f8f4e7',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6b7280',
  },
  presetsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #e5e7eb',
  },
  select: {
    padding: '8px 10px',
    border: '1px solid #cfc7b8',
    borderRadius: '6px',
    background: '#fffdf7',
  },
  presetRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr auto',
    gap: '8px',
    alignItems: 'center',
  },
  textInput: {
    padding: '10px 12px',
    border: '1px solid #cfc7b8',
    borderRadius: '6px',
    fontSize: '0.9rem',
    background: '#fffdf7',
  },
}; 