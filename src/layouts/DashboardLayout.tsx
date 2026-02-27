import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Activity, Calendar, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAppointmentsByPatient, patients } from '@/lib/mock-data';
import type { Appointment } from '@/lib/mock-data';
import { createContext, useContext, useState, useMemo } from 'react';

// Context to share selected appointment across pages
interface AppointmentContextType {
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (a: Appointment | null) => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
}

export const AppointmentContext = createContext<AppointmentContextType>({
  selectedAppointment: null,
  setSelectedAppointment: () => {},
  selectedPatientId: 'PT-1001',
  setSelectedPatientId: () => {},
});

export const useAppointmentContext = () => useContext(AppointmentContext);

export default function DashboardLayout({ role }: { role: 'patient' | 'doctor' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // For doctors: switchable patient; for patients: hardcoded
  const [selectedPatientId, setSelectedPatientId] = useState('PT-1001');
  const appointments = useMemo(
    () => getAppointmentsByPatient(selectedPatientId),
    [selectedPatientId]
  );
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(appointments[0] || null);

  // When patient switches, reset selection
  const handlePatientSwitch = (id: string) => {
    setSelectedPatientId(id);
    const newApps = getAppointmentsByPatient(id);
    setSelectedAppointment(newApps[0] || null);
  };

  const navItems = role === 'doctor' 
    ? [
        { label: 'Overview', icon: LayoutDashboard, path: '/doctor' },
        { label: 'Patients', icon: Users, path: '/doctor/patients' },
        { label: 'AI Analytics', icon: FileText, path: '/doctor/analytics' },
      ]
    : [
        { label: 'My Health', icon: LayoutDashboard, path: '/patient' },
        { label: 'Records', icon: FileText, path: '/patient/records' },
      ];

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case 'Review Required': return 'bg-red-50 text-red-700 border-red-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <AppointmentContext.Provider value={{ selectedAppointment, setSelectedAppointment, selectedPatientId, setSelectedPatientId: handlePatientSwitch }}>
      <div className="flex h-screen bg-slate-50/50 font-sans">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          {/* Logo */}
          <div className="h-14 flex items-center px-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 text-blue-600">
              <Activity className="w-6 h-6" />
              <span className="text-xl font-bold tracking-tight">MediCore</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1 shrink-0">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname === item.path + '/';
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="px-4 py-2 shrink-0">
            <div className="border-t border-slate-100"></div>
          </div>

          {/* Appointment explorer heading */}
          <div className="px-4 pb-2 shrink-0">
            <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
              {role === 'doctor' ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              {role === 'doctor' ? 'Patient History' : 'Appointments'}
            </h3>
          </div>

          {/* Appointment List (scrollable) */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 pb-3 space-y-0.5">
              {appointments.map((app) => {
                const isSelected = selectedAppointment?.id === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppointment(app)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex flex-col gap-1.5 transition-all relative ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-500 rounded-r-full"></div>
                    )}
                    <span className="text-sm font-semibold truncate leading-tight">{app.topic}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {new Date(app.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${getSeverityStyle(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                  </button>
                );
              })}
              {appointments.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-4">No appointments found</p>
              )}
            </div>
          </ScrollArea>

          {/* Bottom: Sign Out */}
          <div className="p-3 border-t border-slate-100 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign Out
            </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
            <h2 className="text-lg font-semibold text-slate-800 capitalize">
              {role === 'doctor' ? 'Provider Portal' : 'Patient Portal'}
            </h2>
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                {role === 'doctor' ? 'Dr' : 'Pt'}
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto h-full animate-in fade-in duration-300">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </AppointmentContext.Provider>
  );
}
