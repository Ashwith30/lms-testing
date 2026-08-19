import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, CheckCircle, Clock, BarChart2, Award, BookOpen,
  AlertTriangle, Eye, TrendingUp, Calendar
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Welcome back, {user?.name} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's a summary of your placement assessment activity.</p>
      </div>

      {/* Stats Bar */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Tests Completed</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.totalCompleted ?? 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Average Score</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.averageScore ?? 0}%</h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Highest Score</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.highestScore ?? 0}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin inline-block h-8 w-8 border-4 border-slate-200 border-t-blue-500 rounded-full mb-3"></div>
          <p className="text-sm font-medium">Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* Upcoming / Active Tests */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Upcoming Tests
            </h2>

            {upcomingTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTests.map((item) => (
                  <Card key={item.schedule.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                          <Clock className="h-6 w-6" />
                        </div>
                        {item.isAvailable ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                            Available Now
                          </span>
                        ) : item.attempt?.status === 'in_progress' ? (
                          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                            In Progress
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                            Scheduled
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">
                        {item.test.title}
                      </h3>

                      <div className="space-y-2 mb-6">
                        <p className="text-sm text-slate-500 flex items-center">
                          <span className="w-24 font-medium">Questions:</span>
                          {item.test.questionIds.length}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center">
                          <span className="w-24 font-medium">Duration:</span>
                          {item.test.settings.duration} Minutes
                        </p>
                        <p className="text-sm text-slate-500 flex items-center">
                          <span className="w-24 font-medium">Window:</span>
                          {new Date(item.schedule.startTime).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <Link to={`/student/tests/${item.test.id}`}>
                        <Button className="w-full" variant={item.isAvailable ? 'primary' : 'outline'}>
                          {item.attempt?.status === 'in_progress' ? 'Resume Test' : 'View Test'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-slate-500 flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">All caught up!</h3>
                  <p>You have no pending or upcoming assessments.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past Exams */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-purple-500" />
              Past Exams
            </h2>

            {pastExams.length > 0 ? (
              <Card className="overflow-hidden border border-slate-200">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-4">Assessment</th>
                          <th className="px-6 py-4 text-center">Score</th>
                          <th className="px-6 py-4 text-center">Percentage</th>
                          <th className="px-6 py-4 text-center">Violations</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Submitted</th>
                          <th className="px-6 py-4 text-right">Review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pastExams.map(({ attempt, test }) => (
                          <tr key={attempt.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{test.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{test.description}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-slate-900">
                              {attempt.score != null ? attempt.score : '—'} / {test.totalMarks}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                (attempt.percentage ?? 0) >= 70
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : (attempt.percentage ?? 0) >= 40
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {attempt.percentage != null ? `${attempt.percentage.toFixed(1)}%` : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {(attempt.violations ?? 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <AlertTriangle className="h-3 w-3" />
                                  {attempt.violations}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center text-xs">
                              {attempt.status === 'auto_submitted' ? (
                                <span className="text-amber-600 font-medium">Auto Submitted</span>
                              ) : (
                                <span className="text-green-600 font-medium">Submitted</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-slate-500">
                              {attempt.submittedAt
                                ? new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })
                                : '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link to={`/student/results/${test.id}`}>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="mr-1.5 h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                  Review
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-slate-500 flex flex-col items-center">
                  <Play className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No past exams yet</h3>
                  <p>Complete an assessment to see your results here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};
