import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileDown, AlertCircle, Check, X } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { parseExcelQuestions, downloadTemplate, ParseResult } from '../../utils/excelParser';
import { questionService } from '../../services/questionService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const QuestionBankUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  
  const [bankName, setBankName] = useState('');
  const [bankDescription, setBankDescription] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      toast('Please upload a valid .xlsx file', 'error');
      return;
    }
    
    setFile(selectedFile);
    setIsParsing(true);
    
    try {
      const result = await parseExcelQuestions(selectedFile);
      setParseResult(result);
    } catch (error) {
      toast('Failed to parse file', 'error');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.validQuestions.length === 0) return;
    if (!bankName.trim()) {
      toast('Please enter a Question Bank name', 'error');
      return;
    }

    setIsImporting(true);
    try {
      await questionService.importQuestionBank(
        bankName,
        bankDescription,
        parseResult.validQuestions,
        user?.id || 'unknown'
      );
      toast('Question bank imported successfully.', 'success');
      navigate('/trainer/question-bank');
    } catch (error) {
      toast('Failed to import question bank', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParseResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Upload Question Bank</h1>
          <p className="text-slate-500">Import questions in bulk using an Excel file.</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <FileDown className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {!file && (
        <Card>
          <CardContent className="p-0">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Upload Excel</h3>
              <p className="text-sm text-slate-500 mb-4">
                Drag & drop your .xlsx file or click to browse
              </p>
              
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="inline-flex items-center justify-center h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Browse Files
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              
              <p className="text-xs text-slate-500 mt-4">Supported format: .xlsx</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isParsing && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Parsing Excel file...</p>
          </CardContent>
        </Card>
      )}

      {parseResult && !isParsing && (
        <div className="space-y-6 animate-in">
          {parseResult.errors.length > 0 ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">
                      {parseResult.validQuestions.length} questions valid. {parseResult.errors.length} questions require attention.
                    </h3>
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2">
                      {parseResult.errors.map((err, i) => (
                        <p key={i} className="text-sm text-red-800 bg-red-100/50 px-3 py-2 rounded">
                          <strong>Row {err.row}:</strong> {err.error}
                        </p>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button variant="danger" onClick={resetUpload}>Cancel Upload</Button>
                      <Button variant="outline" className="bg-white" onClick={() => {/* Handle partial import logic if needed, or just force fix */}}>
                        Import {parseResult.validQuestions.length} Valid Questions Only
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900">Validation Successful</h3>
                    <p className="text-sm text-green-800">{parseResult.validQuestions.length} questions ready to import.</p>
                  </div>
                </div>
                <Button variant="outline" onClick={resetUpload} className="bg-white hover:bg-slate-50">
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {parseResult.validQuestions.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Question Bank Name" 
                    placeholder="e.g. Aptitude - Round 1" 
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                  <Input 
                    label="Description (Optional)" 
                    placeholder="Brief description of these questions"
                    value={bankDescription}
                    onChange={e => setBankDescription(e.target.value)}
                  />
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 shadow-sm">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Question</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Diff.</th>
                          <th className="px-4 py-3">Ans</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parseResult.validQuestions.map((q, i) => (
                          <tr key={i} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{i + 1}</td>
                            <td className="px-4 py-3 max-w-xs truncate" title={q.question}>{q.question}</td>
                            <td className="px-4 py-3">
                              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">{q.category}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={
                                q.difficulty === 'Easy' ? 'text-green-600' :
                                q.difficulty === 'Medium' ? 'text-amber-600' : 'text-red-600'
                              }>{q.difficulty}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-blue-600">{q.correctAnswer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleImport} isLoading={isImporting}>
                    Import {parseResult.validQuestions.length} Questions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
