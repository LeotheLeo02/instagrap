import { useAppState } from './hooks/useAppState';
import { useEffect, useState } from 'react';
import { 
  LoadingScreen, 
  LoginCard, 
  ClassificationCriteria,
  TodoList
} from './components';
import { startLogin } from './utils/api';
import { styles } from './utils/styles';

function App() {
  const {
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
    addTodo,
    runTodoById,
    toggleTodoManualCompleteById,
    deleteTodoById,
    downloadTodoResults,
  } = useAppState();

  const [showClassificationCriteria, setShowClassificationCriteria] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const update = () => setIsWide(window.innerWidth >= 1024);
    update();
    window.addEventListener('resize', update);
    // Inject global keyframes for spinners (once)
    if (!document.getElementById('global-spin-keyframes')) {
      const style = document.createElement('style');
      style.id = 'global-spin-keyframes';
      style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
    return () => window.removeEventListener('resize', update);
  }, []);

  // Handle login
  const handleLogin = async () => {
    setLoginState("running");
    try {
      await startLogin();
      setLoginState("done");
    } catch (err: any) {
      console.error(err);
      setLoginState("fail");
      alert(err.message || "An unknown error occurred during the login process.");
    }
  };

  // Removed legacy scraping and previous operations handlers

  // Show loading screen during initialization
  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Instagram Bio Classifier</h1>
      <p style={{ textAlign: 'center', color: '#475569', marginTop: '-6px', marginBottom: '20px' }}>
        Log in, manage scraping tasks as todos, and refine your AI classification prompt.
      </p>

      {/* Sticky header with login actions */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', paddingBottom: 12, marginBottom: 12 }}>
        <LoginCard 
          loginState={loginState}
          onLogin={handleLogin}
          onCheckStatus={checkExistingLogin}
        />
      </div>

      {/* Two-column responsive layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isWide ? '2fr 1fr' : '1fr', gap: '24px' }}>
        {/* Left column: Todos */}
        <div>
          <TodoList 
            todos={todos}
            loadingTodos={loadingTodos}
            loginState={loginState}
            onAddTodo={addTodo}
            onRunTodo={runTodoById}
            onToggleManualComplete={toggleTodoManualCompleteById}
            onDeleteTodo={deleteTodoById}
            onDownloadResults={downloadTodoResults}
            setTodos={setTodos}
          />
        </div>

        {/* Right column: Criteria editor */}
        <div>
          <div style={styles.classificationSection}>
            <div style={styles.classificationHeader}>
              <h2 style={styles.classificationTitle}>Classification Criteria</h2>
              <button 
                onClick={() => setShowClassificationCriteria(v => !v)}
                style={styles.classificationButton}
              >
                {showClassificationCriteria ? 'Hide Editor' : 'Edit Criteria'}
              </button>
            </div>
            {showClassificationCriteria && (
              <ClassificationCriteria onClose={() => setShowClassificationCriteria(false)} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
