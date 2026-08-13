import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, FileText, Settings } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { Test } from '../../types';

export const Tests = () => {
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = await testService.getTrainerTests();
        setTests(data);
      } catch (error) {
        console.error("Failed to load tests", error);
      }
    };
    fetchTests();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assessments</h1>
          <p className="text-slate-500">Manage and create new tests.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/trainer/tests/schedule">
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Test
            </Button>
          </Link>
          <Link to="/trainer/tests/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {tests.length > 0 ? (
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded text-blue-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{test.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{test.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{test.questionIds.length}</td>
                  <td className="px-6 py-4 font-medium">{test.settings.duration} min</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                      ${test.status === 'Draft' ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                        test.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        test.status === 'Live' ? 'bg-green-50 text-green-700 border-green-200' : 
                        'bg-purple-50 text-purple-700 border-purple-200'}`
                    }>
                      {test.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Settings className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No tests found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Get started by creating your first assessment from an uploaded question bank.</p>
            <Link to="/trainer/tests/create">
              <Button>Create First Test</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
