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
          <Route path="records" element={<div className="p-8 text-center text-slate-500">Records View Under Construction</div>} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={<DashboardLayout role="doctor" />}>
          <Route index element={<DoctorDashboard />} />
          <Route path="patients" element={<div className="p-8 text-center text-slate-500">Patients List Under Construction</div>} />
          <Route path="analytics" element={<div className="p-8 text-center text-slate-500">AI Analytics Interface Under Construction</div>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
