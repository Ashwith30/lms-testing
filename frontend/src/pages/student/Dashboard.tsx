import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, CheckCircle, Clock, BarChart2, Award, BookOpen,
  AlertTriangle, Eye, TrendingUp, Calendar, ArrowRight
} from 'lucide-react';
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">
          Hey, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-[#9099a8] text-sm mt-0.5">Here's what's happening with your assessments.</p>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center gap-3.5 shadow-soft">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#9099a8] uppercase tracking-wider">Completed</p>
              <p className="text-xl font-bold text-[#1a1d23] mt-0.5 leading-none">{stats?.totalCompleted ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center gap-3.5 shadow-soft">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#9099a8] uppercase tracking-wider">Avg Score</p>
              <p className="text-xl font-bold text-[#1a1d23] mt-0.5 leading-none">{stats?.averageScore ?? 0}%</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 flex items-center gap-3.5 shadow-soft">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#9099a8] uppercase tracking-wider">Best Score</p>
              <p className="text-xl font-bold text-[#1a1d23] mt-0.5 leading-none">{stats?.highestScore ?? 0}%</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-[#9099a8]">
          <div className="animate-spin inline-block h-6 w-6 border-2 border-[#e2e5ea] border-t-blue-500 rounded-full mb-3"></div>
          <p className="text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {/* Upcoming Tests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1d23] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#9099a8]" />
                Upcoming tests
              </h2>
            </div>

            {upcomingTests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {upcomingTests.map((item) => (
                  <Card key={item.schedule.id} className="hover:shadow-lifted transition-all duration-200 group">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Clock className="h-4 w-4" />
                        </div>
                        {item.isAvailable ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-200">
                            Live
                          </span>
                        ) : item.attempt?.status === 'in_progress' ? (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-amber-200">
                            In progress
                          </span>
                        ) : (
                          <span className="bg-[#f0f2f5] text-[#5a6170] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                            Scheduled
                          </span>
                        )}
                      </div>

                      <h3 className="text-[15px] font-semibold text-[#1a1d23] mb-2 line-clamp-1">
                        {item.test.title}
                      </h3>

                      <div className="space-y-1 mb-4 text-[13px] text-[#9099a8]">
                        <p>{item.test?.questionIds?.length ?? 0} questions · {item.test?.settings?.duration ?? 60} min</p>
                        <p>
                          {item.schedule?.startTime ? new Date(item.schedule.startTime).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : 'Flexible'}
                        </p>
                      </div>

                      <Link to={`/student/tests/${item.test.id}?scheduleId=${item.schedule.id}`}>
                        <Button className="w-full" variant={item.isAvailable ? 'primary' : 'outline'} size="sm">
                          {item.attempt?.status === 'in_progress' ? 'Resume' : 'View'}
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#e2e5ea] shadow-soft p-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-[15px] font-medium text-[#1a1d23] mb-0.5">All caught up</p>
                <p className="text-sm text-[#9099a8]">No upcoming assessments right now.</p>
              </div>
            )}
          </div>

          {/* Past Exams */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-[#1a1d23] flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#9099a8]" />
              Past exams
            </h2>

            {pastExams.length > 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e5ea] shadow-soft overflow-hidden">
                {/* Desktop table */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-[#eef0f3]">
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Assessment</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider text-center">Score</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider text-center">%</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider text-center">Flags</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider text-center">Status</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider text-right">Date</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f3]">
                      {pastExams.map(({ attempt, test }) => (
                        <tr key={attempt.id} className="hover:bg-[#f7f8fa] transition-colors group">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-[#1a1d23] text-[13px]">{test.title}</p>
                            <p className="text-[11px] text-[#9099a8] mt-0.5 line-clamp-1">{test.description}</p>
                          </td>
                          <td className="px-5 py-3.5 text-center text-[13px] font-medium text-[#1a1d23]">
                            {attempt.score != null ? attempt.score : '—'} / {test.totalMarks}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              (attempt.percentage ?? 0) >= 70
                                ? 'bg-emerald-50 text-emerald-700'
                                : (attempt.percentage ?? 0) >= 40
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}>
                              {attempt.percentage != null ? `${attempt.percentage.toFixed(1)}%` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {(attempt.violations ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                <AlertTriangle className="h-3 w-3" />
                                {attempt.violations}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#9099a8]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center text-[11px]">
                            {attempt.status === 'auto_submitted' ? (
                              <span className="text-amber-600 font-medium">Auto</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">Done</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-[11px] text-[#9099a8]">
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                                  month: 'short', day: 'numeric'
                                })
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link to={`/student/results/${test.id}`}>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-[12px]">
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                Review
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card layout */}
                <div className="sm:hidden divide-y divide-[#eef0f3]">
                  {pastExams.map(({ attempt, test }) => (
                    <Link key={attempt.id} to={`/student/results/${test.id}`} className="block p-4 hover:bg-[#f7f8fa] transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1a1d23] text-[13px] truncate">{test.title}</p>
                          <p className="text-[11px] text-[#9099a8] mt-0.5">
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : '—'}
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          (attempt.percentage ?? 0) >= 70
                            ? 'bg-emerald-50 text-emerald-700'
                            : (attempt.percentage ?? 0) >= 40
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {attempt.percentage != null ? `${attempt.percentage.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#9099a8]">
                        <span>{attempt.score != null ? attempt.score : '—'} / {test.totalMarks}</span>
                        {(attempt.violations ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            {attempt.violations}
                          </span>
                        )}
                        <span className={attempt.status === 'auto_submitted' ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                          {attempt.status === 'auto_submitted' ? 'Auto' : 'Done'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#e2e5ea] shadow-soft p-8 text-center">
                <Play className="h-8 w-8 text-[#e2e5ea] mx-auto mb-2" />
                <p className="text-[15px] font-medium text-[#1a1d23] mb-0.5">No exams yet</p>
                <p className="text-sm text-[#9099a8]">Complete an assessment to see results here.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
