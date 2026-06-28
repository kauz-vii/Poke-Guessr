import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }         from './contexts/AuthContext';
import { ToastProvider }        from './contexts/ToastContext';
import { GameSettingsProvider } from './contexts/GameSettingsContext';
import { SocialProvider }      from './contexts/SocialContext';
import ErrorBoundary            from './components/ErrorBoundary';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <SocialProvider>
              <GameSettingsProvider>
                <App />
              </GameSettingsProvider>
            </SocialProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
