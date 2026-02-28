import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, Activity, ChevronRight, Shield } from 'lucide-react';
import type { UserRole } from '@/types';
import { fetchPatients } from '@/services/patient.service';
import type { Patient } from '@/types';

// Predefined demo accounts — maps to real DB entries
const DOCTOR_ACCOUNTS = [
    { id: 'D-99', name: 'Dr. Sarah Miller', specialty: 'General Practitioner', seal: 'S-Miller-99' },
    { id: 'D-02', name: 'Dr. John Cardio', specialty: 'Cardiologist', seal: 'S-Cardio-02' },
    { id: 'D-05', name: 'Dr. Maria Derm', specialty: 'Dermatologist', seal: 'S-Derm-05' },
];

export default function Login() {
    const navigate = useNavigate();
    const [role, setRole] = useState<UserRole>('doctor');
    const [selectedId, setSelectedId] = useState<string>('D-99');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPatients()
            .then(setPatients)
            .catch(() => setPatients([]));
    }, []);

    // Reset selection when role changes
    const handleRoleSwitch = (r: UserRole) => {
        setRole(r);
        setSelectedId(r === 'doctor' ? 'D-99' : '');
    };

    const handleLogin = () => {
        if (!selectedId) return;
        setLoading(true);
        setTimeout(() => navigate(role === 'patient' ? '/patient' : '/doctor'), 300);
    };

    const accounts = role === 'doctor' ? DOCTOR_ACCOUNTS : patients.map(p => ({
        id: p.id,
        name: p.name,
        specialty: 'Patient',
        seal: p.id,
    }));

    const currentName = accounts.find(a => a.id === selectedId)?.name ?? '';

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left — branding panel */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-zinc-950 p-12 border-r border-zinc-900">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
                        <Activity className="w-5 h-5 text-zinc-950" strokeWidth={2.5} />
                    </div>
                    <span className="text-white font-semibold tracking-tight text-lg">MESH</span>
                </div>

                <div>
                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-6">Clinical Platform</p>
                    <h2 className="text-white text-4xl font-bold leading-tight tracking-tight">
                        Zero-hallucination<br />clinical AI.
                    </h2>
                    <p className="text-zinc-500 mt-4 text-sm leading-relaxed">
                        Voice-to-structured-report pipeline with Presidio PII scrubbing,
                        LLM extraction guardrails, and SOAP PDF generation.
                    </p>

                    <div className="mt-12 space-y-4">
                        {[
                            'PII-scrubbed before every LLM call',
                            'Verbatim quote guardrail — no hallucinations',
                            'SOAP PDF generated from structured JSON',
                        ].map(f => (
                            <div key={f} className="flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                </div>
                                <span className="text-zinc-400 text-sm">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-600 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Hackathon Demo — GDE MIT Mesh 2026</span>
                </div>
            </div>

            {/* Right — login panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                {/* Mobile brand */}
                <div className="flex lg:hidden items-center gap-2 mb-12">
                    <div className="w-7 h-7 bg-zinc-950 rounded-sm flex items-center justify-center">
                        <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-zinc-900 text-lg tracking-tight">MESH</span>
                </div>

                <div className="w-full max-w-sm">
                    <div className="mb-10">
                        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Sign in</h1>
                        <p className="text-zinc-400 text-sm mt-1">Select your account to continue.</p>
                    </div>

                    {/* Role toggle */}
                    <div className="flex rounded-lg border border-zinc-200 p-0.5 mb-8 bg-zinc-50">
                        {(['doctor', 'patient'] as UserRole[]).map(r => (
                            <button
                                key={r}
                                onClick={() => handleRoleSwitch(r)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-150 ${role === r
                                        ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                                        : 'text-zinc-400 hover:text-zinc-600'
                                    }`}
                            >
                                {r === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                {r === 'doctor' ? 'Doctor' : 'Patient'}
                            </button>
                        ))}
                    </div>

                    {/* Account cards */}
                    <div className="space-y-2 mb-8">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">
                            {role === 'doctor' ? 'Clinical Accounts' : 'Patient Accounts'}
                        </p>
                        {accounts.length === 0 && (
                            <div className="py-6 text-center text-zinc-400 text-sm border border-zinc-100 rounded-lg">
                                Loading accounts…
                            </div>
                        )}
                        {accounts.map(account => (
                            <button
                                key={account.id}
                                onClick={() => setSelectedId(account.id)}
                                className={`w-full flex items-center gap-4 p-3.5 rounded-lg border text-left transition-all duration-100 group ${selectedId === account.id
                                        ? 'border-zinc-900 bg-zinc-950 text-white'
                                        : 'border-zinc-100 hover:border-zinc-300 bg-white text-zinc-800'
                                    }`}
                            >
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold ${selectedId === account.id
                                        ? 'bg-white/10 text-white'
                                        : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                    {account.name.split(' ').filter(w => w[0] === w[0]?.toUpperCase() && !w.startsWith('Dr')).map(w => w[0]).join('').slice(0, 2).toUpperCase() || account.name.slice(0, 2).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${selectedId === account.id ? 'text-white' : 'text-zinc-900'}`}>
                                        {account.name}
                                    </p>
                                    <p className={`text-xs truncate ${selectedId === account.id ? 'text-zinc-400' : 'text-zinc-400'}`}>
                                        {account.specialty === 'Patient' ? `ID: ${account.id}` : account.specialty}
                                    </p>
                                </div>

                                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${selectedId === account.id ? 'text-white translate-x-0.5' : 'text-zinc-300'
                                    }`} />
                            </button>
                        ))}
                    </div>

                    {/* Continue button */}
                    <button
                        onClick={handleLogin}
                        disabled={!selectedId || loading}
                        className="w-full h-11 bg-zinc-950 text-white text-sm font-semibold rounded-lg
                                   hover:bg-zinc-800 active:scale-[0.99] transition-all duration-100
                                   disabled:opacity-30 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                            <>
                                Continue as {currentName ? currentName.split(' ')[0] : '—'}
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-zinc-300 mt-6">
                        Demo environment — no credentials required.
                    </p>
                </div>
            </div>
        </div>
    );
}
