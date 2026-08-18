import React, { useEffect, useState } from 'react';
import {
  BookOpen, FileText, Video, Link2, StickyNote,
  ExternalLink, Lock, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { materialService } from '../../services/materialService';
import { useAuth } from '../../context/AuthContext';
import { Material } from '../../types';

const TYPE_META: Record<Material['type'], { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pdf:   { icon: FileText,   color: 'text-red-600',    bg: 'bg-red-50',    label: 'PDF / Document' },
  video: { icon: Video,      color: 'text-purple-600', bg: 'bg-purple-50', label: 'Video' },
  link:  { icon: Link2,      color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Link' },
  note:  { icon: StickyNote, color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Note' },
};

export const StudentMaterials = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const data = await materialService.getStudentMaterials(user.id);
        setMaterials(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMaterials();
  }, [user]);

  const byType = (type: Material['type']) => materials.filter(m => m.type === type);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Training Materials</h1>
        <p className="text-slate-500 mt-1">Resources released by your trainer.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin inline-block h-8 w-8 border-4 border-slate-200 border-t-blue-500 rounded-full mb-3" />
          <p className="text-sm font-medium">Loading materials...</p>
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center flex flex-col items-center">
            <Lock className="h-14 w-14 text-slate-200 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No materials available yet</h3>
            <p className="text-slate-500 max-w-sm">Your trainer hasn't released any materials yet. Check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <BookOpen className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span><span className="font-semibold text-green-700">{materials.length}</span> material{materials.length !== 1 ? 's' : ''} available</span>
          </div>

          {/* Sections by type */}
          {(Object.keys(TYPE_META) as Material['type'][]).map(type => {
            const items = byType(type);
            if (items.length === 0) return null;
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div key={type} className="space-y-3">
                <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  {meta.label}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map(mat => (
                    <Card key={mat.id} className="hover:shadow-md transition-all group border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl ${meta.bg} flex-shrink-0`}>
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm leading-snug">{mat.title}</h3>
                            {mat.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mat.description}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              Released {mat.releasedAt
                                ? new Date(mat.releasedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : '—'}
                            </p>
                          </div>
                        </div>

                        {mat.type === 'note' && mat.content ? (
                          <div className="mt-3">
                            <div className={`text-xs text-slate-700 bg-amber-50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap ${
                              expandedNote === mat.id ? '' : 'line-clamp-3'
                            }`}>
                              {mat.content}
                            </div>
                            <button
                              onClick={() => setExpandedNote(expandedNote === mat.id ? null : mat.id)}
                              className="mt-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                            >
                              {expandedNote === mat.id ? 'Show less' : 'Read more'}
                              <ChevronRight className={`h-3 w-3 transition-transform ${expandedNote === mat.id ? 'rotate-90' : ''}`} />
                            </button>
                          </div>
                        ) : mat.url ? (
                          <a href={mat.url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                            <Button variant="outline" size="sm" className="w-full text-xs group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              {mat.type === 'pdf' ? 'Open Document' : mat.type === 'video' ? 'Watch Video' : 'Open Link'}
                            </Button>
                          </a>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
