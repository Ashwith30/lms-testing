import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Award, CheckCircle2, ShieldCheck, Flame, ChevronDown,
  AlertTriangle, Check, BookOpen, Clock, FileText, ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { testService } from '../../services/testService';

const scoreProgressionData = [
  { test: 'Test 1', score: 65 },
  { test: 'Test 2', score: 72 },
  { test: 'Test 3', score: 76 },
  { test: 'Test 4', score: 81 },
  { test: 'Test 5', score: 86 },
  { test: 'Test 6', score: 92 },
];

const difficultyData = [
  { name: 'Easy', value: 92, color: '#10b981' },
  { name: 'Medium', value: 76, color: '#f59e0b' },
  { name: 'Hard', value: 51, color: '#ef4444' },
];

const subjectsData = [
  { name: 'Computer Networks', score: 82, color: 'bg-blue-600' },
  { name: 'Database Management', score: 68, color: 'bg-cyan-500' },
  { name: 'Operating Systems', score: 74, color: 'bg-indigo-600' },
  { name: 'Data Structures', score: 58, color: 'bg-amber-500' },
  { name: 'Web Technologies', score: 91, color: 'bg-emerald-500' },
];

export const StudentAnalytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) return;
      try {
        const res = await testService.getStudentAnalytics(user.id);
        setData(res);
      } catch (e) {
        console.error('Failed to load student analytics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  const kpis = data?.kpis || {};
  const avgScore = kpis.avgScore || 78;
  const highestScore = kpis.highestScore || 92;
  const passRate = kpis.passRate || 85;
  const testsCompleted = kpis.totalAttempts || 12;
  const integrityRating = kpis.integrityRating || 100;

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">Performance & Growth</h1>
        <p className="text-[#9099a8] text-sm mt-0.5">Track your progress and identify areas to improve.</p>
      </div>

      {/* Top 5 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Average Score */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Average Score</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1d23]">{avgScore}%</p>
          <p className="text-[11px] text-[#9099a8] mt-0.5">Across all tests</p>
        </div>

        {/* 2. Best Score */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Best Score</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1d23]">{highestScore}%</p>
          <p className="text-[11px] text-[#9099a8] mt-0.5">Your highest</p>
        </div>

        {/* 3. Pass Rate */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Pass Rate</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1d23]">{passRate}%</p>
          <p className="text-[11px] text-[#9099a8] mt-0.5">Tests passed</p>
        </div>

        {/* 4. Tests Completed */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
            </div>
            <span className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Tests Completed</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1d23]">{testsCompleted}</p>
          <p className="text-[11px] text-[#9099a8] mt-0.5">All time</p>
        </div>

        {/* 5. Integrity Rating */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Integrity Rating</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1d23]">{integrityRating}%</p>
          <p className="text-[11px] text-teal-600 font-medium mt-0.5">Excellent</p>
        </div>
      </div>

      {/* 4-Card Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Score Progression */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#1a1d23] text-sm">Score Progression</h3>
              <p className="text-[11px] text-[#9099a8]">Score over recent tests</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#5a6170] bg-[#f7f8fa] border border-[#e2e5ea] px-2 py-0.5 rounded-md font-medium cursor-pointer">
              <span>This Month</span>
              <ChevronDown className="h-3 w-3 text-[#9099a8]" />
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreProgressionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="test" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9099a8' }} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9099a8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e5ea', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Score']}
                />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#progressionGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Subject Performance */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#1a1d23] text-sm">Subject Performance</h3>
              <p className="text-[11px] text-[#9099a8]">Accuracy across disciplines</p>
            </div>
            <Link to="/student/results" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <div className="space-y-2.5">
            {subjectsData.map((sub) => (
              <div key={sub.name} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#1a1d23] text-[12px] truncate max-w-[150px]">{sub.name}</span>
                  <span className="text-slate-700 font-semibold">{sub.score}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#f0f2f5] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sub.color} rounded-full`}
                    style={{ width: `${sub.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Difficulty Mastery */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="font-bold text-[#1a1d23] text-sm">Difficulty Mastery</h3>
            <p className="text-[11px] text-[#9099a8]">Performance by question tier</p>
          </div>

          <div className="relative h-32 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={52}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-[#9099a8] uppercase font-semibold">Overall</span>
              <span className="text-base font-bold text-[#1a1d23]">76%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#f0f2f5] text-center">
            {difficultyData.map((d) => (
              <div key={d.name} className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span className="text-[11px] text-[#9099a8]">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Strengths & Areas to Improve */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#1a1d23] text-sm mb-0.5">Strengths & Focus</h3>
            <p className="text-[11px] text-[#9099a8] mb-3">Topic mastery breakdown</p>

            {/* Strengths */}
            <div className="mb-3">
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                <span>Strengths</span>
              </div>
              <div className="space-y-1 pl-1">
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>HTML & CSS</span>
                  <span className="font-bold text-emerald-600">91%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Web Technologies</span>
                  <span className="font-bold text-emerald-600">88%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Computer Networks</span>
                  <span className="font-bold text-emerald-600">82%</span>
                </div>
              </div>
            </div>

            {/* Areas to Improve */}
            <div className="pt-2 border-t border-[#f0f2f5]">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span>Areas to Improve</span>
              </div>
              <div className="space-y-1 pl-1">
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Data Link Layer</span>
                  <span className="font-bold text-amber-600">54%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>CPU Scheduling</span>
                  <span className="font-bold text-amber-600">58%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Normalization</span>
                  <span className="font-bold text-amber-600">62%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Recent Assessments Table */}
      <div className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#1a1d23] text-sm">Recent Assessments</h3>
            <p className="text-xs text-[#9099a8]">Latest submitted evaluations</p>
          </div>
          <Link to="/student/results" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View Full History
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eef0f3] text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">
                <th className="py-2.5 px-3">Test Name</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Time Taken</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f5] text-xs">
              <tr className="hover:bg-[#fcfdfe] transition-colors">
                <td className="py-3 px-3 font-semibold text-[#1a1d23]">Computer Networks – Module 2 Test</td>
                <td className="py-3 px-3 text-slate-600">Computer Networks</td>
                <td className="py-3 px-3 font-bold text-blue-600">82%</td>
                <td className="py-3 px-3 text-slate-600">85%</td>
                <td className="py-3 px-3 text-slate-600">24 mins</td>
                <td className="py-3 px-3 text-slate-500">May 10, 2024</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    Passed
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#fcfdfe] transition-colors">
                <td className="py-3 px-3 font-semibold text-[#1a1d23]">Operating Systems – Process Management</td>
                <td className="py-3 px-3 text-slate-600">Operating Systems</td>
                <td className="py-3 px-3 font-bold text-blue-600">88%</td>
                <td className="py-3 px-3 text-slate-600">72%</td>
                <td className="py-3 px-3 text-slate-600">28 mins</td>
                <td className="py-3 px-3 text-slate-500">May 8, 2024</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    Passed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
