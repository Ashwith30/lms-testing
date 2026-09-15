import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Sparkles, MoreHorizontal,
  Database, Network, Cpu, Code2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { Test, Schedule, Attempt } from '../../types';

interface DashboardData {
  upcoming_tests: {
    schedule: Schedule;
    test: Test;
    attempt?: Attempt;
    isAvailable: boolean;
  }[];
  past_exams: {
    attempt: Attempt;
    test: Test;
  }[];
  stats: {
    totalCompleted: number;
    averageScore: number;
    highestScore: number;
  };
}

type PerformanceTabType = 'assessments' | 'accuracy' | 'study_hours';

// Project-relevant Performance Data (Scores %, Accuracy %, and Study Hours)
const monthlyPerformanceData: Record<PerformanceTabType, { month: string; value: number }[]> = {
  assessments: [
    { month: 'JAN', value: 72 },
    { month: 'FEB', value: 85 },
    { month: 'MAR', value: 78 },
    { month: 'APR', value: 88 },
    { month: 'MAY', value: 82 },
    { month: 'JUN', value: 92 },
    { month: 'JUL', value: 86 },
    { month: 'AUG', value: 94 },
    { month: 'SEP', value: 89 },
    { month: 'OCT', value: 95 },
    { month: 'NOV', value: 92 },
    { month: 'DEC', value: 98 },
  ],
  accuracy: [
    { month: 'JAN', value: 68 },
    { month: 'FEB', value: 76 },
    { month: 'MAR', value: 82 },
    { month: 'APR', value: 79 },
    { month: 'MAY', value: 87 },
    { month: 'JUN', value: 84 },
    { month: 'JUL', value: 91 },
    { month: 'AUG', value: 88 },
    { month: 'SEP', value: 93 },
    { month: 'OCT', value: 91 },
    { month: 'NOV', value: 96 },
    { month: 'DEC', value: 95 },
  ],
  study_hours: [
    { month: 'JAN', value: 24 },
    { month: 'FEB', value: 32 },
    { month: 'MAR', value: 28 },
    { month: 'APR', value: 40 },
    { month: 'MAY', value: 35 },
    { month: 'JUN', value: 48 },
    { month: 'JUL', value: 42 },
    { month: 'AUG', value: 55 },
    { month: 'SEP', value: 50 },
    { month: 'OCT', value: 62 },
    { month: 'NOV', value: 58 },
    { month: 'DEC', value: 68 },
  ],
};

// Daily Practice Wave Chart Data (Questions Solved)
const dailyActivityData = [
  { day: '1', questions: 12 },
  { day: '3', questions: 18 },
  { day: '5', questions: 14 },
  { day: '7', questions: 28 },
  { day: '9', questions: 22 },
  { day: '11', questions: 35 },
  { day: '13', questions: 20 },
  { day: '15', questions: 42 },
  { day: '17', questions: 38 },
  { day: '19', questions: 25 },
  { day: '21', questions: 48 },
  { day: '23', questions: 30 },
  { day: '25', questions: 40 },
  { day: '27', questions: 32 },
  { day: '29', questions: 45 },
  { day: '30', questions: 52 },
];

