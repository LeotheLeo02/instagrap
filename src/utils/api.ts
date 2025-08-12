import { invoke } from '@tauri-apps/api/core';
import { 
  LoginStatusResponse, 
  ScrapeResponse, 
  ScrapingTodo,
  TodoListResponse,
  SavedCriteriaResponse
} from '../types';

/**
 * Check if user is logged in
 */
export const checkLoginStatus = async (): Promise<LoginStatusResponse> => {
  return await invoke<LoginStatusResponse>("proxy_login_status");
};

/**
 * Start Instagram login process
 */
export const startLogin = async (): Promise<string> => {
  console.log("🔍 [DEBUG] Starting Instagram login...");
  const gcsUri: string = await invoke("login_and_upload", {
    bucketUrl: "gs://insta-state/"
  });
  console.log("gcsUri", gcsUri);
  
  // Register the state with the backend API
  console.log("🔍 [DEBUG] Registering state with backend...");
  await invoke("proxy_register_state", { gcsUri: gcsUri });
  console.log("✅ State registered with backend API");
  
  return gcsUri;
};

/**
 * Start a scraping operation
 */
export const startScrape = async (
  target: string,
  targetYes: number,
  batchSize: number,
  bioAgents: number,
  criteriaPresetId?: string | null,
  criteriaText?: string | null
): Promise<ScrapeResponse> => {
  console.log("🔍 [DEBUG] Starting scrape for:", target);
  console.log("🔍 [DEBUG] Criteria preset ID:", criteriaPresetId);
  const response = await invoke<ScrapeResponse>("proxy_remote_scrape", {
    target: target,
    targetYes: targetYes,
    batchSize: batchSize,
    numBioPages: bioAgents,
    criteriaPresetId: criteriaPresetId ?? null,
    criteriaText: criteriaText ?? null
  });
  
  console.log("🔍 [DEBUG] Proxy response received:", response);
  return response;
};

/**
 * Check scraping operation status
 */
export const checkScrapeStatus = async (operation: string): Promise<ScrapeResponse> => {
  console.log("🔍 [DEBUG] Checking scrape status for operation:", operation);
  
  const response = await invoke<ScrapeResponse>("check_persistent_operation_status", { 
    operationId: operation 
  });
  
  console.log("🔍 [DEBUG] Status response:", response);
  return response;
};

/**
 * Delete GCS artifacts for a completed operation
 */
export const deleteGcsArtifacts = async (target: string, execId: string): Promise<void> => {
    
  console.log("🧹 [DEBUG] Deleting GCS artifacts for:", { target, execId });
  await invoke("proxy_delete_scrape_artifacts", { target, execId });
};

/**
 * Get persistent operations
 */
// Deprecated: persistent operations UI has been removed

/**
 * Remove persistent operation
 */
export const removePersistentOperation = async (operationId: string): Promise<void> => {
  await invoke("remove_persistent_operation", { operationId });
};

/**
 * Clear completed operations
 */
export const clearCompletedOperations = async (): Promise<void> => {
  await invoke("clear_completed_operations");
};

/**
 * Test API connection
 */
export const testConnection = async (): Promise<void> => {
  await invoke("proxy_login_status");
};

/**
 * Get only the editable criteria (for the UI textfield)
 */
export const getClassificationCriteria = async (): Promise<{ criteria: string }> => {
  console.log("🔍 [DEBUG] Getting classification criteria via Tauri invoke...");
  const data = await invoke<{ criteria: string }>("get_classification_criteria");
  console.log("🔍 [DEBUG] Classification criteria loaded:", data);
  return data;
};

/**
 * Update the classification prompt
 */
export const updateClassificationPrompt = async (criteria: string): Promise<{ prompt: string }> => {
  console.log("🔍 [DEBUG] Updating criteria via Tauri invoke...");
  // Tauri command now accepts `criteria` directly
  const data = await invoke<{ prompt: string }>("update_classification_prompt", { criteria });
  console.log("🔍 [DEBUG] Classification prompt updated:", data);
  return data;
};

/**
 * Reset the classification prompt to default
 */
export const resetClassificationPrompt = async (): Promise<{ prompt: string }> => {
  console.log("🔍 [DEBUG] Resetting classification prompt via Tauri invoke...");
  const data = await invoke<{ prompt: string }>("reset_classification_prompt");
  console.log("🔍 [DEBUG] Classification prompt reset:", data);
  return data;
};

// Todo System API Functions

/**
 * Create a new scraping todo
 */
export const createTodo = async (
  targetAccount: string,
  targetCount: number,
  bioAgents: number,
  batchSize: number,
  criteriaPresetId?: string | null
): Promise<void> => {
  console.log("🔍 [DEBUG] Creating todo for:", targetAccount);
  
  await invoke("create_todo", {
    req: {
      target_account: targetAccount,
      target_count: targetCount,
      bio_agents: bioAgents,
      batch_size: batchSize,
      criteria_preset_id: (criteriaPresetId && criteriaPresetId.length > 0) ? criteriaPresetId : null
    }
  });
  
  console.log("✅ Todo created successfully");
};

