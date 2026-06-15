/**
 * ProtectedRoute.jsx — Redirects unauthenticated users to /login
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from './LoadingState';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    // Redirect to /login, but remember where they came from
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
