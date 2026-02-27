import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, Activity, Clock, User, Bell, ChevronRight, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCasesByPatient, getAppointmentsByCase, getCaseById } from '@/lib/mock-data';
import type { Appointment, MedicalCase } from '@/lib/mock-data';
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
  selectedCase: MedicalCase | null;
}

export const AppointmentContext = createContext<AppointmentContextType>({
  selectedAppointment: null,
  setSelectedAppointment: () => { },
  selectedPatientId: 'P-10101',
  setSelectedPatientId: () => { },
  selectedCase: null,
});

export const useAppointmentContext = () => useContext(AppointmentContext);

export default function DashboardLayout({ role }: { role: 'patient' | 'doctor' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  // For doctors: switchable patient; for patients: hardcoded
  const [selectedPatientId, setSelectedPatientId] = useState('P-10101');
  const cases = useMemo(
    () => getCasesByPatient(selectedPatientId),
    [selectedPatientId]
  );

  // Expand the first case by default
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(() => {
    return new Set(cases.length > 0 ? [cases[0].id] : []);
  });

  const firstCaseApps = cases.length > 0 ? getAppointmentsByCase(cases[0].id) : [];
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(firstCaseApps[0] || null);

  const selectedCase = selectedAppointment ? getCaseById(selectedAppointment.caseId) ?? null : null;

  const toggleCase = (caseId: string) => {
    setExpandedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  // When patient switches, reset selection
  const handlePatientSwitch = (id: string) => {
    setSelectedPatientId(id);
    const newCases = getCasesByPatient(id);
    const firstCase = newCases[0];
    if (firstCase) {
      setExpandedCaseIds(new Set([firstCase.id]));
      const apps = getAppointmentsByCase(firstCase.id);
      setSelectedAppointment(apps[0] || null);
    } else {
      setExpandedCaseIds(new Set());
      setSelectedAppointment(null);
    }
  };

  const navItems = role === 'doctor'
    ? [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/doctor' },
    ]
    : [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/patient' },
    ];

  const getCaseStatusStyle = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'Closed': return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getAppStatusDot = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-400';
      case 'Pending': return 'bg-amber-400';
      case 'Review Required': return 'bg-red-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <AppointmentContext.Provider value={{ selectedAppointment, setSelectedAppointment, selectedPatientId, setSelectedPatientId: handlePatientSwitch, selectedCase }}>
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
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

          {/* Case explorer heading */}
          <div className="px-4 pb-2 shrink-0">
            <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
              {role === 'doctor' ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              {role === 'doctor' ? 'Patient Cases' : 'My Cases'}
            </h3>
          </div>

          {/* Case / Appointment Tree (scrollable) */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 pb-3 space-y-1.5">
              {cases.map((medCase) => {
                const isExpanded = expandedCaseIds.has(medCase.id);
                const caseApps = getAppointmentsByCase(medCase.id);
                const isActiveCase = selectedCase?.id === medCase.id;

                return (
                  <div key={medCase.id} className="group">
                    {/* Case Folder Header */}
                    <button
                      onClick={() => toggleCase(medCase.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 relative ${isActiveCase
                          ? 'bg-gradient-to-r from-brand-teal/10 to-brand-mint/10 dark:from-brand-teal/15 dark:to-brand-mint/5 shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                    >
                      {/* Expand chevron */}
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className={`w-3.5 h-3.5 ${isActiveCase ? 'text-brand-teal' : 'text-slate-400'}`} />
                      </div>

                      {/* Emoji icon with gradient bg */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-all duration-200 ${isActiveCase
                          ? 'bg-gradient-to-br from-brand-teal/20 to-brand-lime/20 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700'
                        }`}>
                        {medCase.icon}
                      </div>

                      {/* Case info */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-semibold truncate block leading-tight ${isActiveCase ? 'text-brand-plum dark:text-brand-lime' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                          {medCase.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${getCaseStatusStyle(medCase.status)}`}>
                            {medCase.status}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                            {caseApps.length} visit{caseApps.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Nested Appointments */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                    >
                      <div className="ml-4 pl-4 border-l-2 border-slate-100 dark:border-slate-800 mt-1 mb-1 space-y-0.5">
                        {caseApps.map((app) => {
                          const isSelected = selectedAppointment?.id === app.id;
                          return (
                            <button
                              key={app.id}
                              onClick={() => setSelectedAppointment(app)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all duration-150 relative group/item ${isSelected
                                  ? 'bg-brand-teal/8 dark:bg-brand-teal/10'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                              {/* Active indicator bar */}
                              {isSelected && (
                                <div className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-brand-teal rounded-r-full" />
                              )}

                              {/* Status dot */}
                              <div className={`w-2 h-2 rounded-full shrink-0 ${getAppStatusDot(app.status)} ${isSelected ? 'ring-2 ring-brand-teal/20' : ''
                                }`} />

                              {/* Appointment info */}
                              <div className="flex-1 min-w-0">
                                <span className={`text-[13px] font-medium truncate block leading-tight ${isSelected ? 'text-brand-teal dark:text-brand-lime' : 'text-slate-600 dark:text-slate-400 group-hover/item:text-slate-800 dark:group-hover/item:text-slate-200'
                                  }`}>
                                  {app.topic}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                                  {new Date(app.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {cases.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-4">No cases found</p>
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
                        {role === 'doctor' ? 'Dr. Sarah Jenkins' : 'Jane Doe'}
                      </p>
                      <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                        {role === 'doctor' ? 'Provider ID: D-4099' : 'Patient ID: P-10101'}
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
