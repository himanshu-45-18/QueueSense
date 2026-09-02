import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Navbar, Footer } from './components/Layout';
import { NotificationBanner } from './components/NotificationBanner';

import Landing from './pages/Landing';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QueueDisplay from './pages/QueueDisplay';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/patient" element={<PatientDashboard />} />
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/queue-display" element={<QueueDisplay />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </main>
            <Footer />
            <NotificationBanner />
          </div>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
