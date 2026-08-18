import React, { useEffect, useState } from 'react';
import {
  BookMarked, Plus, Lock, Unlock, Trash2, FileText,
  Video, Link2, StickyNote, ExternalLink, X, Upload
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { materialService } from '../../services/materialService';
import { useAuth } from '../../context/AuthContext';
import { Material } from '../../types';

const TYPE_META: Record<Material['type'], { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pdf:   { icon: FileText, color: 'text-red-600',    bg: 'bg-red-50',    label: 'PDF / Document' },
  video: { icon: Video,    color: 'text-purple-600', bg: 'bg-purple-50', label: 'Video' },
  link:  { icon: Link2,    color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Link' },
  note:  { icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Note / Text' },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'link' as Material['type'],
  url: '',
  content: '',
  assignedBatch: '',
};

export const TrainerMaterials = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMaterials = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await materialService.getTrainerMaterials(user.id);
      setMaterials(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await materialService.createMaterial({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        url: form.type !== 'note' ? form.url || undefined : undefined,
        content: form.type === 'note' ? form.content || undefined : undefined,
        uploadedBy: user.id,
        assignedBatch: form.assignedBatch || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchMaterials();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (mat: Material) => {
    setToggling(mat.id);
    try {
      const updated = await materialService.toggleRelease(mat.id, !mat.isReleased);
      setMaterials(prev => prev.map(m => m.id === mat.id ? updated : m));
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await materialService.deleteMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const released = materials.filter(m => m.isReleased);
  const locked = materials.filter(m => !m.isReleased);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Training Materials</h1>
          <p className="text-slate-500 mt-1">Upload resources and control when students can access them.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Materials', value: materials.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Released',        value: released.length,  color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Locked',          value: locked.length,    color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.bg} ${s.color}`}>
                <BookMarked className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Add New Material</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Chapter 1 – Data Structures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(TYPE_META) as Material['type'][]).map(t => {
                    const meta = TYPE_META[t];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all ${
                          form.type === t
                            ? `${meta.bg} ${meta.color} border-current`
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {meta.label.split('/')[0].trim()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.type !== 'note' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {form.type === 'pdf' ? 'Document URL (Google Drive / Dropbox link)' :
                     form.type === 'video' ? 'Video URL (YouTube / Google Drive)' :
                     'Link URL'}
                  </label>
                  <input
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Note Content</label>
                  <textarea
                    rows={5}
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Write your note here..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Brief description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Batch (optional)</label>
                <input
                  value={form.assignedBatch}
                  onChange={e => setForm(f => ({ ...f, assignedBatch: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 2026  (leave blank for all batches)"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  <Upload className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Material'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Materials List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin inline-block h-8 w-8 border-4 border-slate-200 border-t-blue-500 rounded-full mb-3" />
          <p className="text-sm font-medium">Loading materials...</p>
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center flex flex-col items-center">
            <BookMarked className="h-14 w-14 text-slate-200 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No materials yet</h3>
            <p className="text-slate-500 mb-5 max-w-sm">Upload your first training resource. It will be locked until you release it.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map(mat => {
            const meta = TYPE_META[mat.type];
            const Icon = meta.icon;
            return (
              <Card key={mat.id} className={`transition-all hover:shadow-sm ${mat.isReleased ? 'border-green-200' : 'border-slate-200'}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${meta.bg} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm truncate">{mat.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        mat.isReleased
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {mat.isReleased ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {mat.isReleased ? 'Released' : 'Locked'}
                      </span>
                      {mat.assignedBatch && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          Batch {mat.assignedBatch}
                        </span>
                      )}
                    </div>
                    {mat.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{mat.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {meta.label} · Added {new Date(mat.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {mat.releasedAt && ` · Released ${new Date(mat.releasedAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mat.url && mat.type !== 'note' && (
                      <a href={mat.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </Button>
                      </a>
                    )}

                    {/* Release Toggle */}
                    <button
                      onClick={() => handleToggle(mat)}
                      disabled={toggling === mat.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        mat.isReleased ? 'bg-green-500' : 'bg-slate-300'
                      } ${toggling === mat.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={mat.isReleased ? 'Click to lock' : 'Click to release to students'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        mat.isReleased ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mat.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
