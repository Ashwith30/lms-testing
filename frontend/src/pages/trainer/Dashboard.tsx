import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { FileText, Play, Users, CheckCircle, ChevronRight } from 'lucide-react';
import { testService } from '../../services/testService';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Test } from '../../types';

export const TrainerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    activeTests: 0,
    totalStudents: 0,
    testsCompleted: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const allTests = await testService.getTrainerTests(user?.id);
        const usersRes = await api.get('/users/all').catch(() => ({ data: [] }));
        const attemptsRes = await api.get('/attempts').catch(() => ({ data: [] }));
        
        const students = usersRes.data.filter((u: any) => u.role === 'student');
        const attempts = attemptsRes.data.filter((a: any) => a.status === 'submitted' || a.status === 'auto_submitted');
        
        setTests(allTests.slice(0, 5));
        setStats({
          totalTests: allTests.length,
          activeTests: allTests.filter(t => t.status === 'Live' || t.status === 'Scheduled').length,
          totalStudents: students.length || 0,
          testsCompleted: attempts.length || 0
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { title: 'Tests', value: stats.totalTests, icon: FileText, accent: 'bg-blue-50 text-blue-600', link: '/trainer/tests' },
    { title: 'Active', value: stats.activeTests, icon: Play, accent: 'bg-amber-50 text-amber-600', link: '/trainer/tests' },
    { title: 'Students', value: stats.totalStudents, icon: Users, accent: 'bg-emerald-50 text-emerald-600', link: '/trainer/students' },
    { title: 'Completed', value: stats.testsCompleted, icon: CheckCircle, accent: 'bg-sky-50 text-sky-600', link: '/trainer/results' },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">Dashboard</h1>
        <p className="text-sm text-[#9099a8]">Overview of your assessments and students.</p>
      </div>

      {/* Interactive Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.link)}
            className="bg-white rounded-xl border border-[#e2e5ea] hover:border-blue-300 hover:shadow-md transition-all p-4 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider group-hover:text-blue-600 transition-colors">{stat.title}</p>
              <div className={`h-7 w-7 rounded-md flex items-center justify-center ${stat.accent} group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-[#1a1d23] leading-none">{stat.value}</p>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tests */}
      <div className="bg-white rounded-xl border border-[#e2e5ea] shadow-soft overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#eef0f3] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#1a1d23]">Recent tests</h2>
          <button 
            onClick={() => navigate('/trainer/tests')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            View All →
          </button>
        </div>
        {tests.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#eef0f3]">
                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Test</th>
                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Questions</th>
                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[#9099a8] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0f3]">
                  {tests.map((test) => (
                    <tr 
                      key={test.id} 
                      onClick={() => navigate('/trainer/tests')}
                      className="hover:bg-[#f7f8fa] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3 font-medium text-[#1a1d23] text-[13px] group-hover:text-blue-600 transition-colors">
                        {test.title}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-[#5a6170]">{test.questionIds?.length ?? 0}</td>
                      <td className="px-5 py-3 text-[13px] text-[#5a6170]">{test.settings?.duration ?? 60} min</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold
                          ${test.status === 'Draft' ? 'bg-[#f0f2f5] text-[#5a6170]' : 
                            test.status === 'Scheduled' ? 'bg-blue-50 text-blue-700' : 
                            test.status === 'Live' ? 'bg-emerald-50 text-emerald-700' : 
                            'bg-slate-100 text-slate-700'}`
                        }>
                          {test.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-[#eef0f3]">
              {tests.map((test) => (
                <div 
                  key={test.id} 
                  onClick={() => navigate('/trainer/tests')}
                  className="p-4 space-y-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[#1a1d23] text-[13px] truncate">{test.title}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold
                      ${test.status === 'Draft' ? 'bg-[#f0f2f5] text-[#5a6170]' : 
                        test.status === 'Scheduled' ? 'bg-blue-50 text-blue-700' : 
                        test.status === 'Live' ? 'bg-emerald-50 text-emerald-700' : 
                        'bg-slate-100 text-slate-700'}`
                    }>
                      {test.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#9099a8]">
                    <span>{test.questionIds?.length ?? 0} Questions</span>
                    <span>•</span>
                    <span>{test.settings?.duration ?? 60} min</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-[#9099a8] text-sm">
            No tests created yet.
          </div>
        )}
      </div>
    </div>
  );
};
