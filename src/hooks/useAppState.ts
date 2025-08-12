import { useState, useEffect } from 'react';
import { 
  LoginState, 
  InstagramProfile, 
  ScrapingTodo
} from '../types';
import { 
  checkLoginStatus, 
  checkScrapeStatus,
  createTodo,
  getTodos,
  updateTodoStatus,
  toggleTodoManualComplete,
  deleteTodo,
  runTodo,
  deleteGcsArtifacts,
} from '../utils/api';
import { downloadCSV } from '../utils/download';
import { POLLING_INTERVAL } from '../constants';

export const useAppState = () => {
  // Core state
  const [loginState, setLoginState] = useState<LoginState>("checking");
  const [initializing, setInitializing] = useState(true);

  // Todo system state
  const [todos, setTodos] = useState<ScrapingTodo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);

  // Check existing login
  const checkExistingLogin = async () => {
    console.log("🔍 [DEBUG] Checking existing login");
    setLoginState("checking");
    try {
      const status = await checkLoginStatus();
      
      if (status.ok || status.status === "finished") {
        console.log("✅ [DEBUG] Found existing login state");
        setLoginState("done");
      } else if (status.status === "none") {
        console.log("⚠️ [DEBUG] No login state file found (status: none)");
        setLoginState("idle");
      }
    } catch (err: any) {
      console.error("❌ [DEBUG] Error checking login status:", err);
      setLoginState("idle");
    }
    console.log("🔍 [DEBUG] Login state:", loginState);
  };

  // Load todos
  const loadTodos = async () => {
    console.log("🔍 [DEBUG] Loading todos");
    try {
      setLoadingTodos(true);
      const response = await getTodos();
      
      if (response.todos && Array.isArray(response.todos)) {
        setTodos(response.todos);
        console.log("✅ [DEBUG] Loaded todos:", response.todos.length);
      }
      console.log("🔍 [DEBUG] Todos loaded:", todos.length);
    } catch (err: any) {
      console.error("❌ [DEBUG] Error loading todos:", err);
    } finally {
      setLoadingTodos(false);
    }
  };

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      setInitializing(true);
      try {
        await checkExistingLogin();
        await loadTodos();
      } finally {
        setInitializing(false);
      }
    };
    initializeApp();
  }, []);

  // Poll for todo status updates
  useEffect(() => {
    const runningTodos = todos.filter(todo => todo.status === "running" && todo.operation_id);
    if (runningTodos.length === 0) return;

    const intervals: Record<string, ReturnType<typeof setInterval>> = {};
    // Per-todo in-flight guard to avoid overlapping polls
    const inFlight: Record<string, boolean> = {};
    // Per-todo backoff in ms for transient failures/timeouts
    const backoffMs: Record<string, number> = {};

    runningTodos.forEach((todo) => {
      if (!todo.operation_id) return;
      
      intervals[todo.id] = setInterval(async () => {
        try {
          // Skip this tick if a previous request has not finished yet
          if (inFlight[todo.id]) {
            // console.log("⏸️ [DEBUG] Skipping poll tick (in-flight)", todo.id);
            return;
          }
          inFlight[todo.id] = true;

          const response = await checkScrapeStatus(todo.operation_id!);
          // Reset backoff on success
          backoffMs[todo.id] = 0;
          if (response.status === "completed") {
            console.log("✅ [DEBUG] Todo completed, stopping polling for:", todo.id);
            // Clear the interval for this specific todo
            if (intervals[todo.id]) {
              clearInterval(intervals[todo.id]);
              delete intervals[todo.id];
            }
            
            const execIdResolved: string | undefined = (todo as any).exec_id;
            await updateTodoStatus(
              todo.id,
              "completed",
              todo.operation_id,
              execIdResolved,
              response.results,
              undefined
            );
            // After persisting locally, clean up GCS artifacts
            try {
              const execId = execIdResolved || undefined;
              if (execId) {
                await deleteGcsArtifacts(todo.target_account, execId);
                console.log("🧹 [DEBUG] Deleted GCS artifacts for exec_id:", execId);
              } else {
                console.warn("⚠️ [DEBUG] No exec_id found on todo; skipping artifact deletion");
              }
            } catch (cleanupErr) {
              console.warn("⚠️ [DEBUG] Failed to delete GCS artifacts:", cleanupErr);
            }
            await loadTodos();
          } else if (response.status === "failed") {
            console.log("❌ [DEBUG] Todo failed, stopping polling for:", todo.id);
            // Clear the interval for this specific todo
            if (intervals[todo.id]) {
              clearInterval(intervals[todo.id]);
              delete intervals[todo.id];
            }
            
            const execIdResolved: string | undefined = (todo as any).exec_id;
            await updateTodoStatus(
              todo.id,
              "failed",
              todo.operation_id,
              execIdResolved,
              undefined,
              response.message
            );
            await loadTodos();
          }
        } catch (e: any) {
          console.log("❌ [DEBUG] Todo polling error for:", todo.id);
          console.log("❌ [DEBUG] Todo operation_id:", todo.operation_id);
          console.log("❌ [DEBUG] Todo status:", todo.status);
          console.log("❌ [DEBUG] Error details:", {
            message: e.message,
            name: e.name,
            stack: e.stack,
            fullError: e
          });
          
          // Handle "Operation not found" error specifically
          if (e.message && e.message.includes("Operation not found")) {
            console.log("🔄 [DEBUG] Operation not found, marking todo as failed:", todo.id);
            console.log("🔄 [DEBUG] Clearing operation_id:", todo.operation_id);
            
            // Clear the interval for this specific todo
            if (intervals[todo.id]) {
              clearInterval(intervals[todo.id]);
              delete intervals[todo.id];
            }
            
            // Mark todo as failed with a user-friendly error message
            await updateTodoStatus(
              todo.id,
              "failed",
              undefined, // Clear the operation_id since it's no longer valid
              undefined,
              undefined,
              "The scraping operation was not found. It may have been deleted or expired. You can safely delete this todo and try again."
            );
            await loadTodos();
          } else if (!e.message?.includes("network error")) {
            // For non-network errors, also stop polling and mark as failed
            console.log("🔄 [DEBUG] Non-network error, marking todo as failed:", todo.id);
            
            if (intervals[todo.id]) {
              clearInterval(intervals[todo.id]);
              delete intervals[todo.id];
            }
            
            const execIdResolved: string | undefined = (todo as any).exec_id;
            await updateTodoStatus(
              todo.id,
              "failed",
              todo.operation_id,
              execIdResolved,
              undefined,
              `Error checking status: ${e.message || "Unknown error"}`
            );
            await loadTodos();
          } else {
            // Network errors/timeouts: apply simple backoff by skipping next ticks
            const current = backoffMs[todo.id] || 0;
            const next = Math.min(30000, current > 0 ? current * 2 : 2000);
            backoffMs[todo.id] = next;
            console.log(`⏳ [DEBUG] Network error, backing off ${next}ms for todo ${todo.id}`);
            // Temporarily set inFlight true and release after backoff period to pause interval loop
            setTimeout(() => {
              inFlight[todo.id] = false;
            }, next);
            return; // keep inFlight true for now
          }
          // For non-network handled branches, continue as normal
        } finally {
          // Release only if not in a backoff hold
          if (!(backoffMs[todo.id] && backoffMs[todo.id] > 0)) {
            inFlight[todo.id] = false;
          }
        }
      }, POLLING_INTERVAL);
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [todos]);

  // Todo system functions
  const addTodo = async (todoData: Omit<ScrapingTodo, 'id' | 'created_at' | 'status' | 'manually_completed'>) => {
    try {
      await createTodo(
        todoData.target_account,
        todoData.target_count,
        todoData.bio_agents,
        todoData.batch_size,
        (todoData as any).criteria_preset_id ?? null,
      );
      await loadTodos();
    } catch (err: any) {
      console.error("❌ [DEBUG] Error creating todo:", err);
      throw err;
    }
  };

  const runTodoById = async (todoId: string, criteriaPresetId?: string | null) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        throw new Error("Todo not found");
      }
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, status: 'running', started_at: new Date().toISOString() } : t));
      const execId = await runTodo(todo, criteriaPresetId);
      if (execId) {
        // Persist exec_id on the matching todo in local state for immediate availability
        setTodos(prev => prev.map(t => t.id === todoId ? { ...t, exec_id: execId } : t));
      }
      await loadTodos();
    } catch (err: any) {
      console.error("❌ [DEBUG] Error running todo:", err);
      // Re-sync from backend on error
      await loadTodos();
      throw err;
    }
  };

  const toggleTodoManualCompleteById = async (todoId: string) => {
    try {
      await toggleTodoManualComplete(todoId);
      await loadTodos();
    } catch (err: any) {
      console.error("❌ [DEBUG] Error toggling todo completion:", err);
      throw err;
    }
  };

  const deleteTodoById = async (todoId: string) => {
    try {
      await deleteTodo(todoId);
      await loadTodos();
    } catch (err: any) {
      console.error("❌ [DEBUG] Error deleting todo:", err);
      throw err;
    }
  };

  const downloadTodoResults = async (todo: ScrapingTodo) => {
    if (!todo.results || todo.results.length === 0) {
      alert("No results to download");
      return;
    }
    
    try {
      console.log("🔍 [DEBUG] Preparing todo CSV download for", todo.results.length, "profiles");
      
      // Convert todo results to InstagramProfile format
      const profiles: InstagramProfile[] = todo.results.map((result: any) => ({
        username: result.username || "",
        url: result.url || ""
      }));
      
      // Use the existing downloadCSV function
      await downloadCSV(profiles);
      
      console.log("✅ [DEBUG] Todo CSV download completed");
    } catch (err: any) {
      console.error("❌ [DEBUG] Error downloading todo results:", err);
      alert("Failed to download results");
    }
  };

  return {
    // State
    loginState,
    initializing,
    todos,
    loadingTodos,
    
    // Setters
    setLoginState,
    setTodos,
    
    // Actions
    checkExistingLogin,
    loadTodos,
    addTodo,
    runTodoById,
    toggleTodoManualCompleteById,
    deleteTodoById,
    downloadTodoResults,
  };
}; 