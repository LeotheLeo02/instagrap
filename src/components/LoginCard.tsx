import { LoginCardProps } from '../types';
import { styles } from '../utils/styles';

export const LoginCard = ({ loginState, onLogin, onCheckStatus }: LoginCardProps) => {
  return (
    <section style={styles.loginBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...styles.badge, ...styles.badgeTiny, ...(loginState === 'done' ? styles.badgeCompleted : loginState === 'running' ? styles.badgeRunning : loginState === 'checking' ? styles.badgePending : styles.badgePending)}}>
          {loginState === 'done' ? 'Logged in' : loginState === 'running' ? 'Logging in…' : loginState === 'checking' ? 'Checking…' : 'Login required'}
        </span>
        {loginState === 'running' && (
          <span style={styles.note}>Finish login in the opened browser</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button 
          onClick={onLogin} 
          disabled={loginState === 'running'}
          style={loginState === 'done' ? { ...styles.button, ...styles.smallButton, ...styles.buttonSubtle } : { ...styles.button, ...styles.smallButton }}
          title={loginState === 'done' ? 'Re-login / switch account' : 'Open login'}
        >
          {loginState === 'running' ? 'Logging in…' : (loginState === 'done' ? 'Re-login' : 'Login')}
        </button>
        <button 
          onClick={onCheckStatus}
          disabled={loginState === 'checking'}
          style={{ ...styles.button, ...styles.smallButton, ...styles.buttonSubtle }}
          title="Refresh login status"
        >
          {loginState === 'checking' ? 'Checking…' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}; 