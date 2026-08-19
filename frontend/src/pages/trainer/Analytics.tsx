import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { api } from '../../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  ShieldAlert, 
  Award, 
  PieChart,
  CheckCircle2
} from 'lucide-react';

export const TrainerAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/summary');
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
    return <div className="text-center py-16 text-slate-500">Loading assessment analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-16 text-slate-500">No analytics data available.</div>;
  }

  const { kpis, testSummaries = [], scoreBrackets = {} } = data;

  const statCards = [
    { title: 'Total Assessments', value: kpis.totalTests, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Total Submissions', value: kpis.totalSubmissions, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Cohort Avg Score', value: `${kpis.avgScore}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Pass Rate (>=60%)', value: `${kpis.passRate}%`, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Highest Score', value: `${kpis.highestScore}%`, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Integrity Violations', value: kpis.totalViolations, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
          <BarChart3 className="h-4 w-4" />
          <span>Faculty Analytics</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Assessment Performance Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Detailed assessment breakdown, pass/fail rates, candidate grade distributions, and proctoring logs.
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

      {/* Assessment Summaries & Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Performance Table */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 overflow-hidden h-full">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Assessment-Level Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {testSummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Assessment</th>
                        <th className="px-6 py-3 text-center">Submissions</th>
                        <th className="px-6 py-3 text-center">Avg Score</th>
                        <th className="px-6 py-3 text-center">Pass Rate</th>
                        <th className="px-6 py-3 text-right">Violations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {testSummaries.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{t.title}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-700">{t.submissionsCount}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-900">{t.avgScore}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              t.passRate >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              t.passRate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {t.passRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {t.violations > 0 ? (
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {t.violations} flags
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">No assessment data available.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution Brackets */}
        <div>
          <Card className="border border-slate-200 h-full">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-purple-600" />
                Score Range Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {Object.entries(scoreBrackets).map(([bracket, count]: [string, any]) => {
                const total = kpis.totalSubmissions || 1;
                const pct = Math.round((count / total) * 100);
                const colorMap: Record<string, string> = {
                  '80-100': 'bg-emerald-500',
                  '60-79': 'bg-blue-500',
                  '40-59': 'bg-amber-500',
                  '0-39': 'bg-rose-500'
                };
                return (
                  <div key={bracket} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{bracket}% Score Range</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorMap[bracket] || 'bg-blue-500'} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
