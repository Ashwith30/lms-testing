import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { testService } from '../../services/testService';
import { 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  BrainCircuit, 
  Target 
} from 'lucide-react';

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

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading your performance analytics...</div>;
  }

  const kpis = data?.kpis || {};
  const progression = data?.progression || [];
  const categories = data?.categories || [];
  const difficulties = data?.difficulties || [
    { difficulty: 'Easy', accuracy: 0, correctQuestions: 0, totalQuestions: 0 },
    { difficulty: 'Medium', accuracy: 0, correctQuestions: 0, totalQuestions: 0 },
    { difficulty: 'Hard', accuracy: 0, correctQuestions: 0, totalQuestions: 0 }
  ];

  const statCards = [
    { title: 'Tests Completed', value: kpis.totalAttempts ?? 0, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Average Score', value: `${kpis.avgScore ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Pass Rate (>=60%)', value: `${kpis.passRate ?? 0}%`, icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Personal Best', value: `${kpis.highestScore ?? 0}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Tests Passed', value: `${kpis.testsPassed ?? 0} / ${kpis.totalAttempts ?? 0}`, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Integrity Rating', value: `${kpis.integrityRating ?? 100}%`, icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
          <BrainCircuit className="h-4 w-4" />
          <span>Candidate Performance Analytics</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">My Performance & Growth Trajectory</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Track your progress over time, evaluate strengths across question categories, and review accuracy by difficulty.
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

      {/* Category Accuracy & Difficulty Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              Category Accuracy Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {categories.length > 0 ? (
              categories.map((cat: any) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{cat.category}</span>
                    <span className="text-slate-500">
                      {cat.correctQuestions} / {cat.totalQuestions} ({cat.accuracy}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        cat.accuracy >= 70 ? 'bg-emerald-500' :
                        cat.accuracy >= 50 ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${cat.accuracy}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No category attempt data available yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Breakdown */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-600" />
              Difficulty Mastery
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              {difficulties.map((d: any) => {
                const isEasy = d.difficulty === 'Easy';
                const isMed = d.difficulty === 'Medium';
                const colorClass = isEasy ? 'text-green-600 bg-green-50 border-green-200' :
                  isMed ? 'text-amber-600 bg-amber-50 border-amber-200' :
                  'text-rose-600 bg-rose-50 border-rose-200';
                return (
                  <div key={d.difficulty} className={`p-4 rounded-xl border ${colorClass}`}>
                    <p className="text-xs font-bold uppercase tracking-wider">{d.difficulty}</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900">{d.accuracy}%</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {d.correctQuestions} / {d.totalQuestions} correct
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progression Over Time */}
      <Card className="border border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-4">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Assessment History & Progression Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {progression.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Assessment Title</th>
                    <th className="px-6 py-3 text-center">Score</th>
                    <th className="px-6 py-3 text-center">Percentage</th>
                    <th className="px-6 py-3 text-center">Result</th>
                    <th className="px-6 py-3 text-right">Attempt Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {progression.map((item: any) => {
                    const isPassed = (item.percentage || 0) >= 60;
                    return (
                      <tr key={item.attemptId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{item.testTitle}</td>
                        <td className="px-6 py-4 text-center font-mono font-medium text-slate-700">{item.score} pts</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                              <XCircle className="h-3.5 w-3.5" /> Needs Practice
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400">
                          {item.date ? new Date(item.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No assessments completed yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
