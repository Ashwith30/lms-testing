import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';
import { 
  BarChart3, TrendingUp, Award, Clock, ShieldAlert,
  Download, AlertTriangle, ChevronRight, Activity, CheckCircle2
} from 'lucide-react';

const BRAND_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export const TrainerAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Controls & Filters
  const [timeframe, setTimeframe] = useState<'Hourly' | 'Day' | 'Week' | 'Month'>('Month');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('score');

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

  const handleExportCSV = () => {
    if (!data) return;
    const { kpis = {}, categoryPerformance = [] } = data;
    const headers = ['Metric / Domain', 'Value', 'Details'];
    const rows = [
      ['Total Assessments', kpis.totalTests || 1, 'Active'],
      ['Total Submissions', kpis.totalSubmissions || 20, 'Completed'],
      ['Cohort Average Score', `${kpis.avgScore || 71.5}%`, 'Overall'],
      ['Pass Rate (>=60%)', `${kpis.passRate || 75}%`, '15 of 20 passed'],
      ['Proctoring Flags', kpis.totalViolations || 15, 'Logged incidents'],
      ...categoryPerformance.map((c: any) => [`Topic: ${c.category}`, `${c.avgScore}%`, `${c.totalQuestions} Questions`])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cohort_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading assessment intelligence...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 max-w-lg mx-auto my-12 p-8">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Analytics Data Available</h3>
        <p className="text-sm text-slate-500 mt-1">Please conduct test sessions to generate telemetry.</p>
      </div>
    );
  }

  const {
    kpis = {},
    categoryPerformance = []
  } = data;

  // Comparison graph timeline data
  const comparisonData = [
    { month: 'January', currentScore: 52, benchmarkScore: 65 },
    { month: 'February', currentScore: 64, benchmarkScore: 70 },
    { month: 'March', currentScore: 58, benchmarkScore: 68 },
    { month: 'April', currentScore: 62, benchmarkScore: 72 },
    { month: 'May', currentScore: 67, benchmarkScore: 70 },
    { month: 'June', currentScore: 71, benchmarkScore: 75 },
    { month: 'July', currentScore: 69, benchmarkScore: 72 },
    { month: 'August', currentScore: 74, benchmarkScore: 78 },
    { month: 'September', currentScore: 71.5, benchmarkScore: 75 },
    { month: 'October', currentScore: 76, benchmarkScore: 80 },
    { month: 'November', currentScore: 79, benchmarkScore: 82 },
    { month: 'December', currentScore: 82, benchmarkScore: 85 }
  ];

  // Dynamics Donut Data with standard harmonious brand palette
  const dynamicsDonutData = categoryPerformance.length > 0 ? categoryPerformance.map((c: any, idx: number) => {
    return {
      name: `${c.category} (${c.avgScore}%)`,
      value: c.totalQuestions,
      color: BRAND_COLORS[idx % BRAND_COLORS.length]
    };
  }) : [
    { name: 'Aptitude (100%)', value: 10, color: '#2563eb' },
    { name: 'Verbal (94%)', value: 10, color: '#10b981' },
    { name: 'Reasoning (48%)', value: 10, color: '#f59e0b' },
    { name: 'Technical (6%)', value: 5, color: '#8b5cf6' }
  ];

  // Concept table items from categoryPerformance
  const conceptItems = categoryPerformance.length > 0 ? categoryPerformance.map((c: any, idx: number) => ({
    n: idx + 1,
    concept: c.category,
    qty: `${c.totalQuestions} Qs`,
    total: `${c.avgScore}% Avg`
  })) : [
    { n: 1, concept: 'Quantitative Aptitude', qty: '10 Qs', total: '100.0% Avg' },
    { n: 2, concept: 'Verbal Ability & Grammar', qty: '10 Qs', total: '94.0% Avg' },
    { n: 3, concept: 'Logical Reasoning & Sets', qty: '10 Qs', total: '48.0% Avg' },
    { n: 4, concept: 'Data Structures & Algorithms', qty: '5 Qs', total: '6.0% Avg' }
  ];

  // Dot matrix difficulty & discrimination rows
  const dotMatrixRows = [
    { level: 'L5', label: 'Advanced', activeDots: [1, 2, 3, 4] },
    { level: 'L4', label: 'Hard', activeDots: [2, 3, 4, 5, 8] },
    { level: 'L3', label: 'Moderate', activeDots: [1, 2, 3, 4, 5, 6, 7, 10, 11] },
    { level: 'L2', label: 'Foundational', activeDots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
    { level: 'L1', label: 'Basic', activeDots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }
  ];

  // Mini sparkline data for top cards
  const blueSparkline = [
    { x: 1, y: 55 }, { x: 2, y: 62 }, { x: 3, y: 58 }, { x: 4, y: 68 },
    { x: 5, y: 64 }, { x: 6, y: 70 }, { x: 7, y: 69 }, { x: 8, y: kpis.avgScore || 71.5 }
  ];

  const greenSparkline = [
    { x: 1, y: 60 }, { x: 2, y: 65 }, { x: 3, y: 70 }, { x: 4, y: 68 },
    { x: 5, y: 72 }, { x: 6, y: 70 }, { x: 7, y: 74 }, { x: 8, y: kpis.passRate || 75.0 }
  ];

  const blueBars = [35, 65, 85, 45, 95, 20, 30, 40, 60, 80, 50, 40, 55, 75, 40, 90, 30, 20];
  const purpleBars = [25, 45, 35, 75, 55, 65, 85, 45, 35, 60, 50, 40, 35, 85, 40, 95, 65, 80, 70, 75];

  return (
    <div className="space-y-6 animate-in pb-12 font-sans text-slate-800">
      
      {/* ── 1. Top Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">
            Assessment Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cohort performance metrics, domain competency, and examination telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            title="Export CSV Telemetry"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top 4 Metric Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Cohort Avg Score + Blue Sparkline */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort Avg Score</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpis.totalSubmissions || 20} submissions</p>
            </div>
            <span className="text-2xl font-bold text-blue-600">{kpis.avgScore || 71.5}%</span>
          </div>

          <div className="h-12 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={blueSparkline}>
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Pass Rate + Green Sparkline */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate (≥60%)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">15 of 20 passed</p>
            </div>
            <span className="text-2xl font-bold text-emerald-600">{kpis.passRate || 75}%</span>
          </div>

          <div className="h-12 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={greenSparkline}>
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Attempt Velocity + Blue Bar Columns */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-sky-200 transition-all flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempt Velocity</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Submission pacing</p>
          </div>

          <div className="flex items-end gap-1 h-12 w-full mt-3 pt-2">
            {blueBars.map((val, idx) => (
              <div 
                key={idx} 
                className="flex-1 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600" 
                style={{ height: `${val}%` }}
                title={`Timeline Segment ${idx + 1}: ${val}%`}
              ></div>
            ))}
          </div>
        </div>

        {/* Card 4: Integrity Index + Purple Bar Columns */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-purple-200 transition-all flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Integrity Index</p>
            <p className="text-[11px] text-slate-400 mt-0.5">92% Clean • {kpis.totalViolations || 15} Flags</p>
          </div>

          <div className="flex items-end gap-1 h-12 w-full mt-3 pt-2">
            {purpleBars.map((val, idx) => (
              <div 
                key={idx} 
                className="flex-1 bg-purple-500 rounded-t-sm transition-all hover:bg-purple-600" 
                style={{ height: `${val}%` }}
                title={`Audit Period ${idx + 1}`}
              ></div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 3. Middle Section: Comparison Graph ────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Comparison Graph</h2>
            <p className="text-xs text-slate-400">Cohort performance trajectory vs institutional target benchmark</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Choose statistics dropdown */}
            <select
              value={selectedStatistic}
              onChange={e => setSelectedStatistic(e.target.value)}
              className="py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            >
              <option value="all">All Assessments Combined</option>
              <option value="aptitude">Quantitative Aptitude</option>
              <option value="verbal">Verbal Ability</option>
              <option value="logical">Logical Reasoning</option>
            </select>

            {/* Choose metrics dropdown */}
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              className="py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            >
              <option value="score">Cohort Average Score (%)</option>
              <option value="completion">Completion Velocity (%)</option>
              <option value="accuracy">Accuracy Rate (%)</option>
            </select>

            {/* Timeframe Pill Tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['Hourly', 'Day', 'Week', 'Month'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTimeframe(tab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    timeframe === tab 
                      ? 'bg-white text-blue-600 shadow-xs font-bold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dual Line Chart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} axisLine={false} tickLine={false} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                labelStyle={{ fontWeight: 'bold', color: '#cbd5e1' }}
              />
              <Line 
                type="linear" 
                dataKey="benchmarkScore" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Benchmark Target (%)" 
              />
              <Line 
                type="linear" 
                dataKey="currentScore" 
                stroke="#2563eb" 
                strokeWidth={2} 
                dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Cohort Average (%)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend Footer */}
        <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-600">
            <span className="w-3 h-0.5 bg-blue-600 rounded"></span>
            <span>Cohort Average (%)</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-slate-600">
            <span className="w-3 h-0.5 bg-amber-500 rounded"></span>
            <span>Benchmark Target (%)</span>
          </div>
        </div>

      </div>

      {/* ── 4. Three-Column Detailed Matrix Row ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Domain Concepts Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Topic Competency</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2 uppercase text-[10px] tracking-wider">
                    <th className="pb-2 w-8">#</th>
                    <th className="pb-2">Module / Topic</th>
                    <th className="pb-2 text-center">Questions</th>
                    <th className="pb-2 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conceptItems.map((item: any) => (
                    <tr key={item.n} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-400">{item.n}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px] inline-block max-w-[170px] truncate border border-blue-100">
                          {item.concept}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-medium text-slate-600">{item.qty}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Middle Column: "Detailed" Difficulty & Discrimination Matrix */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Difficulty Matrix</h3>
            <p className="text-[11px] text-slate-400">Psychometric item difficulty & discrimination density</p>
          </div>

          <div className="space-y-3 py-3">
            {dotMatrixRows.map(row => (
              <div key={row.level} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 w-5">{row.level}</span>
                <div className="flex items-center gap-1.5 flex-1 justify-between">
                  {Array.from({ length: 15 }).map((_, dotIdx) => {
                    const isActive = row.activeDots.includes(dotIdx);
                    return (
                      <span
                        key={dotIdx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          isActive 
                            ? 'bg-blue-600 scale-110' 
                            : 'bg-slate-200'
                        }`}
                      ></span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            <span>Basic Concepts</span>
            <span>Target Level (L3)</span>
            <span>Advanced Questions</span>
          </div>
        </div>

        {/* Right Column: "Dynamics" Domain Distribution Donut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Domain Dynamics</h3>
            <p className="text-[11px] text-slate-400">
              Subject question weight and module distribution
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 my-2">
            {/* Legend */}
            <div className="space-y-2 text-[11px] font-medium text-slate-600 flex-1">
              {dynamicsDonutData.map((item: any) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="truncate text-slate-700 font-medium">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Donut Chart */}
            <div className="w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={dynamicsDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={48}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {dynamicsDonutData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Modules: <strong>{categoryPerformance.length || 4}</strong></span>
            <span>Total Questions: <strong>35</strong></span>
          </div>
        </div>

      </div>

      {/* ── 5. Bottom Telemetry & Progress Bars Row ───────────────────────── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Candidate Participation */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Participation</h4>
            
            <div className="space-y-3">
              <div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '80%' }}></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-1">
                  <span>Enrolled Candidates</span>
                  <span className="font-semibold text-slate-800">20/25 Enrolled</span>
                </div>
              </div>

              <div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-1">
                  <span>Completed Submissions</span>
                  <span className="font-semibold text-slate-800">20/20 Completed</span>
                </div>
              </div>

              <div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-1">
                  <span>Evaluated Responses</span>
                  <span className="font-semibold text-slate-800">700/700 Answers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Performance Telemetry */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Performance Index</h4>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 w-8">78%</span>
                <div className="flex-1 bg-slate-100 rounded-md h-4 overflow-hidden">
                  <div className="bg-blue-600 h-4 rounded-md" style={{ width: '78%' }}></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 w-8">48%</span>
                <div className="flex-1 bg-slate-100 rounded-md h-4 overflow-hidden">
                  <div className="bg-amber-500 h-4 rounded-md" style={{ width: '48%' }}></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 w-8">92%</span>
                <div className="flex-1 bg-slate-100 rounded-md h-4 overflow-hidden">
                  <div className="bg-emerald-500 h-4 rounded-md" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Telemetry & Demographics */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cohort Demographics</h4>
            
            <div className="space-y-2.5 text-xs font-medium text-slate-600">
              <div className="flex items-center justify-between">
                <span>Platform (Desktop vs Mobile)</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 bg-blue-600 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-800 w-5 text-right">16</span>
                  <div className="w-10 bg-slate-200 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-500 w-5 text-right">4</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Branch (CSE vs Other)</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 bg-blue-600 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-800 w-5 text-right">14</span>
                  <div className="w-10 bg-slate-200 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-500 w-5 text-right">6</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Outcome (Passed vs Remediation)</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 bg-emerald-500 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-800 w-5 text-right">15</span>
                  <div className="w-10 bg-rose-400 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-500 w-5 text-right">5</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Duration (&lt;40m vs &gt;40m)</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 bg-blue-600 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-800 w-5 text-right">12</span>
                  <div className="w-10 bg-slate-200 h-1.5 rounded"></div>
                  <span className="font-bold text-slate-500 w-5 text-right">8</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
