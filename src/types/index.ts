import React from 'react';

// API Response Types
export interface LoginStatusResponse {
  status: string;
  ok: boolean;
}

export interface ScrapeResponse {
  status: "queued" | "completed" | "failed";
  operation?: string;
  results?: InstagramProfile[];
  count?: number;
  message?: string;
  exec_id?: string;
}

export interface InstagramProfile {
  username: string;
  url: string;
}

// Todo System Types
export interface ScrapingTodo {
  id: string;
  target_account: string;
  target_count: number;
  bio_agents: number;
  batch_size: number;
  criteria_preset_id?: string | null;
  criteria_preset_name?: string | null;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  started_at?: string;
  completed_at?: string;
  operation_id?: string;
  exec_id?: string;
  results?: InstagramProfile[];
  error_message?: string;
  manually_completed: boolean; // Allow manual override
}

export interface TodoListResponse {
  todos: ScrapingTodo[];
}

// (Removed) Persistent Operation Types – no longer used

// UI State Types
export type LoginState = "idle" | "running" | "done" | "fail" | "checking" | "none";

export interface AppState {
  loginState: LoginState;
  initializing: boolean;
  // Todo system state
  todos: ScrapingTodo[];
  loadingTodos: boolean;
}

// Component Props Types
export interface LoginCardProps {
  loginState: LoginState;
  onLogin: () => void;
  onCheckStatus: () => void;
}

// (Removed) ScrapeFormProps – no longer used

export interface TodoListProps {
  todos: ScrapingTodo[];
  loadingTodos: boolean;
  loginState: LoginState;
  onAddTodo: (todo: Omit<ScrapingTodo, 'id' | 'created_at' | 'status' | 'manually_completed'>) => void;
  onRunTodo: (todoId: string, criteriaPresetId?: string | null) => Promise<void>;
  onToggleManualComplete: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onDownloadResults: (todo: ScrapingTodo) => void;
  setTodos: React.Dispatch<React.SetStateAction<ScrapingTodo[]>>;
}

// (Removed) PersistentOperationsProps – no longer used

export interface ResultsTableProps {
  results: InstagramProfile[];
  showPersistentResults: boolean;
  onDownloadCSV: () => void;
  onDownloadJSON: () => void;
}

export interface LoadingScreenProps {
  message?: string;
} 

// Criteria Presets
export interface CriteriaPreset {
  id: string;
  name: string;
  criteria: string;
  created_at: string;
  updated_at: string;
}

export interface SavedCriteriaResponse {
  presets: CriteriaPreset[];
  active_id?: string | null;
}