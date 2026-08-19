import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  FileText, 
  ShieldAlert, 
  Award, 
  Building, 
  Layers,
  PieChart
} from 'lucide-react';

export const InstitutionAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/summary');
        setData(res.data);
      } catch (e) {
        console.error('Failed to load institution analytics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading campus analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-16 text-slate-500">No analytics data available.</div>;
  }

  const { kpis, departments = [], batches = [], scoreBrackets = {} } = data;

  const statCards = [
    { title: 'Total Enrolled', value: kpis.totalStudents, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Faculty Trainers', value: kpis.totalTrainers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Total Submissions', value: kpis.totalSubmissions, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Campus Avg Score', value: `${kpis.avgScore}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Pass Rate (>=60%)', value: `${kpis.passRate}%`, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Integrity Flags', value: kpis.totalViolations, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
          <BarChart3 className="h-4 w-4" />
          <span>Institutional Analytics</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Campus Performance Intelligence</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Real-time aggregated department pass rates, batch comparisons, score distributions, and integrity metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department Breakdown & Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Stats Table */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 overflow-hidden h-full">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-600" />
                Departmental Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {departments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Department</th>
                        <th className="px-6 py-3 text-center">Students</th>
                        <th className="px-6 py-3 text-center">Attempts</th>
                        <th className="px-6 py-3 text-center">Avg Score</th>
                        <th className="px-6 py-3 text-right">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {departments.map((d: any) => (
                        <tr key={d.department} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{d.department}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-700">{d.students}</td>
                          <td className="px-6 py-4 text-center">{d.attempts}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-slate-900">{d.avgScore}%</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              d.passRate >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              d.passRate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {d.passRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">No departmental data available.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution Brackets */}
        <div>
          <Card className="border border-slate-200 h-full">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-blue-600" />
                Score Distribution Brackets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {Object.entries(scoreBrackets).map(([bracket, count]: [string, any]) => {
                const total = kpis.totalSubmissions || 1;
                const pct = Math.round((count / total) * 100);
                const colorMap: Record<string, string> = {
                  '80-100': 'bg-emerald-500',
                  '60-79': 'bg-blue-500',
                  '40-59': 'bg-amber-500',
                  '0-39': 'bg-rose-500'
                };
                return (
                  <div key={bracket} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{bracket}% Score Range</span>
                      <span className="text-slate-500">{count} submissions ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorMap[bracket] || 'bg-blue-500'} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Batch Overview Cards */}
      <div>
        <Card className="border border-slate-200">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Batch-Wise Academic Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {batches.map((b: any) => (
                <div key={b.batch} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Batch {b.batch}
                  </span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{b.avgScore}%</p>
                      <p className="text-xs text-slate-500">Average Grade</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-700">{b.students}</p>
                      <p className="text-xs text-slate-400">Students</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
