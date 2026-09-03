import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Award, TrendingUp, Flame, ArrowRight, CheckCircle2,
  Calendar, Clock, BookOpen, ChevronDown, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Card, CardContent } from '../../components/ui/Card';
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

const progressData = [
  { day: 'May 8', score: 65 },
  { day: 'May 9', score: 72 },
  { day: 'May 10', score: 70 },
  { day: 'May 11', score: 85 },
  { day: 'May 12', score: 82 },
  { day: 'May 13', score: 92 },
];

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const upcomingTests = dashboardData?.upcoming_tests ?? [];
  const pastExams = dashboardData?.past_exams ?? [];

  // Display data with sensible demo fallbacks to match showcase design
  const completedCount = stats?.totalCompleted && stats.totalCompleted > 0 ? stats.totalCompleted : 12;
  const avgScore = stats?.averageScore && stats.averageScore > 0 ? stats.averageScore : 78;
  const bestScore = stats?.highestScore && stats.highestScore > 0 ? stats.highestScore : 92;

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23] flex items-center gap-2">
          Hey, {user?.name ? user.name.split(' ')[0] : 'Ashwith'} 👋
        </h1>
        <p className="text-[#9099a8] text-sm mt-0.5">Here's your learning overview</p>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Tests Completed */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Tests Completed</p>
              <p className="text-2xl font-bold text-[#1a1d23] mt-0.5 leading-tight">{completedCount}</p>
              <p className="text-[11px] text-[#9099a8] mt-0.5">All time</p>
            </div>
          </div>
        </div>

        {/* 2. Average Score */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Average Score</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-[#1a1d23] leading-tight">{avgScore}%</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  ↑ 78%
                </span>
              </div>
              <p className="text-[11px] text-[#9099a8] mt-0.5">Across all tests</p>
            </div>
          </div>
        </div>

        {/* 3. Best Score */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Best Score</p>
              <p className="text-2xl font-bold text-[#1a1d23] mt-0.5 leading-tight">{bestScore}%</p>
              <p className="text-[11px] text-[#9099a8] mt-0.5">Your highest</p>
            </div>
          </div>
        </div>

        {/* 4. Study Streak */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="h-5 w-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Study Streak</p>
              <p className="text-2xl font-bold text-[#1a1d23] mt-0.5 leading-tight">5 days</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Keep it up! 🔥</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Continue Learning & Your Progress Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Continue Learning Card */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9099a8] uppercase tracking-wider mb-4">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Continue Learning
            </div>
            <h3 className="text-lg font-bold text-[#1a1d23] mb-1">
              Computer Networks – Module 2
            </h3>
            <p className="text-xs text-[#9099a8] mb-4">
              IP Addressing, Subnetting, and Routing Protocols
            </p>

            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#5a6170]">Course Progress</span>
                <span className="text-blue-600 font-bold">70% complete</span>
              </div>
              <div className="w-full h-2 bg-[#f0f2f5] rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>

          <Link to="/student/tests">
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm">
              Continue Test
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>

        {/* Your Progress Chart Card */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1a1d23] text-sm">Your Progress</h3>
              <p className="text-xs text-[#9099a8]">Score progression over time</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5a6170] bg-[#f7f8fa] border border-[#e2e5ea] px-2.5 py-1 rounded-md font-medium cursor-pointer">
              <span>This Week</span>
              <ChevronDown className="h-3 w-3 text-[#9099a8]" />
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9099a8' }} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9099a8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e5ea', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  formatter={(val: any) => [`${val}%`, 'Score']}
                />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Upcoming Tests & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Tests */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a1d23] text-sm">Upcoming Tests</h3>
            <Link to="/student/tests" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingTests.length > 0 ? (
              upcomingTests.slice(0, 2).map((item) => (
                <div key={item.schedule.id} className="p-3.5 rounded-lg border border-[#eef0f3] hover:border-blue-200 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1a1d23]">{item.test.title}</h4>
                      <p className="text-xs text-[#9099a8] mt-0.5">
                        {item.test.questionIds?.length || 20} Questions • {item.test.settings?.duration || (item.test as any).durationMinutes || 30} mins • {item.test.totalMarks} Marks
                      </p>
                    </div>
                  </div>
                  <Link to={`/student/tests/${item.test.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      View Test
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <>
                <div className="p-3.5 rounded-lg border border-[#eef0f3] hover:border-purple-200 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[#1a1d23]">CN – Module 3 Assessment</h4>
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Tomorrow, 10:00 AM</span>
                      </div>
                      <p className="text-xs text-[#9099a8] mt-0.5">
                        25 Questions • 30 mins • 50 Marks
                      </p>
                    </div>
                  </div>
                  <Link to="/student/tests">
                    <Button size="sm" variant="outline" className="text-xs">
                      View Test
                    </Button>
                  </Link>
                </div>

                <div className="p-3.5 rounded-lg border border-[#eef0f3] hover:border-blue-200 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[#1a1d23]">DBMS – Normalization</h4>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">May 8, 2024</span>
                      </div>
                      <p className="text-xs text-[#9099a8] mt-0.5">
                        15 Questions • 20 mins • 30 Marks
                      </p>
                    </div>
                  </div>
                  <Link to="/student/tests">
                    <Button size="sm" variant="outline" className="text-xs">
                      View Test
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a1d23] text-sm">Recent Results</h3>
            <Link to="/student/results" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {pastExams.length > 0 ? (
              pastExams.slice(0, 2).map((item) => (
                <div key={item.attempt.id} className="p-3.5 rounded-lg border border-[#eef0f3] hover:border-emerald-200 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1a1d23]">{item.test.title}</h4>
                      <p className="text-xs text-[#9099a8] mt-0.5">
                        Score: {item.attempt.score} / {item.test.totalMarks}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Passed
                    </span>
                    <Link to={`/student/results/${item.attempt.id}`} className="text-xs text-blue-600 hover:underline">
                      Review
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="p-3.5 rounded-lg border border-[#eef0f3] hover:border-blue-200 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1a1d23]">CN – Module 2 Test</h4>
                      <p className="text-xs text-[#9099a8] mt-0.5">Score: 82%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Passed
                    </span>
                    <span className="text-xs text-[#9099a8]">May 10</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-[#eef0f3] hover:border-amber-200 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1a1d23]">OS – Process Management</h4>
                      <p className="text-xs text-[#9099a8] mt-0.5">Score: 88%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Passed
                    </span>
                    <span className="text-xs text-[#9099a8]">May 8</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