/**
 * Get all todos
 */
export const getTodos = async (): Promise<TodoListResponse> => {
  console.log("🔍 [DEBUG] Getting todos...");
  
  const response = await invoke<TodoListResponse>("get_todos");
  
  console.log("🔍 [DEBUG] Todos response:", response);
  return response;
};

/**
 * Update todo status
 */
export const updateTodoStatus = async (
  todoId: string,
  status: string,
  operationId?: string,
  execId?: string,
  results?: any[],
  errorMessage?: string
): Promise<void> => {
  console.log("🔍 [DEBUG] Updating todo status:", todoId, status);
  
  await invoke("update_todo_status", {
    todoId: todoId,
    status: status,
    operationId: operationId,
    execId: execId,
    results: results,
    errorMessage: errorMessage
  });
  
  console.log("✅ Todo status updated successfully");
};

/**
 * Toggle manual completion for a todo
 */
export const toggleTodoManualComplete = async (todoId: string): Promise<void> => {
  console.log("🔍 [DEBUG] Toggling manual completion for todo:", todoId);
  
  await invoke("toggle_todo_manual_complete", { todoId });
  
  console.log("✅ Todo manual completion toggled");
};

/**
 * Delete a todo
 */
export const deleteTodo = async (todoId: string): Promise<void> => {
  console.log("🔍 [DEBUG] Deleting todo:", todoId);
  
  await invoke("delete_todo", { todoId });
  
  console.log("✅ Todo deleted successfully");
};

// Criteria Presets API Functions

export const getSavedCriteria = async (): Promise<SavedCriteriaResponse> => {
  return await invoke<SavedCriteriaResponse>("get_saved_criteria");
};

export const createCriteriaPreset = async (name: string, criteria: string): Promise<string> => {
  return await invoke<string>("create_criteria_preset", { name, criteria });
};

export const renameCriteriaPreset = async (id: string, name: string): Promise<void> => {
  await invoke("rename_criteria_preset", { id, name });
};

export const updateCriteriaPresetContent = async (id: string, criteria: string): Promise<void> => {
  await invoke("update_criteria_preset_content", { id, criteria });
};

export const deleteCriteriaPreset = async (id: string): Promise<void> => {
  await invoke("delete_criteria_preset", { id });
};

export const setActiveCriteria = async (id?: string | null): Promise<void> => {
  // undefined/null -> clear to use default
  await invoke("set_active_criteria", { id: id ?? null });
};

export const setTodoCriteriaPreset = async (todoId: string, presetId?: string | null): Promise<void> => {
  const normalized = presetId && presetId.length > 0 ? presetId : null;
  await invoke("set_todo_criteria_preset", {
    todoId: todoId,
    presetId: normalized,
  });
};

/**
 * Run a todo (start scraping)
 */
export const runTodo = async (
  todo: ScrapingTodo,
  criteriaPresetIdOverride?: string | null
): Promise<string | undefined> => {
  console.log("🔍 [DEBUG] Running todo:", todo.id);
  
  try {
    // Update todo status to running
    await updateTodoStatus(todo.id, "running");
    
    // Start the scraping operation
    console.log("🔍 [DEBUG] Starting scrape with criteria preset:", criteriaPresetIdOverride);
    console.log("🔍 [DEBUG] Todo criteria preset:", todo.criteria_preset_id);
    const response = await startScrape(
      todo.target_account,
      todo.target_count,
      todo.batch_size,
      todo.bio_agents,
      // Use override if provided; otherwise fallback to the todo's value
      (criteriaPresetIdOverride ?? todo.criteria_preset_id ?? null)
    );
    
    console.log("🔍 [DEBUG] Scrape response for todo:", response);
    
    if (response.status === "queued") {
      // Update todo with operation ID
    await updateTodoStatus(
        todo.id,
        "running",
      response.operation,
      response.exec_id,
        undefined,
        undefined
      );
    console.log("✅ Todo queued with operation ID:", response.operation);
    if (response.exec_id) {
      // Attach exec_id to our local todo object (frontend state) if needed by UI later
      (todo as any).exec_id = response.exec_id;
      console.log("✅ Todo queued with exec_id:", response.exec_id);
    }
      return response.exec_id;
    } else if (response.status === "completed") {
      // Update todo as completed
      await updateTodoStatus(
        todo.id,
        "completed",
        undefined,
        undefined,
        undefined
      );
      console.log("✅ Todo completed immediately");
      return undefined;
    } else if (response.status === "failed") {
      // Update todo as failed
      await updateTodoStatus(
        todo.id,
        "failed",
        undefined,
        undefined,
        undefined
      );
      console.log("❌ Todo failed:", response.message);
      return undefined;
    }
  } catch (error: any) {
    console.error("❌ [DEBUG] Error running todo:", error);
    await updateTodoStatus(
      todo.id,
      "failed",
      undefined,
    undefined,
      error.message || "Unknown error"
    );
    throw error;
  }
 };