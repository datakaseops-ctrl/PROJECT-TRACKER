import React, { useState, useEffect } from 'react';
import { ProjectTask, User, TaskStatus, TaskAttachment } from '../types';
import { TASK_STATUSES, DEFAULT_USERS } from '../config/constants';
import { getToday, toIsoDate } from '../utils/dateUtils';
import { 
  getStoredAttachments, 
  persistAttachment 
} from '../services/attachmentService';
import { FileUploadSection } from './FileUploadSection';
import { 
  X, 
  User as UserIcon, 
  Clock, 
  AlertCircle, 
  Trash2,
  Send
} from 'lucide-react';

interface TaskModalProps {
  task: ProjectTask | null; // null if creating new task
  project: ProjectTask;
  currentUser: User;
  onClose: () => void;
  onSave: (task: ProjectTask) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  project,
  currentUser,
  onClose,
  onSave,
  onDelete,
}) => {
  const isManager = currentUser.role === 'manager';
  const isNew = !task;

  // Available executives for this project's division
  const eligibleExecutives = DEFAULT_USERS.filter(
    u => u.role === 'executive' && (u.divisions || []).includes(project.division)
  );

  const [title, setTitle] = useState(task?.title || '');
  const [assignee, setAssignee] = useState(
    task?.assignee || (eligibleExecutives[0]?.name || '')
  );
  const [fromDate, setFromDate] = useState(task?.from || project.from || toIsoDate(getToday()));
  const [toDate, setToDate] = useState(task?.to || project.to || toIsoDate(getToday()));
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'Not Started');
  const [requestedStatus, setRequestedStatus] = useState<TaskStatus | ''>(
    task?.requested_status || ''
  );
  const [newRemark, setNewRemark] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task?.attachments || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load any stored attachments from IndexedDB / storage
  useEffect(() => {
    if (task?.id) {
      getStoredAttachments(task.id).then(stored => {
        if (stored.length > 0) {
          setAttachments(prev => {
            const map = new Map<string, TaskAttachment>();
            prev.forEach(a => map.set(a.id, a));
            stored.forEach(a => map.set(a.id, a));
            return Array.from(map.values());
          });
        }
      });
    }
  }, [task?.id]);

  const isAssignedToMe = task?.assignee === currentUser.name;
  const canEditOrUpdate = isManager || isAssignedToMe;
  const hasPendingApproval = requestedStatus && requestedStatus !== status;

  // Handle Approve by Manager
  const handleApproveStatusChange = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-GB');
      const approvalNote = `${todayStr} Manager: Approved status change to ${requestedStatus}.${newRemark ? ` ${newRemark}` : ''}`;
      const updatedRemarks = task.manager_remark
        ? `${task.manager_remark}\n${approvalNote}`
        : approvalNote;

      const updatedTask: ProjectTask = {
        ...task,
        title,
        assignee,
        from: fromDate,
        to: toDate,
        status: requestedStatus as TaskStatus,
        requested_status: '',
        manager_remark: updatedRemarks,
        attachments,
      };

      for (const att of attachments) {
        await persistAttachment(updatedTask.id, att);
      }

      await onSave(updatedTask);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject by Manager
  const handleRejectStatusChange = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-GB');
      const rejectionNote = `${todayStr} Manager: Rejected status change to ${requestedStatus}.${newRemark ? ` ${newRemark}` : ''}`;
      const updatedRemarks = task.manager_remark
        ? `${task.manager_remark}\n${rejectionNote}`
        : rejectionNote;

      const updatedTask: ProjectTask = {
        ...task,
        title,
        assignee,
        from: fromDate,
        to: toDate,
        requested_status: '',
        manager_remark: updatedRemarks,
        attachments,
      };

      for (const att of attachments) {
        await persistAttachment(updatedTask.id, att);
      }

      await onSave(updatedTask);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Regular Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title');
      return;
    }
    if (fromDate > toDate) {
      setError('Start date cannot be after completion date');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const todayStr = new Date().toLocaleDateString('en-GB');
      const targetId = task?.id || `T${Date.now().toString(36)}`;

      let updatedMgrRemark = task?.manager_remark || '';
      let updatedExecReply = task?.exec_reply || '';

      if (newRemark.trim()) {
        const entry = `${todayStr} ${currentUser.name}: ${newRemark.trim()}`;
        if (isManager) {
          updatedMgrRemark = updatedMgrRemark ? `${updatedMgrRemark}\n${entry}` : entry;
        } else {
          updatedExecReply = updatedExecReply ? `${updatedExecReply}\n${entry}` : entry;
        }
      }

      let targetStatus = status;
      let targetReqStatus = requestedStatus;

      // Executive submitting status request
      if (!isManager && requestedStatus && requestedStatus !== task?.status) {
        targetReqStatus = requestedStatus;
        const reqNote = `${todayStr} ${currentUser.name}: Requested status change to ${requestedStatus}`;
        updatedExecReply = updatedExecReply ? `${updatedExecReply}\n${reqNote}` : reqNote;
      }

      const itemToSave: ProjectTask = {
        id: targetId,
        parent: project.id,
        division: project.division,
        title: title.trim(),
        from: fromDate,
        to: toDate,
        status: isManager ? targetStatus : (task?.status || 'Not Started'),
        requested_status: targetReqStatus,
        assignee,
        manager_remark: updatedMgrRemark,
        exec_reply: updatedExecReply,
        updated: new Date().toISOString(),
        attachments,
      };

      for (const att of attachments) {
        await persistAttachment(itemToSave.id, att);
      }

      await onSave(itemToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-xs font-semibold text-[#0e5773] uppercase tracking-wider">
              {project.title} &middot; {project.division}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {isNew ? 'Create New Task' : 'Task Details & Approval'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pending Approval Alert */}
          {hasPendingApproval && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Status Change Approval Pending</span>
              </div>
              <p className="text-xs text-amber-800">
                Requested status transition from <span className="font-semibold">{task?.status}</span> to{' '}
                <span className="font-semibold text-emerald-800">{requestedStatus}</span>.
                {!isManager && ' Waiting for the Manager to review and approve.'}
              </p>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Title
            </label>
            {isManager ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Conduct compliance audit"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] focus:border-[#0e5773] outline-none"
              />
            ) : (
              <div className="text-sm font-semibold text-slate-900 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                {title}
              </div>
            )}
          </div>

          {/* Assignee & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Executive
              </label>
              {isManager ? (
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none"
                >
                  <option value="">Unassigned</option>
                  {eligibleExecutives.map(u => (
                    <option key={u.name} value={u.name}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-slate-700 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>{assignee || 'Unassigned'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isManager ? 'Status' : 'Request Status Change'}
              </label>
              {isManager ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none"
                >
                  {TASK_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={requestedStatus || status}
                  disabled={!isAssignedToMe}
                  onChange={(e) => setRequestedStatus(e.target.value as TaskStatus)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {TASK_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              {!isManager && isAssignedToMe && (
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Selecting a new status sends an approval request to the Manager.
                </span>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                From Date
              </label>
              {isManager ? (
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none font-mono"
                />
              ) : (
                <div className="text-sm text-slate-700 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono">
                  {fromDate || '—'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                To Date (Deadline)
              </label>
              {isManager ? (
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none font-mono"
                />
              ) : (
                <div className="text-sm text-slate-700 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono">
                  {toDate || '—'}
                </div>
              )}
            </div>
          </div>

          {/* File Attachments Section */}
          <div className="pt-2 border-t border-slate-100">
            <FileUploadSection
              attachments={attachments}
              onChange={setAttachments}
              currentUser={currentUser}
              readOnly={!canEditOrUpdate}
            />
          </div>

          {/* Remarks Thread */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {task?.manager_remark && (
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Manager Instructions &amp; Remarks Log
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {task.manager_remark}
                </div>
              </div>
            )}

            {task?.exec_reply && (
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Executive Progress Updates &amp; Logs
                </span>
                <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-lg text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {task.exec_reply}
                </div>
              </div>
            )}

            {/* Append Remark Input */}
            {canEditOrUpdate && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isManager ? 'Add Manager Note' : 'Add Executive Update / Remark'}
                </label>
                <textarea
                  rows={2}
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder={
                    isManager
                      ? 'Add directives or notes for the executive lead...'
                      : 'Provide progress milestone, blockers, or completion notes...'
                  }
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0e5773] outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              {isManager && !isNew && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      onDelete(task.id);
                      onClose();
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
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

              {/* Manager Approve / Reject Buttons */}
              {isManager && hasPendingApproval && (
                <>
                  <button
                    type="button"
                    onClick={handleRejectStatusChange}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reject Change
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveStatusChange}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Approve Change
                  </button>
                </>
              )}

              {canEditOrUpdate && (!isManager || !hasPendingApproval) && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : isManager ? 'Save Task' : 'Send Update'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
