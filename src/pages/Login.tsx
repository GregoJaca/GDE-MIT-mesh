import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Stethoscope, UserIcon, Activity } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'patient') {
      navigate('/patient');
    } else {
      navigate('/doctor');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-b-[4rem] -z-10 shadow-lg" />
      
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8 text-white">
          <Activity className="w-12 h-12" />
          <h1 className="text-3xl font-bold tracking-tight">MediCore</h1>
          <p className="text-blue-100 font-medium">Next-Gen Medical Platform</p>
        </div>

        <Card className="w-full shadow-2xl border-0 overflow-hidden relative bg-white/95 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center mt-2">Welcome Back</CardTitle>
            <CardDescription className="text-center text-slate-500">
              Sign in to access your secure portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="patient" className="w-full" onValueChange={setRole}>
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-slate-100/50 p-1">
                <TabsTrigger value="patient" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-sm font-medium rounded-md transition-all">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Patient
                </TabsTrigger>
                <TabsTrigger value="doctor" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-sm font-medium rounded-md transition-all">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Doctor
                </TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="hello@example.com" defaultValue="test@example.com" required className="h-11 bg-slate-50/50" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
                        Forgot password?
                      </a>
                    </div>
                    <Input id="password" type="password" required className="h-11 bg-slate-50/50" value="demo" readOnly />
                  </div>
                  <Button type="submit" className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 shadow-sm transition-all mt-2">
                    Sign In as {role === 'patient' ? 'Patient' : 'Doctor'}
                  </Button>
                </div>
              </form>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-4 bg-slate-50/80">
            <p className="text-sm text-slate-500">
              Don't have an account? <a href="#" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">Sign up</a>
            </p>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-slate-500 mt-8 max-w-sm mx-auto">
          By signing in, you agree to our Terms of Service and Privacy Policy. Securely encrypted.
        </p>
      </div>
    </div>
  );
}
