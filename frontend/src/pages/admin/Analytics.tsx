import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, GraduationCap, ShieldAlert, Database, 
  Activity, Layers, FileText, Clock, BookOpen, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Trophy, AlertTriangle
} from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const SCORE_COLORS = { '80-100': '#22c55e', '60-79': '#3b82f6', '40-59': '#f59e0b', '0-39': '#ef4444' };
const DIFFICULTY_COLORS = { 'Easy': '#22c55e', 'Medium': '#f59e0b', 'Hard': '#ef4444' };

export const AdminAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/admin');
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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading platform analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-slate-500">No analytics data available.</div>;
  }

  const { kpis = {}, departmentCounts = {}, batchCounts = {}, scoreBrackets = {}, questionDifficulty = {}, questionCategories = [], roleDistribution = {}, autoSubmitRate = {}, topTests = [], bottomTests = [], userGrowth = [], testActivity = [] } = data;

  const statCards = [
    { title: 'Total Users', value: kpis.totalUsers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { title: 'Students', value: kpis.totalStudents ?? 0, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { title: 'Trainers', value: kpis.totalTrainers ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { title: 'Total Tests', value: kpis.totalTests ?? 0, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    { title: 'Questions in Bank', value: kpis.totalQuestions ?? 0, icon: Database, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { title: 'Avg Score', value: `${kpis.avgScore ?? 0}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { title: 'Completion Rate', value: `${kpis.completionRate ?? 0}%`, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
    { title: 'Avg Duration', value: `${kpis.avgDuration ?? 0}m`, icon: Clock, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { title: 'Violations', value: kpis.totalViolations ?? 0, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  ];

  // Prepare chart data
  const deptChartData = Object.entries(departmentCounts).map(([name, value]) => ({ name, value: value as number }));
  const scoreChartData = Object.entries(scoreBrackets).map(([name, value]) => ({ name: `${name}%`, value: value as number, bracket: name }));
  const difficultyChartData = Object.entries(questionDifficulty).map(([name, value]) => ({ name, value: value as number }));
  const roleChartData = Object.entries(roleDistribution).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: value as number }));
  const autoSubmitData = [
    { name: 'Manual', value: autoSubmitRate.submitted || 0 },
    { name: 'Auto', value: autoSubmitRate.autoSubmitted || 0 },
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3">
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

      {/* Row 1: Role Distribution + Score Distribution + Auto-Submit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Distribution Donut */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              User Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <RechartsPie>
                <Pie
                  data={roleChartData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {roleChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </RechartsPie>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreChartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Students">
                  {scoreChartData.map((entry, i) => (
                    <Cell key={i} fill={SCORE_COLORS[entry.bracket as keyof typeof SCORE_COLORS] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Auto-Submit vs Manual */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Submission Type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <RechartsPie>
                <Pie
                  data={autoSubmitData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Department Enrollment + Question Difficulty + Question Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Enrollment Bar */}
        <Card className="border border-slate-200 lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Department Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptChartData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No department data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Question Difficulty Donut */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              Question Difficulty
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={difficultyChartData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {difficultyChartData.map((entry, i) => (
                    <Cell key={i} fill={DIFFICULTY_COLORS[entry.name as keyof typeof DIFFICULTY_COLORS] || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Question Category Coverage */}
      {questionCategories.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
              Question Category Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={questionCategories} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Questions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 4: User Growth + Test Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userGrowth.length > 0 && (
          <Card className="border border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                User Growth Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="students" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="Students" />
                  <Area type="monotone" dataKey="trainers" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} name="Trainers" />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {testActivity.length > 0 && (
          <Card className="border border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Test Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={testActivity.slice(-14)} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="submitted" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Manual" />
                  <Bar dataKey="autoSubmitted" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Auto-Submit" />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 5: Top & Bottom Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topTests.length > 0 && (
          <Card className="border border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-slate-50 border-b py-3 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                Top Performing Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Test</th>
                      <th className="px-4 py-2.5 text-center">Avg</th>
                      <th className="px-4 py-2.5 text-center">Pass Rate</th>
                      <th className="px-4 py-2.5 text-right">Subs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topTests.map((t: any, i: number) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 max-w-[200px] truncate">{t.title}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-700">{t.avgScore}%</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t.passRate}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{t.submissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {bottomTests.length > 0 && (
          <Card className="border border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-50 to-slate-50 border-b py-3 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Lowest Performing Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Test</th>
                      <th className="px-4 py-2.5 text-center">Avg</th>
                      <th className="px-4 py-2.5 text-center">Pass Rate</th>
                      <th className="px-4 py-2.5 text-right">Subs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bottomTests.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 max-w-[200px] truncate">{t.title}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-rose-700">{t.avgScore}%</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {t.passRate}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{t.submissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 6: Batch Distribution */}
      {Object.keys(batchCounts).length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Batch Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(batchCounts).map(([batch, count]: [string, any]) => (
                <div key={batch} className="p-3 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 text-center hover:shadow-sm transition-all">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Batch {batch}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                  <p className="text-[10px] text-slate-500">students</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
