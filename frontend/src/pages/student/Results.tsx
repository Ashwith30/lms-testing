import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BarChart2, BookOpen, AlertTriangle, Eye, Clock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { resultService, StudentResult } from '../../services/resultService';
import { useAuth } from '../../context/AuthContext';

export const StudentResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (user?.id) {
        try {
          const data = await resultService.getStudentResults(user.id);
          setResults(data);
        } catch (error) {
          console.error("Failed to load results", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchResults();
  }, [user]);

  const averageScore = results.length > 0
    ? results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / results.length
    : 0;

  const highScore = results.length > 0
    ? Math.max(...results.map(r => r.percentage || 0))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Results</h1>
        <p className="text-slate-500">Track and review your performance across all placement assessments.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading results...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Score</p>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                  <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">
                {averageScore.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Score</p>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">
                {highScore.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Tests</p>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">
                {results.length} <span className="text-xs font-normal text-slate-500">Tests</span>
              </p>
            </div>
          </div>

          <Card className="overflow-hidden border border-slate-200">
            <CardContent className="p-0">
              {results.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="overflow-x-auto hidden sm:block">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-4">Assessment</th>
                          <th className="px-6 py-4 text-center">Score</th>
                          <th className="px-6 py-4 text-center">Percentage</th>
                          <th className="px-6 py-4 text-center">Violations</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Completion Date</th>
                          <th className="px-6 py-4 text-right">Review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {results.map((result) => (
                          <tr key={result.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{result.test.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{result.test.description}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-slate-900">
                              {result.score} / {result.test.totalMarks}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                (result.percentage || 0) >= 70 ? 'bg-green-50 text-green-700 border border-green-200' :
                                (result.percentage || 0) >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {result.percentage?.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {result.violations > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <AlertTriangle className="h-3 w-3" />
                                  {result.violations}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center text-xs">
                              {result.status === 'auto_submitted' ? (
                                <span className="text-amber-600 font-medium">Auto Submitted</span>
                              ) : (
                                <span className="text-green-600 font-medium">Submitted</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString(undefined, {
                                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                }) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link to={`/student/results/${result.test.id}`}>
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

                  {/* Mobile Card View */}
                  <div className="sm:hidden divide-y divide-slate-100 bg-white">
                    {results.map((result) => (
                      <Link key={result.id} to={`/student/results/${result.test.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{result.test.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}
                            </p>
                          </div>
                          <span className={`shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            (result.percentage || 0) >= 70 ? 'bg-green-50 text-green-700' :
                            (result.percentage || 0) >= 40 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {result.percentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span className="font-medium">{result.score} / {result.test.totalMarks} pts</span>
                          <div className="flex items-center gap-2">
                            {result.violations > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                {result.violations}
                              </span>
                            )}
                            <span className={result.status === 'auto_submitted' ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                              {result.status === 'auto_submitted' ? 'Auto' : 'Done'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <BarChart2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">No results found</p>
                  <p className="text-sm mt-0.5">Complete an assessment to see your scores here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
