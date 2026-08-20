import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts';
import { 
  BarChart3, TrendingUp, Users, GraduationCap, FileText, ShieldAlert, 
  Award, Building, Layers, Clock, AlertTriangle, BookOpen, UserCheck,
  Activity
} from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const SCORE_COLORS: Record<string, string> = { '80-100': '#22c55e', '60-79': '#3b82f6', '40-59': '#f59e0b', '0-39': '#ef4444' };

export const InstitutionAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/institution');
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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading campus analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-slate-500">No analytics data available.</div>;
  }

  const { kpis = {}, departments = [], batches = [], scoreBrackets = {}, trainerEffectiveness = [], materialStats = {}, atRiskStudents = [] } = data;

  const statCards = [
    { title: 'Total Enrolled', value: kpis.totalStudents ?? 0, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { title: 'Faculty Trainers', value: kpis.totalTrainers ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { title: 'Total Submissions', value: kpis.totalSubmissions ?? 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { title: 'Campus Avg Score', value: `${kpis.avgScore ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { title: 'Pass Rate (≥60%)', value: `${kpis.passRate ?? 0}%`, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { title: 'Active Tests', value: kpis.activeTests ?? 0, icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { title: 'Avg Attempts/Student', value: kpis.avgAttemptsPerStudent ?? 0, icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
    { title: 'Integrity Flags', value: kpis.totalViolations ?? 0, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  ];

  // Chart data
  const deptChartData = departments.map((d: any) => ({
    name: d.department,
    avgScore: d.avgScore,
    passRate: d.passRate,
    students: d.students,
  }));
  const scoreChartData = Object.entries(scoreBrackets).map(([name, value]) => ({ name: `${name}%`, value: value as number, bracket: name }));
  const materialTypeData = materialStats.byType ? Object.entries(materialStats.byType).map(([name, value]) => ({ name: name.toUpperCase(), value: value as number })) : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs">
          <p className="font-semibold text-slate-900">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const filteredAtRisk = atRiskStudents.filter((s: any) =>
    !riskFilter || s.name?.toLowerCase().includes(riskFilter.toLowerCase()) ||
    s.department?.toLowerCase().includes(riskFilter.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(riskFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {statCards.map((stat, i) => (
          <Card key={i} className={`border ${stat.border} hover:shadow-md transition-all duration-200`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{stat.title}</p>
                  <h3 className="text-lg font-bold text-slate-900">{stat.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Department Performance + Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance Grouped Bar */}
        <Card className="border border-slate-200 lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-600" />
              Department Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptChartData} barGap={4} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Score %" />
                  <Bar dataKey="passRate" fill="#22c55e" radius={[4, 4, 0, 0]} name="Pass Rate %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No departmental data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreChartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Submissions">
                  {scoreChartData.map((entry, i) => (
                    <Cell key={i} fill={SCORE_COLORS[entry.bracket] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Department Table + Batch Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Stats Table */}
        <Card className="border border-slate-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-600" />
              Departmental Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {departments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b">
                    <tr>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5 text-center">Students</th>
                      <th className="px-4 py-2.5 text-center">Attempts</th>
                      <th className="px-4 py-2.5 text-center">Avg</th>
                      <th className="px-4 py-2.5 text-right">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {departments.map((d: any) => (
                      <tr key={d.department} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{d.department}</td>
                        <td className="px-4 py-2.5 text-center text-slate-700">{d.students}</td>
                        <td className="px-4 py-2.5 text-center">{d.attempts}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{d.avgScore}%</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
              <div className="text-center py-12 text-slate-400 text-sm">No departmental data.</div>
            )}
          </CardContent>
        </Card>

        {/* Batch Performance */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Batch-Wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {batches.map((b: any) => (
                <div key={b.batch} className="p-4 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Batch {b.batch}
                    </span>
                    <span className="text-[10px] text-slate-500">{b.students} students</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{b.avgScore}%</p>
                      <p className="text-[10px] text-slate-500">Average Score</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.passRate >= 70 ? 'bg-emerald-50 text-emerald-700' :
                        b.passRate >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {b.passRate}% pass
                      </span>
                    </div>
                  </div>
                  {/* Inline bar */}
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(b.avgScore, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Trainer Effectiveness + Material Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trainer Effectiveness Table */}
        <Card className="border border-slate-200 overflow-hidden lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              Trainer Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {trainerEffectiveness.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b">
                    <tr>
                      <th className="px-4 py-2.5">Trainer</th>
                      <th className="px-4 py-2.5 text-center">Tests</th>
                      <th className="px-4 py-2.5 text-center">Submissions</th>
                      <th className="px-4 py-2.5 text-center">Avg Student Score</th>
                      <th className="px-4 py-2.5 text-right">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {trainerEffectiveness.map((tr: any) => (
                      <tr key={tr.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{tr.name}</td>
                        <td className="px-4 py-2.5 text-center text-slate-700">{tr.testsCreated}</td>
                        <td className="px-4 py-2.5 text-center">{tr.submissions}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{tr.avgStudentScore}%</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tr.passRate >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            tr.passRate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {tr.passRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">No trainer data.</div>
            )}
          </CardContent>
        </Card>

        {/* Material Coverage */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
              Material Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                <p className="text-xl font-bold text-slate-900">{materialStats.total || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Released</p>
                <p className="text-xl font-bold text-emerald-700">{materialStats.released || 0}</p>
              </div>
            </div>
            {materialTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPie>
                  <Pie
                    data={materialTypeData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {materialTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No materials yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: At-Risk Students */}
      {atRiskStudents.length > 0 && (
        <Card className="border border-rose-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-slate-50 border-b py-3 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              At-Risk Students ({atRiskStudents.length})
            </CardTitle>
            <input
              type="text"
              placeholder="Search name, dept, ID..."
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 w-48"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5 text-center">Dept</th>
                    <th className="px-4 py-2.5 text-center">Batch</th>
                    <th className="px-4 py-2.5 text-center">Avg Score</th>
                    <th className="px-4 py-2.5 text-center">Attempts</th>
                    <th className="px-4 py-2.5 text-center">Violations</th>
                    <th className="px-4 py-2.5 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAtRisk.map((s: any) => (
                    <tr key={s.id} className={`transition-colors ${
                      s.avgScore < 30 || s.violations > 5 ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50/60'
                    }`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{s.studentId || '—'}</td>
                      <td className="px-4 py-2.5 text-center">{s.department}</td>
                      <td className="px-4 py-2.5 text-center">{s.batch}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.avgScore >= 60 ? 'bg-emerald-50 text-emerald-700' :
                          s.avgScore >= 40 ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {s.avgScore}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">{s.attempts}</td>
                      <td className="px-4 py-2.5 text-center">
                        {s.violations > 0 ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {s.violations}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] text-slate-500">
                        {s.lastActive ? new Date(s.lastActive).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
