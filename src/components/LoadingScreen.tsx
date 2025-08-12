import { LoadingScreenProps } from '../types';
import { styles } from '../utils/styles';
import { STATUS_MESSAGES } from '../constants';

export const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <main style={styles.main}>
      <div style={styles.loadingScreen}>
        <div style={styles.loadingSpinner}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <g>
              <circle cx="12" cy="12" r="9" stroke="#cbd5e1" strokeWidth="2" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </g>
          </svg>
        </div>
        <h2 style={{...styles.h2, marginBottom: "0.5rem"}}>
          {STATUS_MESSAGES.INITIALIZING}
        </h2>
        <p style={styles.note}>
          {message || STATUS_MESSAGES.INITIALIZING_DESCRIPTION}
        </p>
      </div>
    </main>
  );
}; 