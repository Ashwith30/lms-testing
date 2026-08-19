import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Users, Search, Mail, Building } from 'lucide-react';
import { User } from '../../types';

export const InstitutionTrainers = () => {
  const { toast } = useToast();
  const [trainers, setTrainers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTrainers = async () => {
    try {
      const res = await api.get('/users/all');
      const filtered = res.data.filter((u: User) => u.role === 'trainer');
      setTrainers(filtered);
    } catch (e) {
      console.error(e);
      toast('Failed to load trainers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const filteredTrainers = trainers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Faculty Directory</h1>
          <p className="text-slate-500">
            View registered trainers and department instructors across your institution.
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium">
          Note: Trainer account provisioning is managed by the System Administrator.
        </div>
      </div>

      <Card className="border border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-emerald-600" />
            Registered Faculty ({filteredTrainers.length})
          </CardTitle>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty by name, email, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading faculty directory...</div>
          ) : filteredTrainers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4">Trainer / Faculty</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4 text-right">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTrainers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm uppercase">
                          {t.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{t.name}</p>
                          <p className="text-xs text-slate-400 font-mono">ID: {t.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {t.email}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {t.department || 'General Academic'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
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
              <p className="font-medium text-slate-900">No faculty members found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
