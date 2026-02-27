import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, Activity, Calendar, Clock, User, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAppointmentsByPatient } from '@/lib/mock-data';
import type { Appointment } from '@/lib/mock-data';
import { createContext, useContext, useState, useMemo } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const { theme, setTheme } = useTheme();

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
        { label: 'Dashboard', icon: LayoutDashboard, path: '/doctor' },
      ]
    : [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/patient' },
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
      <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 font-sans transition-colors">
        {/* Sidebar */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-10 transition-colors">
          {/* Logo */}
          <div className="h-14 flex items-center px-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 text-brand-teal">
              <Activity className="w-6 h-6" />
              <span className="text-xl font-bold tracking-tight text-brand-plum">MediCore</span>
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
                      ? 'bg-brand-teal/10 text-brand-teal shadow-sm' 
                      : 'text-brand-slate hover:bg-slate-50 hover:text-brand-plum'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-teal' : 'text-slate-400'}`} />
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
                        ? 'bg-brand-mint/15 text-brand-plum shadow-sm'
                        : 'text-brand-slate hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-brand-teal rounded-r-full"></div>
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
          <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 transition-colors">
            <h2 className="text-lg font-semibold text-brand-plum dark:text-brand-lime capitalize">
              {role === 'doctor' ? 'Provider Portal' : 'Patient Portal'}
            </h2>
            <div className="flex items-center gap-4">
              
              {/* Settings Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-2 text-slate-400 dark:text-slate-300 hover:bg-brand-mint/10 hover:text-brand-teal rounded-full transition-colors focus:outline-none">
                    <Settings className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-brand-plum dark:text-white">Settings</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                      Manage your application preferences and display settings.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode" className="text-base text-slate-900 dark:text-white">Dark Mode</Label>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Toggle between light and dark themes.
                        </p>
                      </div>
                      <Switch 
                        id="dark-mode" 
                        checked={theme === 'dark'} 
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <div className="w-9 h-9 rounded-full bg-brand-lime/20 flex items-center justify-center text-brand-teal font-bold border border-brand-lime/50 hover:bg-brand-lime/40 cursor-pointer transition-colors">
                    {role === 'doctor' ? 'Dr' : 'Pt'}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 dark:border-slate-800">
                  <DropdownMenuLabel className="font-normal text-slate-800 dark:text-slate-200">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-brand-plum dark:text-brand-lime">
                        {role === 'doctor' ? 'Dr. Sarah Jenkins' : 'Mark Smith'}
                      </p>
                      <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                        {role === 'doctor' ? 'Provider ID: DR-002' : 'Patient ID: PT-1001'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="dark:bg-slate-800" />
                  <DropdownMenuItem className="cursor-pointer dark:focus:bg-slate-800 dark:text-slate-200">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dark:focus:bg-slate-800 dark:text-slate-200">
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="dark:bg-slate-800" />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50" 
                    onClick={() => navigate('/')}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
