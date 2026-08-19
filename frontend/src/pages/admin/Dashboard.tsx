import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { User, Mail, Shield, Plus, Users } from 'lucide-react';

export const AdminDashboard = () => {
  const { toast } = useToast();

  const [trainers, setTrainers] = useState<any[]>([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTrainers = async () => {
    try {
      const res = await api.get('/users/all');
      const filtered = res.data.filter((u: any) => u.role === 'trainer');
      setTrainers(filtered);
    } catch (e) {
      console.error(e);
      toast('Failed to load trainers', 'error');
    } finally {
      setIsLoadingTrainers(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast('Please fill all fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.registerTrainer({ name, email, password });
      toast('Trainer created successfully', 'success');
      setName('');
      setEmail('');
      setPassword('');
      fetchTrainers();
    } catch (err: any) {
      toast(err.message || 'Failed to create trainer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administrator Dashboard</h1>
        <p className="text-slate-500">Manage trainers and perform system administration tasks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to Add Trainer */}
        <div className="lg:col-span-1">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-blue-600" />
                Add New Trainer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTrainer} className="space-y-4">
                <Input
                  label="Trainer Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trainer@lms.com"
                  required
                />

                <Input
                  label="Set Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                <div className="pt-2">
                  <Button type="submit" className="w-full" isLoading={isSubmitting}>
                    Create Trainer Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Trainers List */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-4 flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-600" />
                Registered Trainers
              </CardTitle>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {trainers.length} Active
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingTrainers ? (
                <div className="text-center py-12 text-slate-500">Loading trainers...</div>
              ) : trainers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4 text-right">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {trainers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm uppercase">
                              {t.name.substring(0, 2)}
                            </div>
                            {t.name}
                          </td>
                          <td className="px-6 py-4">{t.email}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 capitalize">
                              {t.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">No trainers registered</p>
                  <p className="text-sm mt-0.5">Use the side form to register the first trainer.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
