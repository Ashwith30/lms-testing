import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BarChart2, BookOpen, Clock, AlertTriangle, Eye } from 'lucide-react';
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Average Percentage</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{averageScore.toFixed(1)}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Highest Score</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{highScore.toFixed(1)}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Completed Assessments</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{results.length} Tests</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border border-slate-200">
            <CardContent className="p-0">
              {results.length > 0 ? (
                <div className="overflow-x-auto">
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
                            {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : 'N/A'}
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
