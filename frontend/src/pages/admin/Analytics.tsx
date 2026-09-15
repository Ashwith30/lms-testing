import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Users, GraduationCap, ShieldAlert, FileText, Clock, 
  Activity, Calendar, Download, TrendingUp, TrendingDown,
  BarChart2, BookOpen, Layers, Trophy, Database
} from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];
const SCORE_COLORS = { '0-20': '#bfdbfe', '21-40': '#93c5fd', '41-60': '#60a5fa', '61-80': '#3b82f6', '81-100': '#2563eb' };
const DIFFICULTY_COLORS = { 'Easy': '#c4b5fd', 'Medium': '#a855f7', 'Hard': '#7e22ce' };

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

  const { 
    kpis = {}, departmentCounts = {}, scoreBrackets = {}, questionDifficulty = {}, 
    autoSubmitRate = {}, userGrowth = [], testActivity = [] 
  } = data;

  // Mock Sparkline Data
  const generateSparkline = (trend: 'up' | 'down' | 'flat', base: number) => {
    return Array.from({ length: 7 }).map((_, i) => ({
      value: base + (trend === 'up' ? i * 2 : trend === 'down' ? -i * 2 : Math.sin(i) * 2)
    }));
  };

  const statCards = [
    { title: 'Total Users', value: kpis.totalUsers ?? 0, icon: Users, color: 'text-blue-500', sparkColor: '#3b82f6', trend: '+25%', trendUp: true, sparkData: generateSparkline('up', 10) },
    { title: 'Students', value: kpis.totalStudents ?? 0, icon: GraduationCap, color: 'text-emerald-500', sparkColor: '#22c55e', trend: '+0%', trendUp: true, sparkData: generateSparkline('flat', 10) },
    { title: 'Trainers', value: kpis.totalTrainers ?? 0, icon: Users, color: 'text-purple-500', sparkColor: '#a855f7', trend: '+0%', trendUp: true, sparkData: generateSparkline('flat', 5) },
    { title: 'Total Tests', value: kpis.totalTests ?? 0, icon: FileText, color: 'text-amber-500', sparkColor: '#f59e0b', trend: '-0%', trendUp: false, sparkData: generateSparkline('flat', 8) },
    { title: 'Violations', value: kpis.totalViolations ?? 0, icon: ShieldAlert, color: 'text-rose-500', sparkColor: '#ef4444', trend: '-0%', trendUp: false, sparkData: generateSparkline('flat', 2) },
    { title: 'Avg. Time Spent', value: `${kpis.avgDuration ?? 0}m`, icon: Clock, color: 'text-blue-400', sparkColor: '#60a5fa', trend: '-0%', trendUp: false, sparkData: generateSparkline('flat', 15) },
  ];

  // Enhanced User Growth with Mocked Institutions
  const enhancedUserGrowth = userGrowth.length > 0 ? userGrowth.map((item: any) => ({
    ...item,
    institutions: Math.floor((item.students || 0) * 0.1) // Mocking institutions data
  })) : [
    { month: 'Sep 11', students: 1, trainers: 0, institutions: 0 },
    { month: 'Sep 13', students: 3, trainers: 0, institutions: 0 },
    { month: 'Sep 15', students: 2, trainers: 0, institutions: 0 },
    { month: 'Sep 17', students: 4, trainers: 0, institutions: 0 },
    { month: 'Sep 19', students: 4, trainers: 0, institutions: 0 },
    { month: 'Sep 21', students: 6, trainers: 0, institutions: 0 },
    { month: 'Sep 23', students: 5, trainers: 0, institutions: 0 },
    { month: 'Sep 25', students: 8, trainers: 0, institutions: 0 },
  ];

  // Enhanced Test Activity for Attempts vs Unique Students
  const enhancedTestActivity = testActivity.length > 0 ? testActivity.map((item: any) => ({
    date: item.date,
    attempts: (item.submitted || 0) + (item.autoSubmitted || 0),
    uniqueStudents: Math.max(1, Math.floor(((item.submitted || 0) + (item.autoSubmitted || 0)) * 0.8))
  })) : [
    { date: 'Sep 11', attempts: 5, uniqueStudents: 4 },
    { date: 'Sep 13', attempts: 5, uniqueStudents: 5 },
    { date: 'Sep 15', attempts: 7, uniqueStudents: 6 },
    { date: 'Sep 17', attempts: 10, uniqueStudents: 8 },
    { date: 'Sep 19', attempts: 15, uniqueStudents: 10 },
    { date: 'Sep 21', attempts: 7, uniqueStudents: 5 },
    { date: 'Sep 23', attempts: 8, uniqueStudents: 5 },
    { date: 'Sep 25', attempts: 15, uniqueStudents: 10 },
  ];

  const scoreChartData = Object.keys(scoreBrackets).length > 0 
    ? Object.entries(scoreBrackets).map(([name, value]) => ({ name, value: value as number }))
    : [
        { name: '0-20', value: 2 },
        { name: '21-40', value: 5 },
        { name: '41-60', value: 9 },
        { name: '61-80', value: 14 },
        { name: '81-100', value: 6 }
      ];
  
  const autoSubmitData = Object.keys(autoSubmitRate).length > 0
    ? [
        { name: 'Auto', value: autoSubmitRate.autoSubmitted || 0 },
        { name: 'Manual', value: autoSubmitRate.submitted || 0 },
      ]
    : [
        { name: 'Auto', value: 45 },
        { name: 'Manual', value: 12 },
      ];
  const totalSubmissions = autoSubmitData.reduce((acc, val) => acc + val.value, 0);

  const difficultyChartData = Object.keys(questionDifficulty).length > 0
    ? Object.entries(questionDifficulty).map(([name, value]) => ({ name, value: value as number }))
    : [
        { name: 'Easy', value: 5 },
        { name: 'Medium', value: 12 },
        { name: 'Hard', value: 6 },
      ];

  const deptChartData = Object.keys(departmentCounts).length > 0
    ? Object.entries(departmentCounts).map(([name, value]) => ({ name, value: value as number }))
    : [
        { name: 'Computer Science and Engineering', value: 2 },
        { name: 'Information Technology', value: 1 },
        { name: 'Electronics and Communication', value: 0 },
        { name: 'Mechanical Engineering', value: 0 },
        { name: 'Civil Engineering', value: 0 },
      ];

  // Mock Top Students
  const topStudentsMock = [
    { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: kpis.totalTests > 0 ? kpis.totalTests : 0, avgScore: kpis.avgScore ? `${kpis.avgScore}%` : '-' },
    { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: kpis.totalTests > 0 ? kpis.totalTests : 0, avgScore: kpis.avgScore ? `${kpis.avgScore}%` : '-' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs">
          <p className="font-semibold text-slate-900 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-medium flex items-center justify-between gap-4">
              <span>{p.name}</span>
              <span>{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderDropdown = (text: string) => (
    <select className="text-xs font-medium bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-600 outline-none hover:bg-slate-50 cursor-pointer">
      <option>{text}</option>
    </select>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Analytics</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Telemetry & Performance</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track usage, learning progress and assessment insights across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select className="appearance-none text-sm font-medium bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-slate-700 outline-none hover:bg-slate-50 cursor-pointer shadow-sm">
              <option>Last 30 days</option>
              <option>Last 14 days</option>
              <option>Last 7 days</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <Button variant="outline" className="shadow-sm gap-2 bg-white">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                </div>
              </div>
              <div className="flex items-end justify-between mt-4">
                <div className="text-[10px] font-medium text-slate-400">
                  <span className={`inline-flex items-center gap-0.5 ${stat.trendUp ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.trend}
                  </span>
                  <br />vs last month
                </div>
                <div className="h-8 w-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stat.sparkData}>
                      <Line type="monotone" dataKey="value" stroke={stat.sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: User Growth + Test Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                User Growth
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">New users added over time</p>
            </div>
            {renderDropdown('Last 14 days')}
          </CardHeader>
          <CardContent>
            {enhancedUserGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={enhancedUserGrowth} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="students" name="Students" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="trainers" name="Trainers" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="institutions" name="Institutions" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">No growth data</div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Test Activity
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Number of test attempts over time</p>
            </div>
            {renderDropdown('Last 14 days')}
          </CardHeader>
          <CardContent>
            {enhancedTestActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={enhancedTestActivity} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="attempts" name="Attempts" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                  <Bar dataKey="uniqueStudents" name="Unique Students" fill="#bfdbfe" radius={[2, 2, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">No activity data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Score Distribution + Submission Type + Question Difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Score Distribution
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Distribution of student scores</p>
            </div>
            {renderDropdown('All Tests')}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {scoreChartData.map((entry, i) => (
                    <Cell key={i} fill={SCORE_COLORS[entry.name as keyof typeof SCORE_COLORS] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-500" />
                Submission Type
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Auto vs Manual submissions</p>
            </div>
            {renderDropdown('All Tests')}
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={autoSubmitData}
                  cx="50%" cy="50%"
                  innerRadius={65} outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#22c55e" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', right: 0 }} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-[100px]">
              <span className="text-2xl font-bold text-slate-900">{totalSubmissions}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Submissions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                Question Difficulty
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Performance by question difficulty</p>
            </div>
            {renderDropdown('All Tests')}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={difficultyChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                  {difficultyChartData.map((entry, i) => (
                    <Cell key={i} fill={DIFFICULTY_COLORS[entry.name as keyof typeof DIFFICULTY_COLORS] || '#a855f7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Department Enrollment + Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                Department Enrollment
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Number of students across departments</p>
            </div>
            {renderDropdown('All Departments')}
          </CardHeader>
          <CardContent className="pt-4">
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptChartData} layout="vertical" barSize={12} margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} background={{ fill: '#f1f5f9', radius: 4 }}>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No department data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Performing Students
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Students with highest average scores</p>
            </div>
            {renderDropdown('All Tests')}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-center font-semibold">Tests Taken</th>
                    <th className="px-4 py-3 text-center font-semibold">Avg. Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topStudentsMock.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                          {s.initials}
                        </div>
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{s.dept}</td>
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">{s.tests}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{s.avgScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
