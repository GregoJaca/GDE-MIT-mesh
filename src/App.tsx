import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Patient Routes */}
        <Route path="/patient" element={<DashboardLayout role="patient" />}>
          <Route index element={<PatientDashboard />} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={<DashboardLayout role="doctor" />}>
          <Route index element={<DoctorDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
