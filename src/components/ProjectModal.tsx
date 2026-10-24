import React, { useState } from 'react';
import { ProjectTask } from '../types';
import { DIVISIONS } from '../config/constants';
import { getToday, addDays, toIsoDate } from '../utils/dateUtils';
import { X, AlertCircle, Save } from 'lucide-react';

interface ProjectModalProps {
  project: ProjectTask | null; // null if creating new
  initialDivision?: string;
  onClose: () => void;
  onSave: (project: ProjectTask) => Promise<void>;
  onDelete?: (projectId: string) => Promise<void>;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  initialDivision,
  onClose,
  onSave,
  onDelete,
}) => {
  const isNew = !project;
  const defaultStart = toIsoDate(getToday());
  const defaultEnd = toIsoDate(addDays(getToday(), 30));

  const [title, setTitle] = useState(project?.title || '');
  const [division, setDivision] = useState(
    project?.division || initialDivision || DIVISIONS[0]
  );
  const [fromDate, setFromDate] = useState(project?.from || defaultStart);
  const [toDate, setToDate] = useState(project?.to || defaultEnd);
  const [managerRemark, setManagerRemark] = useState(project?.manager_remark || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a project name');
      return;
    }
    if (!fromDate || !toDate || fromDate > toDate) {
      setError('Check start and end dates');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const targetId = project?.id || `P${Date.now().toString(36)}`;
      const itemToSave: ProjectTask = {
        id: targetId,
        parent: '',
        division,
        title: title.trim(),
        from: fromDate,
        to: toDate,
        status: project?.status || 'Not Started',
        requested_status: '',
        assignee: '',
        manager_remark: managerRemark.trim(),
        exec_reply: project?.exec_reply || '',
        updated: new Date().toISOString(),
      };

      await onSave(itemToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isNew ? 'Create Divisional Project' : 'Edit Project Details'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set milestones, divisional ownership, and strategic guidelines
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Data Infrastructure Upgrade"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] focus:border-[#0e5773] outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Responsible Division
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none"
            >
              {DIVISIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                To Date (Target Completion)
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Manager Project Brief & Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={managerRemark}
              onChange={(e) => setManagerRemark(e.target.value)}
              placeholder="Strategic goals, compliance requirements, or expectations..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div>
              {!isNew && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this project and its tasks?')) {
                      onDelete(project.id);
                      onClose();
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  Delete Project
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : isNew ? 'Create Project' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
