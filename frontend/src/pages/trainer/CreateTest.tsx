import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { questionService } from '../../services/questionService';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QuestionBank, Question, TestSettings } from '../../types';

export const CreateTest = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  
  const [settings, setSettings] = useState<TestSettings>({
    duration: 30,
    attemptsAllowed: 1,
    negativeMarking: false,
    randomizeQuestions: true,
    randomizeOptions: true,
    showResultImmediately: true,
    allowBackNavigation: true,
    fullscreenRequired: true,
    autoSubmit: true,
    enableCalculator: false,
    enablePalette: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [banksData, questionsData] = await Promise.all([
          questionService.getQuestionBanks(),
          questionService.getAllQuestions()
        ]);
        setBanks(banksData);
        setAllQuestions(questionsData);

        if (id) {
          const testData = await testService.getTestDetails(id);
          if (testData) {
            setTitle(testData.title);
            setDescription(testData.description || '');
            setSelectedQuestionIds(testData.questionIds || []);
            if (testData.settings) {
              setSettings(testData.settings);
            }

            // Identify which bank IDs the selected questions belong to
            const relevantBankIds = Array.from(new Set(
              questionsData
                .filter(q => testData.questionIds.includes(q.id))
                .map(q => q.questionBankId)
            ));
            setSelectedBankIds(relevantBankIds.length > 0 ? relevantBankIds : banksData.map(b => b.id));
          } else {
            toast('Test not found', 'error');
            const basePath = user?.role === 'institution' ? '/institution' : user?.role === 'admin' ? '/admin' : '/trainer';
            navigate(`${basePath}/tests`);
          }
        }
      } catch (error) {
        console.error("Failed to load test data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, navigate, toast, user]);

  const availableQuestions = allQuestions.filter(q => selectedBankIds.includes(q.questionBankId));

  const toggleBank = (bankId: string) => {
    setSelectedBankIds(prev => 
      prev.includes(bankId) ? prev.filter(b => b !== bankId) : [...prev, bankId]
    );
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId) ? prev.filter(q => q !== questionId) : [...prev, questionId]
    );
  };

  const selectAllAvailable = () => {
    setSelectedQuestionIds(availableQuestions.map(q => q.id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast('Test title is required', 'error');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      toast('Please select at least one question', 'error');
      return;
    }

    const testQuestions = allQuestions.filter(q => selectedQuestionIds.includes(q.id));
    const totalMarks = testQuestions.reduce((sum, q) => sum + q.marks, 0);

    setIsSaving(true);
    try {
      const basePath = user?.role === 'institution' ? '/institution' : user?.role === 'admin' ? '/admin' : '/trainer';

      if (isEditMode && id) {
        await testService.updateTest(id, {
          title,
          description,
          questionIds: selectedQuestionIds,
          totalMarks,
          settings,
        });
        toast('Assessment updated successfully!', 'success');
        navigate(`${basePath}/tests`);
      } else {
        await testService.createTest({
          title,
          description,
          questionIds: selectedQuestionIds,
          totalMarks,
          settings,
          createdBy: user?.id || 'unknown',
          status: 'Draft',
        });
        toast('Test created successfully! Please schedule it to make it visible to students.', 'success');
        navigate(`${basePath}/tests/schedule`);
      }
    } catch (e) {
      toast(isEditMode ? 'Failed to update test' : 'Failed to create test', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500 font-medium">Loading assessment details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEditMode ? 'Edit Assessment' : 'Create New Assessment'}
        </h1>
        <p className="text-slate-500">
          {isEditMode ? 'Update assessment parameters, selected questions, and proctoring settings.' : 'Configure assessment details and select questions.'}
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-2 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <p className={`mt-2 text-xs font-medium ${step >= s ? 'text-blue-600' : 'text-slate-500'}`}>
              {s === 1 ? 'Details' : s === 2 ? 'Questions' : 'Settings'}
            </p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="animate-in">
          <CardContent className="p-6 space-y-4">
            <Input 
              label="Test Name" 
              placeholder="e.g. Campus Placement Assessment" 
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Details about this assessment..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 pt-4">
              <label className="block text-sm font-medium text-slate-700">Select Question Banks to draw from</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {banks.map(bank => (
                  <label key={bank.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${selectedBankIds.includes(bank.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 text-blue-600 rounded border-slate-300"
                      checked={selectedBankIds.includes(bank.id)}
                      onChange={() => toggleBank(bank.id)}
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">{bank.name}</p>
                      <p className="text-xs text-slate-500">{bank.questionCount} Questions</p>
                    </div>
                  </label>
                ))}
                {banks.length === 0 && (
                  <p className="text-sm text-slate-500 italic col-span-2">No question banks available. Please upload one first.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => {
                if (!title) toast('Please enter a test name', 'error');
                else if (selectedBankIds.length === 0) toast('Please select at least one question bank', 'error');
                else setStep(2);
              }}>Next Step</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="font-semibold text-lg">Select Questions</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {selectedQuestionIds.length} Selected
                </span>
                <Button variant="outline" size="sm" onClick={selectAllAvailable}>Select All</Button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {availableQuestions.map((q, i) => (
                <label key={q.id} className="flex items-start p-3 border border-slate-100 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300"
                    checked={selectedQuestionIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">Q{i+1}: {q.question}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{q.category}</span>
                      <span className="text-xs text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{q.difficulty}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => {
                if (selectedQuestionIds.length === 0) toast('Please select at least one question', 'error');
                else setStep(3);
              }}>Next Step</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-in">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-semibold text-lg pb-2 border-b">Test & Proctoring Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Duration (Minutes)" 
                type="number"
                min={5}
                value={settings.duration}
                onChange={e => setSettings({...settings, duration: Number(e.target.value)})}
              />
              
              <div className="space-y-4 pt-1">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                    checked={settings.randomizeQuestions}
                    onChange={e => setSettings({...settings, randomizeQuestions: e.target.checked})} />
                  <span className="text-sm text-slate-700">Randomize Questions</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                    checked={settings.randomizeOptions}
                    onChange={e => setSettings({...settings, randomizeOptions: e.target.checked})} />
                  <span className="text-sm text-slate-700">Randomize Options</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                    checked={settings.fullscreenRequired}
                    onChange={e => setSettings({...settings, fullscreenRequired: e.target.checked})} />
                  <span className="text-sm text-slate-700 font-medium">Require Fullscreen Mode (Anti-cheat)</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                    checked={settings.negativeMarking}
                    onChange={e => setSettings({...settings, negativeMarking: e.target.checked})} />
                  <span className="text-sm text-slate-700">Enable Negative Marking</span>
                </label>

                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                    checked={settings.showResultImmediately}
                    onChange={e => setSettings({...settings, showResultImmediately: e.target.checked})} />
                  <span className="text-sm text-slate-700">Show Results Immediately after Submit</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSave} isLoading={isSaving} className="bg-blue-600 hover:bg-blue-700 font-bold px-8">
                {isEditMode ? 'Update Assessment' : 'Create Test'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
