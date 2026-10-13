import React, { useState, useEffect } from 'react';
import { 
  fetchIssues, 
  updateIssue, 
  getImageUrl, 
  ISSUE_CATEGORIES, 
  PRIORITIES, 
  STATUSES 
} from '../api/client';
import { StatusBadge, PriorityBadge, CategoryIcon } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  X, 
  FileQuestion,
  ChevronDown,
  Edit3,
  ExternalLink
} from 'lucide-react';

export default function IssueTracking({ initialIssueId, onStatusUpdated }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & search
  const [search, setSearch] = useState(initialIssueId || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Selected issue for detail modal
  const [detailIssue, setDetailIssue] = useState(null);

  // Status update modal state
  const [updateModalIssue, setUpdateModalIssue] = useState(null);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [updateNote, setUpdateNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchIssues({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        search,
        sortBy
      });
      setIssues(data);

      // If initialIssueId was provided, automatically open detail for that issue
      if (initialIssueId && data.length > 0) {
        const found = data.find(i => i.id.toUpperCase() === initialIssueId.toUpperCase());
        if (found) setDetailIssue(found);
      }
    } catch (err) {
      setError(err.message || "Failed to load issues from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [statusFilter, categoryFilter, priorityFilter, sortBy]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadIssues();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleOpenStatusModal = (issue, e) => {
    if (e) e.stopPropagation();
    setUpdateModalIssue(issue);
    setNewStatus(issue.status);
    setUpdateNote('');
    setUpdateError(null);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!updateModalIssue) return;

    try {
      setIsUpdating(true);
      setUpdateError(null);
      const updated = await updateIssue(updateModalIssue.id, {
        status: newStatus,
        note: updateNote.trim() || undefined
      });

      // Update in local state
      setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
      if (detailIssue && detailIssue.id === updated.id) {
        setDetailIssue(updated);
      }

      setUpdateModalIssue(null);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      setUpdateError(err.message || "Failed to update issue status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setPriorityFilter('All');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by issue ID (ISS-1001), title, or location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Refresh & Sort Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortBy === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
            <button
              onClick={loadIssues}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Status:</span>
            {['All', ...STATUSES].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category & Priority Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Categories</option>
              {ISSUE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map(pr => (
                <option key={pr} value={pr}>{pr} Priority</option>
              ))}
            </select>

            {(statusFilter !== 'All' || categoryFilter !== 'All' || priorityFilter !== 'All' || search) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && issues.length === 0 && (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Retrieving issue records from SQLite database...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center">
          <p className="text-sm font-medium mb-3">{error}</p>
          <button
            onClick={loadIssues}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && issues.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <FileQuestion className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No matching issues found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords, priority, or category filters to find records.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Issues Cards List */}
      <div className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => setDetailIssue(issue)}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            {/* Left Info */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {issue.image_path ? (
                <div 
                  className="relative group shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage(getImageUrl(issue.image_path));
                  }}
                >
                  <img
                    src={getImageUrl(issue.image_path)}
                    alt="Issue photo"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 text-slate-400">
                  <CategoryIcon category={issue.category} className="w-6 h-6 text-slate-500 mb-1" />
                  <span className="text-[10px] font-bold">No Photo</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200/60">
                    {issue.id}
                  </span>
                  <PriorityBadge priority={issue.priority} />
                  <span className="text-xs text-slate-500 font-medium hidden md:inline">•</span>
                  <span className="text-xs text-slate-500 font-medium truncate hidden md:inline">
                    {issue.category}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {issue.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-1 mt-1">
                  {issue.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{issue.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{issue.created_at ? issue.created_at.substring(0, 10) : ''}</span>
                  </span>
                  {issue.ai_confidence_score && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-brand-600 font-semibold bg-brand-50 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-3 h-3" />
                      AI Score: {issue.ai_confidence_score.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
              <StatusBadge status={issue.status} />
              <button
                type="button"
                onClick={(e) => handleOpenStatusModal(issue, e)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Update Status</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Issue Modal */}
      {detailIssue && (
        <Modal
          isOpen={!!detailIssue}
          onClose={() => setDetailIssue(null)}
          title={`Issue Record Details — ${detailIssue.id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                  {detailIssue.id}
                </span>
                <StatusBadge status={detailIssue.status} />
                <PriorityBadge priority={detailIssue.priority} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">{detailIssue.title}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{detailIssue.location}</span>
                <span>•</span>
                <span>Reported {detailIssue.created_at ? detailIssue.created_at.replace('T', ' ').substring(0, 16) : ''} UTC</span>
              </div>
            </div>

            {/* Photo preview if available */}
            {detailIssue.image_path && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 relative">
                <img
                  src={getImageUrl(detailIssue.image_path)}
                  alt="Issue Full Evidence"
                  className="w-full max-h-72 object-cover"
                />
                <button
                  onClick={() => setLightboxImage(getImageUrl(detailIssue.image_path))}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Full Image
                </button>
              </div>
            )}

            {/* Description */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Description & Maintenance Scope
              </span>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {detailIssue.description}
              </p>
            </div>

            {/* AI Vision metadata */}
            {detailIssue.ai_suggested_category && (
              <div className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200 text-xs text-brand-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
                  <div>
                    <span className="font-bold">AI Zero-Shot Detection:</span> {detailIssue.ai_suggested_category}
                  </div>
                </div>
                {detailIssue.ai_confidence_score && (
                  <span className="font-mono font-bold text-brand-700">
                    Score: {detailIssue.ai_confidence_score.toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {/* Status Change Audit Logs History */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                Status History & Audit Trail
              </span>
              {detailIssue.status_logs && detailIssue.status_logs.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {detailIssue.status_logs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={log.new_status} />
                          {log.old_status && (
                            <span className="text-[11px] text-slate-400">
                              (from {log.old_status})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.changed_at ? log.changed_at.replace('T', ' ').substring(0, 16) : ''} UTC
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-slate-700 mt-1 font-medium">{log.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No status changes logged yet.</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleOpenStatusModal(detailIssue)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition"
              >
                Update Status
              </button>
              <button
                type="button"
                onClick={() => setDetailIssue(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Update Modal */}
      {updateModalIssue && (
        <Modal
          isOpen={!!updateModalIssue}
          onClose={() => setUpdateModalIssue(null)}
          title={`Update Issue Status — ${updateModalIssue.id}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveStatus} className="space-y-4">
            {updateError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {updateError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Maintenance Note / Work Log (Optional)
              </label>
              <textarea
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                rows={3}
                placeholder="e.g., Electrician dispatched; replaced burnt capacitor and tested fan operation."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUpdateModalIssue(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Status</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Expanded preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
