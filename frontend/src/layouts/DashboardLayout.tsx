import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, Activity, ChevronRight, Calendar, User, ChevronDown, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/shared/ThemeProvider';
import {
    fetchCasesByPatient,
    fetchAppointmentsByCase,
    setCasesCache,
    setAppointmentsCache,
} from '@/stores/appointment.store';
import { fetchPatients } from '@/services/patient.service';
import type { Appointment, MedicalCase, Patient, UserRole } from '@/types';

interface AppointmentContextType {
    selectedAppointment: Appointment | null;
    setSelectedAppointment: (a: Appointment | null) => void;
    selectedPatientId: string;
    setSelectedPatientId: (id: string) => void;
    selectedCase: MedicalCase | null;
}

const DEFAULT_PATIENT_ID = 'P-10101';

export const AppointmentContext = createContext<AppointmentContextType>({
    selectedAppointment: null,
    setSelectedAppointment: () => { },
    selectedPatientId: DEFAULT_PATIENT_ID,
    setSelectedPatientId: () => { },
    selectedCase: null,
});

export const useAppointmentContext = () => useContext(AppointmentContext);

function statusDot(status: string) {
    switch (status) {
        case 'Completed': return 'bg-zinc-400';
        case 'Pending': return 'bg-zinc-600';
        case 'Review Required': return 'bg-zinc-900 dark:bg-zinc-100';
        default: return 'bg-zinc-300';
    }
}

