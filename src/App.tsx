import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import Login from './components/auth/Login';
import UserProfileSetup from './components/profile/UserProfile';
import Dashboard from './components/dashboard/Dashboard';
import BottomNav from './components/BottomNav';
import History from './components/history/History';
import Settings from './components/settings/Settings';
import Favorites from './components/favorites/Favorites';
import MustHaves from './components/musthaves/MustHaves';
import Needs from './components/needs/Needs';
import FinancialSummary from './components/summary/FinancialSummary';

import './App.css';
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <main className="pb-20"> {/* Add padding bottom to prevent overlap with nav */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/profile/setup" 
                element={
                  <PrivateRoute>
                    <UserProfileSetup />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/history" 
                element={
                  <PrivateRoute>
                    <History />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/favorites" 
                element={
                  <PrivateRoute>
                    <Favorites />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/needs" 
                element={
                  <PrivateRoute>
                    <Needs />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/summary" 
                element={
                  <PrivateRoute>
                    <FinancialSummary />
                  </PrivateRoute>
                } 
              />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>

          </main>
          <BottomNav />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
