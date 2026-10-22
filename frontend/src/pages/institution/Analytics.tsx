import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ChevronDown,
  Download,
  RefreshCw,
  LayoutGrid,
  Trophy,
  Sparkles,
  ExternalLink,
  X,
  Info,
  Layers,
  GraduationCap,
  Target,
  BrainCircuit,
  Compass
} from 'lucide-react';

// Color definitions matching exact palette from image
const DEPT_COLORS: Record<string, string> = {
  'CSM': '#06b6d4',      // Cyan
  'CSD': '#8b5cf6',      // Purple
  'CSE': '#2563eb',      // Royal Blue
  'MECH': '#ef4444',     // Rose / Red
  'EEE': '#f59e0b',      // Amber
  'ECE': '#10b981',      // Emerald Green
};

const PARTICIPATION_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];


export const InstitutionAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Widget filter states
  const [deptMetricFilter, setDeptMetricFilter] = useState<'passRate' | 'avgScore' | 'both'>('both');
  const [scoreDeptFilter, setScoreDeptFilter] = useState<string>('All Departments');
  const [trendMetricFilter, setTrendMetricFilter] = useState<'avgScore' | 'passRate'>('avgScore');
  const [skillDeptFilter, setSkillDeptFilter] = useState<string>('All Departments');
  const [topPerformersFilter, setTopPerformersFilter] = useState<'overall' | 'recent'>('overall');

  // Interactive modal states
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState('spring2026');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/institution');
      setData(res.data);
    } catch (e) {
      console.error('Failed to load institution analytics', e);
      // Fallback data if backend is unreachable
      setData({
        kpis: {
          totalEnrolled: 0,
          totalEnrolledGrowth: '',
          avgScore: 0.0,
          avgScoreGrowth: '',
          passRate: 0.0,
          passRateSubtitle: 'Candidates with score >= 60%',
          totalSubmissions: 0,
          totalSubmissionsGrowth: '',
          testsCount: 0
        },
        departmentPerformance: [],
        scoreDistribution: [
          { range: '0-20', count: 0, percentage: 0 },
          { range: '20-40', count: 0, percentage: 0 },
          { range: '40-60', count: 0, percentage: 0 },
          { range: '60-80', count: 0, percentage: 0 },
          { range: '80-100', count: 0, percentage: 0 }
        ],
        deptScoreDistributions: {
          'All Departments': [
            { range: '0-20', count: 0, percentage: 0 },
            { range: '20-40', count: 0, percentage: 0 },
            { range: '40-60', count: 0, percentage: 0 },
            { range: '60-80', count: 0, percentage: 0 },
            { range: '80-100', count: 0, percentage: 0 }
          ],
          'CSM': [],
          'CSD': [],
          'CSE': [],
          'MECH': [],
          'EEE': [],
          'ECE': []
        },
        performanceTrend: [],
        skillCompetency: {
          'All Departments': [],
          'CSM': [],
          'CSD': [],
          'CSE': [],
          'MECH': [],
          'EEE': [],
          'ECE': []
        },
        heatmapData: {
          tests: [],
          departments: []
        },
        topPerformers: [],
        passRateComparison: [],
        participation: {
          onTime: 0.0,
          late: 0.0,
          missed: 0.0,
          totalSubmissions: 0
        },
        insights: [
          {
            id: 1,
            type: 'info',
            icon: 'info',
            text: 'Unable to connect to live analytics service.',
            highlight: 'Offline',
            action: 'Check Server Connection'
          }
        ]
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const getCycleLabel = (cycleKey: string) => {
    switch (cycleKey) {
      case 'spring2026': return 'Academic Year 2025–2026';
      case 'fall2025': return 'Academic Year 2024–2025';
      case 'all': return 'All Academic Years';
      default: return 'Academic Year 2025–2026';
    }
  };

  const exportCSVReport = (reportData: any, cycleLabel: string) => {
    const lines: string[] = [];
    lines.push(`CAMPUS PERFORMANCE INTELLIGENCE REPORT`);
    lines.push(`Academic Term,${cycleLabel}`);
    lines.push(`Generated On,${new Date().toLocaleString()}`);
    lines.push(``);
    
    lines.push(`--- EXECUTIVE SUMMARY METRICS ---`);
    lines.push(`Metric,Value,Details`);
    lines.push(`Total Active Enrolled Students,${reportData?.kpis?.totalEnrolled ?? 0},${reportData?.kpis?.totalEnrolledGrowth ?? ''}`);
    lines.push(`Campus Average Score,${reportData?.kpis?.avgScore ?? 0}%,${reportData?.kpis?.avgScoreGrowth ?? ''}`);
    lines.push(`Placement Readiness Rate,${reportData?.kpis?.passRate ?? 0}%,Qualified Candidates (>=60%)`);
    lines.push(`Total Test Submissions,${reportData?.kpis?.totalSubmissions ?? 0},Across ${reportData?.kpis?.testsCount ?? 0} Tests`);
    lines.push(``);

    lines.push(`--- DEPARTMENT BENCHMARKS ---`);
    lines.push(`Department,Average Score (%),Pass Rate (%),Enrolled Students,Total Attempts`);
    (reportData?.departmentPerformance || []).forEach((d: any) => {
      lines.push(`"${d.name}",${d.avgScore ?? 0}%,${d.passRate ?? 0}%,${d.students ?? 0},${d.attempts ?? 0}`);
    });
    lines.push(``);

    lines.push(`--- SKILL COMPETENCY (CAMPUS WIDE) ---`);
    lines.push(`Skill Domain,Cohort Score (%),Benchmark Target (%)`);
    const skills = reportData?.skillCompetency?.['All Departments'] || [];
    skills.forEach((s: any) => {
      lines.push(`"${s.skill}",${s.score ?? 0}%,${s.benchmark ?? 0}%`);
    });
    lines.push(``);

    lines.push(`--- TOP PERFORMERS ---`);
    lines.push(`Rank,Student Name,Department,Average Score (%)`);
    (reportData?.topPerformers || []).forEach((p: any) => {
      lines.push(`${p.rank},"${p.name}","${p.department}",${p.score ?? 0}%`);
    });
    lines.push(``);

    lines.push(`--- ASSESSMENT PARTICIPATION ---`);
    lines.push(`Status,Percentage (%)`);
    lines.push(`On-Time Submissions,${reportData?.participation?.onTime ?? 0}%`);
    lines.push(`Late Submissions,${reportData?.participation?.late ?? 0}%`);
    lines.push(`Missed Assessments,${reportData?.participation?.missed ?? 0}%`);

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const cleanDate = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Campus_Performance_Report_${cleanDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDFReport = (reportData: any, cycleLabel: string) => {
    const kpis = reportData?.kpis || {};
    const depts = reportData?.departmentPerformance || [];
    const skills = reportData?.skillCompetency?.['All Departments'] || [];
    const topPerformers = reportData?.topPerformers || [];

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      exportCSVReport(reportData, cycleLabel);
      setExportToast('Popup blocked by browser. Downloaded report as CSV.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Campus Performance Intelligence Report - ${cycleLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #ffffff;
      color: #0f172a;
      padding: 32px;
      line-height: 1.45;
      font-size: 12px;
    }
    @media print {
      body { padding: 16px; font-size: 11px; }
      .no-print { display: none !important; }
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
    }
    .meta-details {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .meta-details strong { color: #0f172a; }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 3px;
    }
    .kpi-sub {
      font-size: 10px;
      font-weight: 600;
      color: #16a34a;
      margin-top: 2px;
    }

    .section-heading {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-heading::before {
      content: "";
      width: 3px;
      height: 14px;
      background: #2563eb;
      border-radius: 2px;
      display: inline-block;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
    }

    .banner-insight {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .banner-insight h4 {
      color: #15803d;
      font-size: 11px;
      font-weight: 700;
    }
    .banner-insight p {
      color: #334155;
      font-size: 10px;
      margin-top: 2px;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }

    .controls-banner {
      background: #1e293b;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-print:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="controls-banner no-print">
    <span>Institutional Performance Report preview ready for download & printing.</span>
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="header-bar">
    <div>
      <div class="brand-title">Campus Performance Intelligence</div>
      <div class="brand-sub">Comprehensive Assessment Analytics, Benchmarks, and Cohort Mastery</div>
    </div>
    <div class="meta-details">
      <div class="badge">${cycleLabel}</div>
      <div style="margin-top: 5px;">Generated: <strong>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
      <div>Campus Scope: <strong>All Active Departments</strong></div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Total Enrolled</div>
      <div class="kpi-value">${kpis.totalEnrolled ?? 0}</div>
      <div class="kpi-sub">${kpis.totalEnrolledGrowth ? `${kpis.totalEnrolledGrowth} ` : ''}active students</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Average Campus Score</div>
      <div class="kpi-value">${kpis.avgScore ?? 0}%</div>
      <div class="kpi-sub">${kpis.avgScoreGrowth ? `${kpis.avgScoreGrowth} ` : ''}vs prior term</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Placement Readiness</div>
      <div class="kpi-value">${kpis.passRate ?? 0}%</div>
      <div class="kpi-sub">Qualified candidates (≥60%)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Submissions</div>
      <div class="kpi-value">${(kpis.totalSubmissions ?? 0).toLocaleString()}</div>
      <div class="kpi-sub">Across ${kpis.testsCount ?? 0} assessments</div>
    </div>
  </div>

  <div class="section-heading">Department Performance Benchmarks</div>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        <th>Avg Score</th>
        <th>Pass Rate</th>
        <th>Enrolled Students</th>
        <th>Total Attempts</th>
        <th>Readiness</th>
      </tr>
    </thead>
    <tbody>
      ${depts.length > 0 ? depts.map((d: any) => `
        <tr>
          <td><strong>${d.name}</strong></td>
          <td>${d.avgScore ?? 0}%</td>
          <td><span style="font-weight:700; color:${(d.passRate ?? 0) >= 80 ? '#16a34a' : (d.passRate ?? 0) >= 70 ? '#d97706' : '#dc2626'}">${d.passRate ?? 0}%</span></td>
          <td>${d.students ?? 0}</td>
          <td>${d.attempts ?? 0}</td>
          <td><strong>${(d.passRate ?? 0) >= 85 ? 'High' : (d.passRate ?? 0) >= 75 ? 'Moderate' : 'Needs Focus'}</strong></td>
        </tr>
      `).join('') : `
        <tr><td colspan="6" style="text-align:center; color:#64748b; padding:16px;">No department benchmark data available</td></tr>
      `}
    </tbody>
  </table>

  <div class="two-col">
    <div class="panel">
      <div class="section-heading">Skill Competency Mastery</div>
      <table>
        <thead>
          <tr>
            <th>Skill Domain</th>
            <th>Cohort Score</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${skills.length > 0 ? skills.map((s: any) => `
            <tr>
              <td><strong>${s.skill}</strong></td>
              <td>${s.score ?? 0}%</td>
              <td>${s.benchmark ?? 0}%</td>
              <td><span style="font-weight:700; color:${(s.score ?? 0) >= (s.benchmark ?? 0) ? '#16a34a' : '#ea580c'}">${(s.score ?? 0) >= (s.benchmark ?? 0) ? 'Achieved' : 'Below Target'}</span></td>
            </tr>
          `).join('') : `
            <tr><td colspan="4" style="text-align:center; color:#64748b; padding:16px;">No skill competency data recorded</td></tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="panel">
      <div class="section-heading">Top Performing Cohorts</div>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Candidate</th>
            <th>Dept</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${topPerformers.length > 0 ? topPerformers.map((p: any) => `
            <tr>
              <td><span class="badge" style="padding:1px 6px;">#${p.rank}</span></td>
              <td><strong>${p.name}</strong></td>
              <td>${p.department}</td>
              <td style="font-weight:800; color:#1d4ed8;">${p.score ?? 0}%</td>
            </tr>
          `).join('') : `
            <tr><td colspan="4" style="text-align:center; color:#64748b; padding:16px;">No candidate submissions available</td></tr>
          `}
        </tbody>
      </table>
    </div>
  </div>

  <div class="banner-insight">
    <h4>Key Academic Observation & AI Recommendation</h4>
    <p>${reportData?.insights && reportData.insights.length > 0 ? reportData.insights.map((i: any) => i.text).join(' ') : 'No institutional observations or recommendations recorded for this cycle.'}</p>
  </div>

  <div class="footer">
    <span>Institutional Learning Management System • Official Analytics Intelligence Export</span>
    <span>Page 1 of 1 • Confidential & Proprietary</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExport = (type: 'pdf' | 'csv' | 'all' = 'pdf') => {
    const cycleLabel = getCycleLabel(selectedCycle);
    if (type === 'csv') {
      exportCSVReport(data, cycleLabel);
      setExportToast('Campus Performance Report downloaded as CSV.');
    } else if (type === 'pdf') {
      exportPDFReport(data, cycleLabel);
      setExportToast('Generating and downloading PDF Report...');
    } else if (type === 'all') {
      exportCSVReport(data, cycleLabel);
      exportPDFReport(data, cycleLabel);
      setExportToast('Exported Report in PDF & CSV formats.');
    }
    setShowExportMenu(false);
    setTimeout(() => {
      setExportToast(null);
    }, 4000);
  };

  // Score distribution data filtered by department
  const activeScoreData = useMemo(() => {
    if (!data?.deptScoreDistributions) {
      return data?.scoreDistribution || [];
    }
    return data.deptScoreDistributions[scoreDeptFilter] || data.scoreDistribution || [];
  }, [data, scoreDeptFilter]);

  // Skill Competency data filtered by department
  const activeSkillData = useMemo(() => {
    if (!data?.skillCompetency) {
      return [];
    }
    return data.skillCompetency[skillDeptFilter] || data.skillCompetency['All Departments'] || [];
  }, [data, skillDeptFilter]);

  // Custom tooltips
  const SkillCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0]?.payload;
      return (
        <div className="bg-white px-3 py-2 rounded-xl shadow-xl border border-slate-200 text-xs font-sans">
          <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">{p?.skill}</p>
          <div className="flex items-center justify-between gap-3 text-indigo-600 font-semibold py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Cohort Mastery:
            </span>
            <span className="font-bold text-slate-900">{p?.score}%</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-500 text-[11px] py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Campus Target:
            </span>
            <span className="font-medium text-slate-700">{p?.benchmark}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const DeptCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-200 text-xs font-sans">
          <p className="font-bold text-slate-900 mb-1 border-b border-slate-100 pb-1">{label} Department</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-800">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScoreCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs">
          <p className="font-bold text-slate-900">Score Range: {label}%</p>
          <p className="text-indigo-600 font-semibold mt-0.5">
            Students: <span className="font-bold text-slate-900">{payload[0]?.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const TrendCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-200 text-xs">
          <p className="font-bold text-slate-900 mb-1.5 border-b border-slate-100 pb-1">{label}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 font-medium" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-800">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading institutional analytics...</p>
        </div>
      </div>
    );
  }

  const { kpis, departmentPerformance, performanceTrend, heatmapData, topPerformers, passRateComparison, participation, insights } = data;

  const participationData = [
    { name: 'On Time', value: participation?.onTime ?? 0, color: '#22c55e' },
    { name: 'Late', value: participation?.late ?? 0, color: '#f59e0b' },
    { name: 'Missed', value: participation?.missed ?? 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {exportToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium">{exportToast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase">
            <BarChart3 className="h-4 w-4" />
            <span>Institutional Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Campus Performance Intelligence
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time department benchmarks, score distributions, multi-test trajectories, and student cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap overflow-x-auto">
          <div className="relative inline-block text-left shrink-0">
            <select
              aria-label="Filter Academic Year"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-7 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer h-9"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
            >
              <option value="spring2026">Academic Year 2025–2026</option>
              <option value="fall2025">Academic Year 2024–2025</option>
              <option value="all">All Academic Years</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button
            size="sm"
            onClick={() => handleExport('pdf')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl h-9 px-3.5 shadow-xs shrink-0 cursor-pointer"
            title="Download Performance Report (PDF)"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* TOP 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: TOTAL ENROLLED */}
        <Card className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL ENROLLED</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {(kpis?.totalEnrolled ?? 0).toLocaleString()}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: AVERAGE SCORE */}
        <Card className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AVERAGE SCORE</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {kpis?.avgScore ?? 0}%
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: OVERALL PASS RATE */}
        <Card className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">OVERALL PASS RATE</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {kpis?.passRate ?? 0}%
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: TOTAL SUBMISSIONS */}
        <Card className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL SUBMISSIONS</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {(kpis?.totalSubmissions ?? 0).toLocaleString()}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Department Performance & Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Department Performance Grouped Bar Chart (7 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-7 flex flex-col justify-between">
          <div className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Department Performance
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  aria-label="Filter Department Performance Metric"
                  value={deptMetricFilter}
                  onChange={(e) => setDeptMetricFilter(e.target.value as any)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-3 pr-7 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="both">All Metrics</option>
                  <option value="passRate">Pass Rate %</option>
                  <option value="avgScore">Average Score %</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <CardContent className="p-5 pt-4">
            {/* Legend */}
            <div className="flex items-center justify-end gap-5 mb-4 text-xs font-semibold">
              {(deptMetricFilter === 'both' || deptMetricFilter === 'avgScore') && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                  <span>Average Score %</span>
                </div>
              )}
              {(deptMetricFilter === 'both' || deptMetricFilter === 'passRate') && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                  <span>Pass Rate %</span>
                </div>
              )}
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentPerformance}
                  margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
                  barGap={4}
                  barCategoryGap={24}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip content={<DeptCustomTooltip />} />
                  {(deptMetricFilter === 'both' || deptMetricFilter === 'avgScore') && (
                    <Bar dataKey="avgScore" name="Average Score" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      <LabelList
                        dataKey="avgScore"
                        position="top"
                        formatter={(val: any) => `${val}%`}
                        style={{ fill: '#1e293b', fontSize: 10, fontWeight: 700 }}
                      />
                    </Bar>
                  )}
                  {(deptMetricFilter === 'both' || deptMetricFilter === 'passRate') && (
                    <Bar dataKey="passRate" name="Pass Rate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      <LabelList
                        dataKey="passRate"
                        position="top"
                        formatter={(val: any) => `${val}%`}
                        style={{ fill: '#1e293b', fontSize: 10, fontWeight: 700 }}
                      />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right: Score Distribution Histogram (5 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-5 flex flex-col justify-between">
          <div className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Score Distribution
              </h2>
            </div>

            <div className="relative">
              <select
                aria-label="Filter Score Distribution by Department"
                value={scoreDeptFilter}
                onChange={(e) => setScoreDeptFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-3 pr-7 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="All Departments">All Departments</option>
                <option value="CSM">CSM</option>
                <option value="CSD">CSD</option>
                <option value="CSE">CSE</option>
                <option value="MECH">MECH</option>
                <option value="EEE">EEE</option>
                <option value="ECE">ECE</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <CardContent className="p-5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No. of Students</span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeScoreData}
                  margin={{ top: 20, right: 10, left: -15, bottom: 20 }}
                  barSize={38}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="range"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    label={{ value: 'Score Range', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip content={<ScoreCustomTooltip />} />
                  <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Performance Trend, Department-wise Heatmap, Top Performers (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Performance Trend (4 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <div className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Performance Trend
              </h2>
            </div>

            <div className="relative">
              <select
                aria-label="Filter Performance Trend Metric"
                value={trendMetricFilter}
                onChange={(e) => setTrendMetricFilter(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="avgScore">Average Score %</option>
                <option value="passRate">Pass Rate %</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <CardContent className="p-4 pt-3">
            {/* Department legend dots */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-3 text-[11px] font-semibold text-slate-600">
              {Object.entries(DEPT_COLORS).map(([dept, color]) => (
                <div key={dept} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{dept}</span>
                </div>
              ))}
            </div>

            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={performanceTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="test"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                  />
                  <Tooltip content={<TrendCustomTooltip />} />
                  <Line type="monotone" dataKey="CSM" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="CSD" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="CSE" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="MECH" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="EEE" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="ECE" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Skill & Domain Competency (4 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <div className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Skill & Domain Competency
              </h2>
            </div>

            <div className="relative">
              <select
                aria-label="Filter Skill Competency by Department"
                value={skillDeptFilter}
                onChange={(e) => setSkillDeptFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="All Departments">All Departments</option>
                <option value="CSM">CSM</option>
                <option value="CSD">CSD</option>
                <option value="CSE">CSE</option>
                <option value="MECH">MECH</option>
                <option value="EEE">EEE</option>
                <option value="ECE">ECE</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <CardContent className="p-3 pt-1 flex-1 flex flex-col justify-between">
            {/* Radar Chart */}
            <div className="h-[210px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="72%"
                  data={activeSkillData}
                >
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fill: '#94a3b8' }}
                  />
                  <Tooltip content={<SkillCustomTooltip />} />
                  <Radar
                    name="Mastery"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#6366f1"
                    fillOpacity={0.35}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="benchmark"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.05}
                    strokeDasharray="3 3"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom summary / Legend */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span>Cohort Mastery</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-500">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500"></span>
                <span>Target Benchmark (75%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Top Performers (4 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <div className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Trophy className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Top Performers
              </h2>
            </div>

            <div className="relative">
              <select
                aria-label="Filter Top Performers"
                value={topPerformersFilter}
                onChange={(e) => setTopPerformersFilter(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="overall">Overall Score</option>
                <option value="recent">Latest Assessment</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <CardContent className="p-3 pt-1">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-2 text-center">#</th>
                    <th className="py-2 px-2">STUDENT</th>
                    <th className="py-2 px-2 text-center">DEPARTMENT</th>
                    <th className="py-2 px-2 text-right">SCORE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {topPerformers?.map((student: any) => (
                    <tr
                      key={student.rank}
                      onClick={() => setSelectedStudent(student)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-2 text-center font-bold text-slate-600">
                        {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : student.rank}
                      </td>
                      <td className="py-2 px-2 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {student.avatar || student.name.substring(0, 2).toUpperCase()}
                          </span>
                          <span>{student.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-medium text-slate-600">
                        {student.department}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {student.score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Pass Rate Comparison, Test Participation, Insights & Recommendations (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Pass Rate Comparison (4 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <div className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Pass Rate Comparison
              </h2>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Current Cycle</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                <span>Previous Cycle</span>
              </div>
            </div>
          </div>

          <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-around">
            <div className="space-y-2.5">
              {passRateComparison && passRateComparison.length > 0 ? (
                passRateComparison.map((item: any) => (
                  <div key={item.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{item.department}</span>
                      <span className="text-slate-900 font-bold">{item.currentCycle ?? 0}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                      {/* Previous cycle ghost bar */}
                      <div
                        className="h-full bg-slate-200 rounded-full absolute left-0 top-0"
                        style={{ width: `${item.previousCycle ?? 0}%` }}
                      />
                      {/* Current cycle bar */}
                      <div
                        className="h-full bg-blue-600 rounded-full relative z-10 transition-all duration-500"
                        style={{ width: `${item.currentCycle ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No historical cycle comparison available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Test Participation Donut (4 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <div className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Test Participation
              </h2>
            </div>
          </div>

          <CardContent className="p-4 pt-2 flex-1 flex items-center justify-between">
            {/* Donut Chart with Center Metric */}
            <div className="relative w-36 h-36 mx-auto sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={participationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {participationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ pointerEvents: 'none', zIndex: 50 }}
                    content={({ active, payload, coordinate }) => {
                      if (active && payload && payload.length && coordinate) {
                        const d = payload[0];
                        // Position tooltip outward from center of donut
                        const cx = 72; // half of w-36 (144px)
                        const cy = 72;
                        const dx = (coordinate.x || 0) - cx;
                        const dy = (coordinate.y || 0) - cy;
                        const angle = Math.atan2(dy, dx);
                        const pushDist = 28;
                        const offsetX = Math.cos(angle) * pushDist;
                        const offsetY = Math.sin(angle) * pushDist;
                        return (
                          <div
                            className="bg-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-200 text-xs font-semibold whitespace-nowrap"
                            style={{
                              transform: `translate(${offsetX}px, ${offsetY}px)`,
                            }}
                          >
                            <span style={{ color: d.payload?.color }}>{d.name}</span>: {d.value}%
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-extrabold text-slate-900 leading-none">
                  {(participation?.totalSubmissions ?? 0).toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                  Submissions
                </span>
              </div>
            </div>

            {/* Breakdown List on right */}
            <div className="space-y-3 pl-2 pr-4">
              <div className="flex items-center justify-between gap-6 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  <span>On Time</span>
                </div>
                <span className="font-extrabold text-slate-900">{participation?.onTime ?? 0}%</span>
              </div>

              <div className="flex items-center justify-between gap-6 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>Late</span>
                </div>
                <span className="font-extrabold text-slate-900">{participation?.late ?? 0}%</span>
              </div>

              <div className="flex items-center justify-between gap-6 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span>Missed</span>
                </div>
                <span className="font-extrabold text-slate-900">{participation?.missed ?? 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Insights & Recommendations (4 cols) */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <div className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Insights & Recommendations
              </h2>
            </div>

            <button
              onClick={() => setShowAllInsights(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All
            </button>
          </div>

          <CardContent className="p-3.5 space-y-2.5">
            {insights && insights.length > 0 ? (
              insights.slice(0, 4).map((item: any) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all hover:shadow-xs ${
                    item.type === 'positive'
                      ? 'bg-emerald-50/90 border-emerald-200/70 text-emerald-950'
                      : item.type === 'warning'
                      ? 'bg-amber-50/90 border-amber-200/70 text-amber-950'
                      : item.type === 'engagement' || item.type === 'purple'
                      ? 'bg-violet-50/90 border-violet-200/70 text-violet-950'
                      : 'bg-blue-50/90 border-blue-200/70 text-blue-950'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      item.type === 'positive'
                        ? 'bg-emerald-600 text-white'
                        : item.type === 'warning'
                        ? 'bg-amber-500 text-white'
                        : item.type === 'engagement' || item.type === 'purple'
                        ? 'bg-violet-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {item.type === 'positive' ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : item.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : item.type === 'engagement' ? (
                      <Target className="w-3.5 h-3.5" />
                    ) : (
                      <Award className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-snug">
                    {item.text}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No institutional observations or recommendations recorded.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ALL INSIGHTS MODAL */}
      {showAllInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Institutional Insights & AI Recommendations</h3>
                  <p className="text-xs text-slate-500">Actionable intelligence derived from cross-department assessments</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllInsights(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {insights && insights.length > 0 ? (
                insights.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                      item.type === 'positive'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : item.type === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-blue-50/80 border-blue-200 text-blue-950'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        item.type === 'positive'
                          ? 'bg-emerald-600 text-white'
                          : item.type === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {item.type === 'positive' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : item.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Award className="w-4 h-4" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{item.text}</p>
                      <p className="text-xs text-slate-600">
                        Recommendation: {item.action || 'Continue positive reinforcement and track metric stability.'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No institutional insights recorded for this cycle.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowAllInsights(false)} className="rounded-xl">
                Close
              </Button>
              <Button onClick={() => { setShowAllInsights(false); handleExport('pdf'); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                Download Full Insights PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE POPUP MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {selectedStudent.avatar}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500">{selectedStudent.department} Department</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Institutional Rank</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">#{selectedStudent.rank}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Average Score</span>
                <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{selectedStudent.score}%</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Cohort Position:</span>
                <span className="font-bold text-slate-900">{selectedStudent.badge || 'Top Performer'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Campus Standing:</span>
                <span className="font-bold text-emerald-600">Rank #{selectedStudent.rank ?? '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Academic Record:</span>
                <span className="font-bold text-blue-600">{selectedStudent.score ?? 0}% Average</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedStudent(null)} className="w-full bg-slate-900 text-white rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
