import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import DashboardLayout from '@/layouts/DashboardLayout';
import PatientDashboard from '@/pages/PatientDashboard';
import DoctorDashboard from '@/pages/DoctorDashboard';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/patient" element={<DashboardLayout role="patient" />}>
                    <Route index element={<PatientDashboard />} />
                </Route>

                <Route path="/doctor" element={<DashboardLayout role="doctor" />}>
                    <Route index element={<DoctorDashboard />} />
                </Route>

                {/* Prevent 404 static assets from triggering SPA redirect to Login */}
                <Route path="/reports/*" element={<div className="p-8 text-center text-slate-500">Report not found (404)</div>} />
                <Route path="/outputs/*" element={<div className="p-8 text-center text-slate-500">Output not found (404)</div>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
