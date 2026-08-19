import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FileText, Play, Users, CheckCircle } from 'lucide-react';
import { testService } from '../../services/testService';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Test } from '../../types';

export const TrainerDashboard = () => {
  const { user } = useAuth();
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
    { title: 'Total Tests', value: stats.totalTests, icon: FileText, color: 'text-blue-600' },
    { title: 'Active Tests', value: stats.activeTests, icon: Play, color: 'text-amber-600' },
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-emerald-600' },
    { title: 'Tests Completed', value: stats.testsCompleted, icon: CheckCircle, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trainer Dashboard</h1>
        <p className="text-slate-500">Overview of your assessments and students.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-slate-100 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 rounded-tl-lg">Test</th>
                    <th className="px-6 py-3">Questions</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.id} className="bg-white border-b">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {test.title}
                      </td>
                      <td className="px-6 py-4">{test.questionIds.length}</td>
                      <td className="px-6 py-4">{test.settings.duration} min</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                          ${test.status === 'Draft' ? 'bg-slate-100 text-slate-700' : 
                            test.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 
                            test.status === 'Live' ? 'bg-green-100 text-green-700' : 
                            'bg-purple-100 text-purple-700'}`
                        }>
                          {test.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No tests created yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
