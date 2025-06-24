import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import Timetable from './pages/Timetable';
import Generate from './pages/Generate'; // Import new page
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Loader from './components/Loader';

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
};

function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loader statusMessage="Loading..." />;
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="pt-24 container mx-auto px-6">
        <Routes>
          <Route path="/" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
          <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} /> {/* Add new route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
export default App;
