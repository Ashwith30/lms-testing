import React, { useState } from 'react';
import { User, Mail, Shield, BookOpen, GraduationCap, Calendar, Edit3, KeyRound, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export const StudentProfile = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [batch, setBatch] = useState(user?.batch || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return <div className="text-center py-12 text-slate-500">Loading profile...</div>;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updates: any = {
        name: name.trim(),
        department: department.trim(),
        batch: batch.trim(),
      };
      if (newPassword.trim()) {
        updates.password = newPassword.trim();
        updates.currentPassword = currentPassword;
      }

      const res = await api.put(`/users/${user.id}`, updates);
      login(res.data);
      toast('Profile updated successfully!', 'success');
      setIsEditing(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      toast(e.response?.data?.detail || e.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const profileItems = [
    { label: 'Full Name', value: user.name, icon: User, desc: 'Your registered primary name' },
    { label: 'Email Address', value: user.email, icon: Mail, desc: 'Contact address for notifications' },
    { label: 'Student ID', value: user.studentId || 'N/A', icon: Shield, desc: 'Your unique identifier (LMS ID)' },
    { label: 'Department', value: user.department || 'N/A', icon: BookOpen, desc: 'Academic department branch' },
    { label: 'Graduation Batch', value: user.batch || 'N/A', icon: GraduationCap, desc: 'Year of course completion' },
    {
      label: 'Account Created',
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      }) : 'N/A',
      icon: Calendar,
      desc: 'Registration date in this system'
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Profile</h1>
          <p className="text-slate-500 text-sm">View and update your account information and academic details.</p>
        </div>
        <Button 
          variant={isEditing ? "secondary" : "outline"}
          onClick={() => {
            setIsEditing(!isEditing);
            setName(user.name);
            setDepartment(user.department || '');
            setBatch(user.batch || '');
            setCurrentPassword('');
            setNewPassword('');
          }}
        >
          <Edit3 className="mr-2 h-4 w-4" />
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </Button>
      </div>

      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="bg-white p-2 rounded-full shadow-lg border">
              <div className="bg-blue-100 text-blue-600 rounded-full h-16 w-16 flex items-center justify-center font-bold text-2xl uppercase">
                {user.name.substring(0, 2)}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-14 pb-6 sm:pb-8 px-4 sm:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm font-medium text-slate-400 capitalize flex items-center gap-1.5 mt-1">
              <Shield className="h-4 w-4 text-blue-500" />
              Role: {user.role} {user.studentId && `• ID: ${user.studentId}`}
            </p>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-6 pt-4 border-t border-slate-100 animate-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                <Input
                  label="Department"
                  value={department}
                  placeholder="e.g. CSE or IT"
                  onChange={e => setDepartment(e.target.value)}
                />
                <Input
                  label="Graduation Batch"
                  value={batch}
                  placeholder="e.g. 2026"
                  onChange={e => setBatch(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-600" />
                  Change Password (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100">
              {profileItems.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="p-3 bg-slate-100 text-slate-500 rounded-lg h-fit">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-base font-semibold text-slate-900">{item.value}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
