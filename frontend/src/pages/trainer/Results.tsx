import React, { useEffect, useState } from 'react';
import { Download, Search, TrendingUp, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { resultService, StudentResult } from '../../services/resultService';
import { ProctoringAuditModal } from '../../components/common/ProctoringAuditModal';

export const Results = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditResult, setSelectedAuditResult] = useState<StudentResult | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await resultService.getTrainerResults();
        setResults(data);
      } catch (error) {
        console.error("Failed to load results", error);
      }
    };
    fetchResults();
  }, []);

  const filteredResults = results.filter(r => 
    r.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.student.studentId && r.student.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const averageScore = results.length > 0 
    ? results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / results.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Results & Proctoring Audits</h1>
          <p className="text-slate-500 text-sm">View assessment performance and inspect AI proctoring evidence.</p>
        </div>
        <Button variant="outline" className="w-fit">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Average Score</p>
            <div className="flex items-end gap-2 mt-2">
              <h3 className="text-3xl font-bold text-slate-900">{averageScore.toFixed(1)}%</h3>
              <TrendingUp className="h-5 w-5 text-green-500 mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Total Submissions</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{results.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Flagged Submissions</p>
            <h3 className="text-3xl font-bold text-rose-600 mt-2">
              {results.filter(r => r.violations > 0).length}
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle>Detailed Submissions</CardTitle>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student or test..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Student</th>
                  <th className="px-6 py-4 whitespace-nowrap">Test</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Score</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Proctoring Audit</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((result) => {
                  const trustScore = result.proctoringSummary?.trustScore ?? Math.max(0, 100 - result.violations * 20);

                  return (
                    <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{result.student.name}</p>
                        <p className="text-xs text-slate-500">{result.student.studentId} • {result.student.department}</p>
                      </td>
                      <td className="px-6 py-4 font-medium">{result.test.title}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full font-medium ${
                          (result.percentage || 0) >= 70 ? 'bg-green-100 text-green-700' :
                          (result.percentage || 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.percentage?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAuditResult(result)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer whitespace-nowrap transition-all hover:scale-105 ${
                            trustScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            trustScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {trustScore >= 80 ? (
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="whitespace-nowrap">{trustScore}% Trust ({result.violations} viol.)</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center text-xs whitespace-nowrap">
                        {result.status === 'auto_submitted' ? (
                          <span className="text-amber-600 font-medium">Auto Submitted</span>
                        ) : (
                          <span className="text-green-600 font-medium">Submitted</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAuditResult(result)}
                        >
                          View Audit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredResults.map((result) => {
              const trustScore = result.proctoringSummary?.trustScore ?? Math.max(0, 100 - result.violations * 20);

              return (
                <div key={result.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{result.student.name}</p>
                      <p className="text-xs text-slate-400">{result.student.studentId} • {result.student.department}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                      (result.percentage || 0) >= 70 ? 'bg-green-100 text-green-700' :
                      (result.percentage || 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {result.percentage?.toFixed(1)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">{result.test.title}</p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedAuditResult(result)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        trustScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        trustScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {trustScore >= 80 ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                      <span>{trustScore}% Trust</span>
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2.5"
                      onClick={() => setSelectedAuditResult(result)}
                    >
                      View Audit
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredResults.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No results found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Proctoring Audit Inspection Modal */}
      {selectedAuditResult && (
        <ProctoringAuditModal
          isOpen={true}
          onClose={() => setSelectedAuditResult(null)}
          student={selectedAuditResult.student}
          test={selectedAuditResult.test}
          violations={selectedAuditResult.violations}
          violationLogs={selectedAuditResult.violationLogs}
          proctoringSummary={selectedAuditResult.proctoringSummary}
          score={selectedAuditResult.score}
          percentage={selectedAuditResult.percentage}
        />
      )}
    </div>
  );
};
