import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import { 
  TrendingUp, 
  Users, 
  GraduationCap, 
  ShieldAlert, 
  Database, 
  PieChart,
  Activity,
  Layers
} from 'lucide-react';

export const AdminAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/summary');
        setData(res.data);
      } catch (e) {
        console.error('Failed to load admin analytics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading system analytics...</div>;
  }

  const kpis = data?.kpis || {};
  const departmentCounts = data?.departmentCounts || {};
  const batchCounts = data?.batchCounts || {};
  const scoreBrackets = data?.scoreBrackets || { '80-100': 0, '60-79': 0, '40-59': 0, '0-39': 0 };
  const questionDifficulty = data?.questionDifficulty || { Easy: 0, Medium: 0, Hard: 0 };

  const statCards = [
    { title: 'Total Accounts', value: kpis.totalUsers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Students', value: kpis.totalStudents ?? 0, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Trainers', value: kpis.totalTrainers ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Total Questions', value: kpis.totalQuestions ?? 0, icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'System Avg Score', value: `${kpis.avgScore ?? 0}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'System Violations', value: kpis.totalViolations ?? 0, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const deptEntries = Object.entries(departmentCounts);
  const batchEntries = Object.entries(batchCounts);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
          <Activity className="h-4 w-4" />
          <span>System-Wide Analytics</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Platform Telemetry & Performance</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          System-level user distributions, assessment attempts, question bank metrics, and proctoring telemetry.
        </p>
      </div>

      {/* KPI Grid */}
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

      {/* Department & Role Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <Card className="border border-slate-200 lg:col-span-2">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Department Enrollment & Batch Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Departments</h4>
              {deptEntries.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {deptEntries.map(([dept, count]: [string, any]) => (
                    <div key={dept} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">{dept}</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{count} users</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No department records yet.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Graduation Batches</h4>
              {batchEntries.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {batchEntries.map(([batch, count]: [string, any]) => (
                    <div key={batch} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Batch {batch}</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{count} students</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No batch records yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-600" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {Object.entries(scoreBrackets).map(([bracket, count]: [string, any]) => {
              const total = kpis.submittedAttempts || 1;
              const pct = Math.round(((count as number) / total) * 100);
              const colorMap: Record<string, string> = {
                '80-100': 'bg-emerald-500',
                '60-79': 'bg-blue-500',
                '40-59': 'bg-amber-500',
                '0-39': 'bg-rose-500'
              };
              return (
                <div key={bracket} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{bracket}% Range</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
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

      {/* Question Difficulty & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-slate-200">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              Question Difficulty Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs font-semibold text-green-700">Easy</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{questionDifficulty.Easy || 0}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700">Medium</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{questionDifficulty.Medium || 0}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs font-semibold text-red-700">Hard</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{questionDifficulty.Hard || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