// Peer Study Circle Avatars (Shades of Blue, Sky, Cyan, Teal, Emerald, Amber, Slate - NO Purple)
const studyCircleMembers = [
  { name: 'Aarav Patel', initial: 'AP', color: 'from-blue-600 to-sky-500', score: '96%' },
  { name: 'Sarah Jenkins', initial: 'SJ', color: 'from-sky-500 to-cyan-500', score: '94%' },
  { name: 'Vikram Singh', initial: 'VS', color: 'from-amber-400 to-orange-500', score: '91%' },
  { name: 'Priya Sharma', initial: 'PS', color: 'from-emerald-400 to-teal-600', score: '89%' },
  { name: 'David Chen', initial: 'DC', color: 'from-blue-500 to-blue-700', score: '88%' },
  { name: 'Ananya Rao', initial: 'AR', color: 'from-cyan-400 to-blue-600', score: '87%' },
  { name: 'Karthik Nair', initial: 'KN', color: 'from-slate-600 to-slate-800', score: '85%' },
  { name: 'Elena Rostova', initial: 'ER', color: 'from-teal-400 to-emerald-600', score: '84%' },
  { name: 'Rahul Verma', initial: 'RV', color: 'from-blue-400 to-cyan-500', score: '82%' },
  { name: 'Maya Gupta', initial: 'MG', color: 'from-emerald-500 to-green-600', score: '81%' },
];

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceTab, setPerformanceTab] = useState<PerformanceTabType>('assessments');

  useEffect(() => {
    const fetchDashboard = async () => {
      if (user?.id) {
        try {
          const data = await testService.getStudentDashboardData(user.id);
          setDashboardData(data);
        } catch (error) {
          console.error('Failed to load dashboard data', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDashboard();
  }, [user]);

  const stats = dashboardData?.stats;
  const completedCount = stats?.totalCompleted && stats.totalCompleted > 0 ? stats.totalCompleted : 15;
  const avgScore = stats?.averageScore && stats.averageScore > 0 ? stats.averageScore : 88.4;

  return (
    <div className="space-y-6 animate-in pb-12 font-sans text-slate-800">
      {/* Top Banner / Welcome Row (Clean Royal Blue to Sky Blue Palette) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-700 p-5 sm:p-6 rounded-2xl border border-blue-600/30 shadow-md text-white">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Hey, {user?.name ? user.name.split(' ')[0] : 'Ashwith'} <span>👋</span>
          </h1>
          <p className="text-blue-100/90 text-sm mt-1 font-medium">
            Welcome back! Here's your personalized learning summary & performance matrix.
          </p>
        </div>
      </div>

      {/* Main 3-Column Layout (Shades of Blue, White & Silver) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ========================================================================= */}
        {/* COLUMN 1: Hero Metrics & Spotlight Focus Cards (Col Span 3 / 12)          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* 1. Overall Grade Index */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Grade Index</p>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{avgScore}</span>
              <span className="text-2xl font-bold text-blue-600">%</span>
            </div>

            <div className="flex items-center gap-2 mt-3.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                +08% Mar
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Top 5% in Batch
              </span>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <Link to="/student/results" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                View detailed transcript
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* 2. Spotlight Focus Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group">
            {/* Ambient subtle blue glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Circular Ring Gauge */}
                  <div className="relative h-12 w-12 flex items-center justify-center">
                    <svg className="h-12 w-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-blue-600"
                        strokeDasharray="74, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-bold text-slate-900">74%</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      Tasks Overview
                    </h3>
                    <p className="text-[11px] text-slate-500">Quantitative Aptitude</p>
                  </div>
                </div>

                <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  ⓘ
                </span>
              </div>

              <div className="mt-4 bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium truncate max-w-[150px]">Module 2 – Time, Speed & Distance</span>
                  <div className="flex -space-x-1.5">
                    <div className="h-4 w-4 rounded-full bg-blue-600 border border-white text-[8px] flex items-center justify-center font-bold text-white shadow-xs">1</div>
                    <div className="h-4 w-4 rounded-full bg-sky-600 border border-white text-[8px] flex items-center justify-center font-bold text-white shadow-xs">2</div>
                    <div className="h-4 w-4 rounded-full bg-cyan-600 border border-white text-[8px] flex items-center justify-center font-bold text-white shadow-xs">3</div>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Progress</span>
                    <span className="text-blue-600 font-bold">74%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-sky-500 rounded-full" style={{ width: '74%' }}></div>
                  </div>
                </div>
              </div>

              <Link to="/student/tests" className="block mt-4">
                <button className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs shadow-blue-500/20 cursor-pointer">
                  <span>View Questions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          </div>

          {/* 3. Secondary Card (Accuracy Rate) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Circular Gauge */}
                <div className="relative h-12 w-12 flex items-center justify-center">
                  <svg className="h-12 w-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-sky-500"
                      strokeDasharray="94, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-sky-600">94%</span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">Accuracy Rate</h3>
                  <p className="text-[11px] text-slate-500">Questions answered correctly</p>
                </div>
              </div>

              <span className="text-slate-400 text-xs">ⓘ</span>
            </div>

            {/* Peer Avatars Stack */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex -space-x-2 overflow-hidden">
                {studyCircleMembers.slice(0, 4).map((member, i) => (
                  <div
                    key={i}
                    className={`inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gradient-to-tr ${member.color} text-white font-bold text-[9px] flex items-center justify-center shadow-xs`}
                    title={member.name}
                  >
                    {member.initial}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                +24 classmates active
              </span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: Deep Analytics & Multi-Line Progression Charts (Col Span 6 / 12)*/}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* 1. Score Trajectory Performance Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
            {/* Header with Subtitle, Title & Tab Group */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Academic Progress</p>
                <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-slate-900 mt-0.5">Score Trajectory</h2>
              </div>

              {/* 3-Button Pill Toggle Group (Assessments, Accuracy, Study Hours) */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto shadow-xs">
                {(['assessments', 'accuracy', 'study_hours'] as const).map((tab) => {
                  const labels = {
                    assessments: 'Assessments',
                    accuracy: 'Accuracy',
                    study_hours: 'Study Hours',
                  };
                  const isActive = performanceTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPerformanceTab(tab)}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monthly Spline Line Chart with Dots */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyPerformanceData[performanceTab]} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={true} horizontal={true} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    domain={performanceTab === 'study_hours' ? [0, 80] : [50, 100]}
                    ticks={performanceTab === 'study_hours' ? [0, 20, 40, 60, 80] : [50, 60, 70, 80, 90, 100]}
                    tickFormatter={(v) => performanceTab === 'study_hours' ? `${v}h` : `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                    }}
                    formatter={(val: any) => [
                      performanceTab === 'study_hours' ? `${val} hrs` : `${val}%`,
                      performanceTab === 'assessments' ? 'Avg Test Score' : performanceTab === 'accuracy' ? 'Practice Accuracy' : 'Monthly Study Time'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ stroke: '#2563eb', strokeWidth: 2, r: 4, fill: '#ffffff' }}
                    activeDot={{ stroke: '#2563eb', strokeWidth: 2.5, r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Daily Practice Wave Activity Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Daily Practice Volume</h3>
                <p className="text-xs text-slate-500">Questions solved per day</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                Last 30 days
              </span>
            </div>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyActivityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="practiceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '11px', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' }}
                    formatter={(val: any) => [`${val} Questions`, 'Solved']}
                  />
                  <Area type="monotone" dataKey="questions" stroke="#3b82f6" strokeWidth={2.5} fill="url(#practiceGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: Right Sidebar KPIs & Community Widgets (Col Span 3 / 12)       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* 1. Statistics Mini-Bars */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Statistics</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Mini Left KPI */}
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                <div className="flex items-end gap-1 h-8 mb-2">
                  <div className="w-1.5 h-3 bg-blue-300 rounded-full"></div>
                  <div className="w-1.5 h-5 bg-blue-400 rounded-full"></div>
                  <div className="w-1.5 h-4 bg-blue-300 rounded-full"></div>
                  <div className="w-1.5 h-7 bg-blue-600 rounded-full"></div>
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                  <div className="w-1.5 h-8 bg-blue-400 rounded-full"></div>
                </div>
                <p className="text-lg font-extrabold text-slate-900">{completedCount}</p>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mt-0.5">Tests Done</p>
              </div>

              {/* Mini Right KPI */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <div className="flex items-end gap-1 h-8 mb-2">
                  <div className="w-1.5 h-4 bg-amber-300 rounded-full"></div>
                  <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                  <div className="w-1.5 h-5 bg-amber-300 rounded-full"></div>
                  <div className="w-1.5 h-8 bg-amber-500 rounded-full"></div>
                  <div className="w-1.5 h-7 bg-amber-400 rounded-full"></div>
                  <div className="w-1.5 h-5 bg-amber-300 rounded-full"></div>
                </div>
                <p className="text-lg font-extrabold text-slate-900">24.5h</p>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mt-0.5">Study Hours</p>
              </div>
            </div>
          </div>

          {/* 2. Assessment Domain Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Placement Domains</h3>
              <Link to="/student/analytics" className="text-xs font-bold text-blue-600 hover:text-blue-700 tracking-wider">
                VIEW ALL
              </Link>
            </div>

            <div className="space-y-3.5">
              {/* Category 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                    <Network className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Quantitative Aptitude</h4>
                    <p className="text-[10px] text-slate-500">Speed Math & Logic</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-900">88%</span>
              </div>

              {/* Category 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Logical Reasoning</h4>
                    <p className="text-[10px] text-slate-500">Puzzles & Deductions</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-900">94%</span>
              </div>

              {/* Category 3 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center font-bold">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Verbal Ability</h4>
                    <p className="text-[10px] text-slate-500">Grammar & Reading</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-900">82%</span>
              </div>

              {/* Category 4 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Technical MCQs</h4>
                    <p className="text-[10px] text-slate-500">Core CS & Output</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-900">90%</span>
              </div>
            </div>
          </div>

          {/* 3. Study Circle / Batch Members */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-bold text-slate-900 text-sm">Study Circle (28 Peers)</h3>
              <span className="text-xs font-bold text-blue-600 hover:text-blue-700 tracking-wider cursor-pointer">
                VIEW ALL
              </span>
            </div>

            {/* 2 Rows of 5 Member Avatars */}
            <div className="grid grid-cols-5 gap-2.5">
              {studyCircleMembers.map((member, idx) => (
                <div key={idx} className="group relative flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${member.color} text-white font-bold text-[10px] flex items-center justify-center shadow-xs cursor-pointer group-hover:scale-110 transition-transform`}>
                    {member.initial}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-md whitespace-nowrap shadow-lg">
                      {member.name} ({member.score})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
