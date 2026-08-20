import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  BarChart3, TrendingUp, FileText, ShieldAlert, Award, PieChart,
  CheckCircle2, Clock, HelpCircle, Layers, Target, Compass
} from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const SCORE_COLORS: Record<string, string> = { '80-100': '#22c55e', '60-79': '#3b82f6', '40-59': '#f59e0b', '0-39': '#ef4444' };
const OPTION_COLORS = { 'A': '#6366f1', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#ec4899' };

export const TrainerAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionTab, setSelectedQuestionTab] = useState<'accuracy' | 'distractors'>('accuracy');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/trainer');
        setData(res.data);
      } catch (e) {
        console.error('Failed to load trainer analytics', e);
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
          <p className="text-sm text-slate-500 font-medium">Loading assessment analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-slate-500">No analytics data available.</div>;
  }

  const {
    kpis = {},
    testSummaries = [],
    scoreBrackets = {},
    questionAnalysis = [],
    categoryPerformance = [],
    attemptStatusBreakdown = {},
    answerStatusBreakdown = {},
    timeDistribution = []
  } = data;

  const statCards = [
    { title: 'Assessments', value: kpis.totalTests ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { title: 'Submissions', value: kpis.totalSubmissions ?? 0, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { title: 'Cohort Avg', value: `${kpis.avgScore ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { title: 'Pass Rate', value: `${kpis.passRate ?? 0}%`, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { title: 'Highest', value: `${kpis.highestScore ?? 0}%`, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { title: 'Lowest', value: `${kpis.lowestScore ?? 0}%`, icon: Target, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    { title: 'Median', value: `${kpis.medianScore ?? 0}%`, icon: Compass, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { title: 'Avg Duration', value: `${kpis.avgDuration ?? 0}m`, icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
    { title: 'Questions', value: kpis.questionsCreated ?? 0, icon: HelpCircle, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    { title: 'Violations', value: kpis.totalViolations ?? 0, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  ];

  // Chart transformations
  const scoreChartData = Object.entries(scoreBrackets).map(([name, value]) => ({
    name: `${name}%`,
    value: value as number,
    bracket: name
  }));

  const passFailData = [
    { name: 'Passed (≥60%)', value: Math.round(((kpis.passRate || 0) * (kpis.totalSubmissions || 1)) / 100), color: '#22c55e' },
    { name: 'Failed (<60%)', value: Math.max(0, (kpis.totalSubmissions || 0) - Math.round(((kpis.passRate || 0) * (kpis.totalSubmissions || 1)) / 100)), color: '#ef4444' }
  ];

  const attemptStatusData = [
    { name: 'Submitted', value: attemptStatusBreakdown.submitted || 0, color: '#22c55e' },
    { name: 'Auto-Submitted', value: attemptStatusBreakdown.autoSubmitted || 0, color: '#f59e0b' },
    { name: 'In Progress', value: attemptStatusBreakdown.inProgress || 0, color: '#6366f1' }
  ].filter(d => d.value > 0);

  const questionChartData = questionAnalysis.map((q: any, idx: number) => ({
    label: `Q${idx + 1}`,
    questionText: q.questionText,
    category: q.category,
    correctRate: q.correctRate,
    wrongRate: q.wrongRate,
    skipRate: q.skipRate,
    optA: q.optionDistribution?.A || 0,
    optB: q.optionDistribution?.B || 0,
    optC: q.optionDistribution?.C || 0,
    optD: q.optionDistribution?.D || 0,
    correctAnswer: q.correctAnswer
  }));

  const radarData = categoryPerformance.map((c: any) => ({
    category: c.category,
    accuracy: c.avgScore,
    questions: c.totalQuestions
  }));

  const answerStatusData = [
    { name: 'Answered', count: answerStatusBreakdown.answered || 0, color: '#22c55e' },
    { name: 'Marked Review', count: answerStatusBreakdown.marked || 0, color: '#8b5cf6' },
    { name: 'Visited Skipped', count: answerStatusBreakdown.visited || 0, color: '#f59e0b' },
    { name: 'Not Visited', count: answerStatusBreakdown.notVisited || 0, color: '#94a3b8' }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs max-w-xs">
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
          <BarChart3 className="h-4 w-4" />
          <span>Faculty Analytics</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Assessment Performance Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Detailed assessment breakdown, pass/fail rates, psychometric question accuracy, distractor distribution, and proctoring metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3">
        {statCards.map((stat, i) => (
          <Card key={i} className={`border ${stat.border} hover:shadow-md transition-all duration-200`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{stat.title}</p>
                  <h3 className="text-base font-bold text-slate-900 truncate">{stat.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Score Distribution + Pass/Fail Donut + Attempt Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={scoreChartData} barSize={32}>
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

        {/* Pass / Fail Donut */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              Pass / Fail Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={230}>
              <RechartsPie>
                <Pie
                  data={passFailData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {passFailData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attempt Status Breakdown */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Attempt Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={230}>
              <RechartsPie>
                <Pie
                  data={attemptStatusData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {attemptStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Question Accuracy & Distractor Analysis ⭐ */}
      <Card className="border border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            Psychometric Question Analysis ({questionAnalysis.length} Questions)
          </CardTitle>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedQuestionTab('accuracy')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedQuestionTab === 'accuracy'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Accuracy Rates
            </button>
            <button
              onClick={() => setSelectedQuestionTab('distractors')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedQuestionTab === 'distractors'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Distractor Distribution (A/B/C/D)
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {questionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              {selectedQuestionTab === 'accuracy' ? (
                <BarChart data={questionChartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="correctRate" fill="#22c55e" radius={[4, 4, 0, 0]} name="Correct %" />
                  <Bar dataKey="wrongRate" fill="#ef4444" radius={[4, 4, 0, 0]} name="Wrong %" />
                  <Bar dataKey="skipRate" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Skipped %" />
                </BarChart>
              ) : (
                <BarChart data={questionChartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="optA" stackId="a" fill={OPTION_COLORS.A} name="Option A" />
                  <Bar dataKey="optB" stackId="a" fill={OPTION_COLORS.B} name="Option B" />
                  <Bar dataKey="optC" stackId="a" fill={OPTION_COLORS.C} name="Option C" />
                  <Bar dataKey="optD" stackId="a" fill={OPTION_COLORS.D} name="Option D" />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">No question response data available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Category Performance Radar & Answer Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Radar / Bar */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Compass className="h-4 w-4 text-violet-600" />
              Category-Wise Performance Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-center">
            {radarData.length > 2 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Accuracy %" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={radarData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="accuracy" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No category data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Answer Engagement Distribution */}
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Candidate Answer Interactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {answerStatusData.map(item => (
                <div key={item.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{item.count}</p>
                </div>
              ))}
            </div>

            {timeDistribution.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Submission Time Distribution (minutes)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={timeDistribution} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="minutes" tick={{ fontSize: 10, fill: '#64748b' }} unit="m" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Assessment Performance Table */}
      <Card className="border border-slate-200 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b py-3 px-5">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Assessment-Level Detailed Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {testSummaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b">
                  <tr>
                    <th className="px-4 py-2.5">Assessment</th>
                    <th className="px-4 py-2.5 text-center">Submissions</th>
                    <th className="px-4 py-2.5 text-center">Avg Score</th>
                    <th className="px-4 py-2.5 text-center">Pass Rate</th>
                    <th className="px-4 py-2.5 text-center">Avg Time</th>
                    <th className="px-4 py-2.5 text-right">Integrity Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {testSummaries.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{t.title}</td>
                      <td className="px-4 py-2.5 text-center font-medium text-slate-700">{t.submissionsCount}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-900">{t.avgScore}%</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.passRate >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          t.passRate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {t.passRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{t.avgDuration}m</td>
                      <td className="px-4 py-2.5 text-right">
                        {t.violations > 0 ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {t.violations} flags
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">No assessment data available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
