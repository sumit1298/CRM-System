import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Contacts from './pages/Contacts';
import Opportunities from './pages/Opportunities';
import Tasks from './pages/Tasks';
import Interactions from './pages/Interactions';
import Pipeline from './pages/Pipeline';
import Analytics from './pages/Analytics';
import AIPanel from './pages/AIPanel';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="interactions" element={<Interactions />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai" element={<AIPanel />} />
      </Route>
    </Routes>
  );
}

export default App;