export default function DashboardLayout({ role }: { role: UserRole }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientIdState] = useState(DEFAULT_PATIENT_ID);
    const [cases, setCases] = useState<MedicalCase[]>([]);
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(new Set());
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    useEffect(() => {
        fetchPatients().then(setPatients).catch(console.error);
    }, []);

    const loadPatientData = useCallback(async (patientId: string) => {
        setIsLoading(true);
        setSelectedAppointment(null);
        try {
            const fetchedCases = await fetchCasesByPatient(patientId);
            setCases(fetchedCases);
            setCasesCache(fetchedCases);
            const allApps: Appointment[] = [];
            for (const c of fetchedCases) {
                const apps = await fetchAppointmentsByCase(c.id);
                allApps.push(...apps);
            }
            setAllAppointments(allApps);
            setAppointmentsCache(allApps);
            if (fetchedCases.length > 0) {
                setExpandedCaseIds(new Set([fetchedCases[0].id]));
                const firstApps = allApps.filter(a => a.caseId === fetchedCases[0].id);
                setSelectedAppointment(firstApps[0] || null);
            } else {
                setExpandedCaseIds(new Set());
            }
        } catch (err) {
            console.error(err);
            setCases([]);
            setAllAppointments([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadPatientData(selectedPatientId); }, [selectedPatientId, loadPatientData]);

    const handlePatientSwitch = (id: string) => setSelectedPatientIdState(id);

    const selectedCase = selectedAppointment
        ? cases.find(c => c.id === selectedAppointment.caseId) ?? null
        : null;

    const getAppointmentsForCase = useCallback((caseId: string) =>
        allAppointments
            .filter(a => a.caseId === caseId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [allAppointments]);

    const toggleCase = (caseId: string) => {
        setExpandedCaseIds(prev => {
            const next = new Set(prev);
            next.has(caseId) ? next.delete(caseId) : next.add(caseId);
            return next;
        });
    };

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const isDoctor = role === 'doctor';

    return (
        <AppointmentContext.Provider value={{
            selectedAppointment, setSelectedAppointment,
            selectedPatientId, setSelectedPatientId: handlePatientSwitch,
            selectedCase,
        }}>
            <div className="flex h-screen bg-white dark:bg-zinc-950 font-sans">
                {/* Sidebar */}
                <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
                    {/* Logo */}
                    <div className="h-14 flex items-center px-5 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-zinc-900 dark:text-zinc-100" strokeWidth={1.5} />
                            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase letter-spacing-wider">
                                MediCore
                            </span>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="px-3 pt-3 pb-2 shrink-0">
                        {[{ label: 'Dashboard', icon: LayoutDashboard, path: isDoctor ? '/doctor' : '/patient' }].map(item => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mx-3 border-t border-zinc-100 dark:border-zinc-900" />

                    {/* Patient selector */}
                    <div className="px-3 pt-3 pb-2 shrink-0">
                        <p className="text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase mb-2 px-1">
                            Patient
                        </p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                            {selectedPatient?.name ?? selectedPatientId}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-mono">{selectedPatientId}</p>
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-lg p-1">
                                <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-2 py-1.5">
                                    Select Patient
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 mx-1" />
                                {patients.length === 0
                                    ? <div className="px-3 py-2 text-xs text-zinc-400">Loading…</div>
                                    : patients.map(p => (
                                        <DropdownMenuItem
                                            key={p.id}
                                            onClick={() => handlePatientSwitch(p.id)}
                                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm ${p.id === selectedPatientId
                                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate">{p.name}</p>
                                                <p className="text-[10px] font-mono opacity-60">{p.id}</p>
                                            </div>
                                        </DropdownMenuItem>
                                    ))
                                }
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="mx-3 border-t border-zinc-100 dark:border-zinc-900" />

                    {/* Cases */}
                    <div className="px-3 pt-3 pb-1 shrink-0">
                        <p className="text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase px-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" strokeWidth={1.5} />
                                Cases
                            </span>
                            {!isLoading && <span className="tabular-nums">{cases.length}</span>}
                        </p>
                    </div>

                    <ScrollArea className="flex-1 min-h-0">
                        <div className="px-3 pb-3 space-y-0.5">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-4 h-4 border border-zinc-300 dark:border-zinc-700 border-t-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin" />
                                </div>
                            ) : cases.map(medCase => {
                                const isExpanded = expandedCaseIds.has(medCase.id);
                                const caseApps = getAppointmentsForCase(medCase.id);
                                const isActiveCase = selectedCase?.id === medCase.id;

                                return (
                                    <div key={medCase.id}>
                                        <button
                                            onClick={() => toggleCase(medCase.id)}
                                            className={`w-full text-left px-2.5 py-2 rounded-md flex items-center gap-2 transition-colors ${isActiveCase
                                                ? 'bg-zinc-100 dark:bg-zinc-900'
                                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                                                }`}
                                        >
                                            <ChevronRight
                                                className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                                                strokeWidth={1.5}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm truncate leading-tight ${isActiveCase ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                    {medCase.title}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                                                    {medCase.status} &middot; {caseApps.length} visit{caseApps.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="ml-5 pl-3 border-l border-zinc-100 dark:border-zinc-900 mt-0.5 mb-1 space-y-0.5">
                                                {caseApps.map(app => {
                                                    const isSel = selectedAppointment?.id === app.id;
                                                    return (
                                                        <button
                                                            key={app.id}
                                                            onClick={() => setSelectedAppointment(app)}
                                                            className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors ${isSel
                                                                ? 'bg-zinc-900 dark:bg-zinc-100'
                                                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                                                                }`}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(app.status)}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-xs font-medium truncate ${isSel ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                                    {app.topic}
                                                                </p>
                                                                <p className={`text-[10px] tabular-nums ${isSel ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'}`}>
                                                                    {new Date(app.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {cases.length === 0 && !isLoading && (
                                <p className="text-xs text-zinc-400 text-center py-6">No cases found</p>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Sign out */}
                    <div className="px-3 py-3 border-t border-zinc-100 dark:border-zinc-900 shrink-0">
                        <button
                            onClick={() => navigate('/')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main */}
                <main className="flex-1 flex flex-col h-screen overflow-hidden">
                    <header className="h-14 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-8 shrink-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                            {isDoctor ? 'Clinical Workspace' : 'Patient Portal'}
                        </p>
                        <div className="flex items-center gap-3">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                                        <Settings className="w-4 h-4" strokeWidth={1.5} />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                    <DialogHeader>
                                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold">Settings</DialogTitle>
                                        <DialogDescription className="text-zinc-500">Appearance preferences.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="dark-mode" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Dark mode</Label>
                                            </div>
                                            <Switch
                                                id="dark-mode"
                                                checked={theme === 'dark'}
                                                onCheckedChange={c => setTheme(c ? 'dark' : 'light')}
                                            />
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none">
                                    <div className="w-8 h-8 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-white dark:text-zinc-900" strokeWidth={1.5} />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg">
                                    <DropdownMenuLabel className="text-xs text-zinc-400 font-normal">
                                        {isDoctor ? 'Dr. Sarah Miller — D-99' : selectedPatient?.name}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                                    <DropdownMenuItem className="text-sm cursor-pointer dark:text-zinc-300 dark:focus:bg-zinc-800">
                                        <Bell className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} /><span>Notifications</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                                    <DropdownMenuItem
                                        className="text-sm cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                        onClick={() => navigate('/')}
                                    >
                                        <LogOut className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} /><span>Sign Out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    <div className="flex-1 overflow-auto p-6 bg-zinc-50 dark:bg-zinc-950">
                        <Outlet />
                    </div>
                </main>
            </div>
        </AppointmentContext.Provider>
    );
}
