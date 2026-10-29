import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Briefcase } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const HistoryModal = ({ isOpen, onClose, onSave, editingHistory = null }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    companyName: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    startingSalary: '',
    finalSalary: '',
    currency: settings.currency || 'INR',
    reasonForLeaving: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingHistory) {
      setFormData({
        companyName: editingHistory.companyName || '',
        jobTitle: editingHistory.jobTitle || '',
        startDate: editingHistory.startDate
          ? new Date(editingHistory.startDate).toISOString().split('T')[0]
          : '',
        endDate: editingHistory.endDate
          ? new Date(editingHistory.endDate).toISOString().split('T')[0]
          : '',
        isCurrent: !!editingHistory.isCurrent,
        startingSalary: editingHistory.startingSalary || '',
        finalSalary: editingHistory.finalSalary || '',
        currency: editingHistory.currency || settings.currency || 'INR',
        reasonForLeaving: editingHistory.reasonForLeaving || '',
        notes: editingHistory.notes || '',
      });
    } else {
      setFormData({
        companyName: '',
        jobTitle: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        startingSalary: '',
        finalSalary: '',
        currency: settings.currency || 'INR',
        reasonForLeaving: '',
        notes: '',
      });
    }
  }, [editingHistory, isOpen, settings.currency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        ...formData,
        startingSalary: Number(formData.startingSalary) || 0,
        finalSalary: Number(formData.finalSalary) || 0,
      });
      onClose();
    } catch (error) {
      alert(error.message || 'Failed to save employment record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingHistory ? 'Edit Employment Record' : 'Add Employment History'}
      subtitle="Track your chronological career positions and employment durations"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Google or Microsoft"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Job Title / Designation *
            </label>
            <input
              type="text"
              required
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              End Date {!formData.isCurrent && '*'}
            </label>
            <input
              type="date"
              disabled={formData.isCurrent}
              required={!formData.isCurrent}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isCurrentJob"
            checked={formData.isCurrent}
            onChange={(e) =>
              setFormData({
                ...formData,
                isCurrent: e.target.checked,
                endDate: e.target.checked ? '' : formData.endDate,
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <label htmlFor="isCurrentJob" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            This is my current ongoing employment
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Starting Monthly Salary ({settings.currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.startingSalary}
              onChange={(e) => setFormData({ ...formData, startingSalary: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Final Monthly Salary ({settings.currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.finalSalary}
              onChange={(e) => setFormData({ ...formData, finalSalary: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Reason for Leaving (Optional)
          </label>
          <input
            type="text"
            value={formData.reasonForLeaving}
            onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
            placeholder="e.g. Better growth opportunity and platform engineering role"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Notes / Achievements
          </label>
          <textarea
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Key responsibilities, stack used, notable projects"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingHistory ? 'Update Record' : 'Add History Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default HistoryModal;
