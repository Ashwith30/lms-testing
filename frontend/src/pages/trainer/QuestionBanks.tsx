import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Database, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { questionService } from '../../services/questionService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QuestionBank } from '../../types';

export const QuestionBanks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchBanks = async () => {
    try {
      const data = await questionService.getQuestionBanks(user?.role === 'trainer' ? user?.id : undefined);
      setBanks(data);
    } catch (error) {
      console.error("Failed to load question banks", error);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, [user]);

  const handleDelete = async (bankId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the question bank "${name}" and all its questions?`)) {
      setIsDeleting(bankId);
      try {
        await questionService.deleteQuestionBank(bankId);
        toast('Question bank deleted successfully', 'success');
        fetchBanks();
      } catch (e: any) {
        toast('Failed to delete question bank', 'error');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const basePath = user?.role === 'institution' ? '/institution' : user?.role === 'admin' ? '/admin' : '/trainer';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Question Banks</h1>
          <p className="text-slate-500">Manage your imported question collections.</p>
        </div>
        <Link to={`${basePath}/question-bank/upload`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload New Bank
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank) => (
          <Card key={bank.id} className="hover:shadow-md transition-shadow group flex flex-col justify-between">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Database className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                    {bank.questionCount} Questions
                  </span>
                  <button
                    onClick={() => handleDelete(bank.id, bank.name)}
                    disabled={isDeleting === bank.id}
                    title="Delete Question Bank"
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-lg text-slate-900 mb-1 line-clamp-1">{bank.name}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 min-h-[40px] mb-4">
                {bank.description || 'No description provided.'}
              </p>
              
              <div className="flex items-center text-xs text-slate-400 mt-auto pt-4 border-t border-slate-100">
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                {new Date(bank.createdAt).toLocaleDateString(undefined, { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {banks.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            <Database className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="font-medium text-slate-900">No question banks uploaded yet.</p>
            <p className="text-sm text-slate-400 mt-1">Upload questions via Excel/CSV or manual entry.</p>
          </div>
        )}
      </div>
    </div>
  );
};
