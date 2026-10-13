import React, { useState, useEffect } from 'react';
import { 
  fetchDashboardData, 
  getImageUrl 
} from '../api/client';
import { StatusBadge, PriorityBadge, CategoryIcon } from '../components/StatusBadge';
import { 
  ClipboardList, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  ArrowRight, 
  RefreshCw, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileQuestion
} from 'lucide-react';

export default function Overview({ setCurrentTab, setSelectedIssueId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDashboardData();
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Fetching live campus statistics from database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-base">Backend Connection Notice</h3>
        </div>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const {
    total_issues = 0,
    pending_issues = 0,
    in_progress_issues = 0,
    resolved_issues = 0,
    high_priority_issues = 0,
    total_facilities = 0,
    status_distribution = {},
    category_distribution = {},
    priority_distribution = {},
    recent_issues = [],
    recent_activity = []
  } = data || {};

  const statCards = [
    {
      title: 'Total Issues',
      value: total_issues,
      icon: ClipboardList,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-100',
      description: 'Recorded across campus'
    },
    {
      title: 'Pending Issues',
      value: pending_issues,
      icon: Clock,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      description: 'Awaiting maintenance action'
    },
    {
      title: 'In Progress',
      value: in_progress_issues,
      icon: Wrench,
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-100',
      description: 'Active work underway'
    },
    {
      title: 'Resolved',
      value: resolved_issues,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      description: 'Completed and verified'
    },
    {
      title: 'High Priority',
      value: high_priority_issues,
      icon: AlertTriangle,
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100',
      description: 'Critical / High urgency'
    },
    {
      title: 'Campus Facilities',
      value: total_facilities,
      icon: Building2,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-100',
      description: 'Monitored physical zones'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Banner CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-slate-900/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-400/30 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Maintenance Infrastructure
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            CampusLens Smart Facility Intelligence
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Detect problems before they escalate. Capture photos of broken fixtures, flickering lights, or leakages to automatically categorize and dispatch maintenance tasks.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentTab('report')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-md shadow-brand-500/20 transition-all active:scale-95"
            >
              <span>Report New Issue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentTab('tracking')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
            >
              <span>Track Existing Issues</span>
            </button>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Dynamic Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className={`p-4 rounded-2xl bg-white border ${card.border} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 truncate">{card.title}</span>
                <div className={`p-1.5 rounded-lg ${card.bg} ${card.text}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {card.value}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Status Distribution</h3>
          <p className="text-xs text-slate-500 mb-5">Current resolution progress across all tickets</p>
          
          <div className="space-y-4">
            {['Pending', 'In Progress', 'Resolved'].map((st) => {
              const count = status_distribution[st] || 0;
              const pct = total_issues > 0 ? Math.round((count / total_issues) * 100) : 0;
              const barColor = st === 'Pending' ? 'bg-amber-500' : st === 'In Progress' ? 'bg-brand-500' : 'bg-emerald-500';
              return (
                <div key={st} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{st}</span>
                    <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${barColor} transition-all duration-500 rounded-full`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Resolution Rate</span>
            <span className="font-bold text-emerald-600">
              {total_issues > 0 ? Math.round(((resolved_issues) / total_issues) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Priority Levels</h3>
          <p className="text-xs text-slate-500 mb-5">Severity breakdown of active reports</p>
          
          <div className="space-y-3.5">
            {[
              { label: 'Critical', color: 'bg-rose-500', text: 'text-rose-700' },
              { label: 'High', color: 'bg-orange-500', text: 'text-orange-700' },
              { label: 'Medium', color: 'bg-sky-500', text: 'text-sky-700' },
              { label: 'Low', color: 'bg-slate-400', text: 'text-slate-600' }
            ].map((item) => {
              const count = priority_distribution[item.label] || 0;
              const pct = total_issues > 0 ? Math.round((count / total_issues) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs font-semibold text-slate-800">{item.label} Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{count}</span>
                    <span className="text-[11px] text-slate-400 w-9 text-right font-mono">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Critical issues are flagged for immediate groundskeeper dispatch.
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Issue Categories</h3>
          <p className="text-xs text-slate-500 mb-5">Reported problem categories</p>
          
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {Object.keys(category_distribution).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No categories recorded yet.</p>
            ) : (
              Object.entries(category_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <CategoryIcon category={cat} className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 truncate">{cat}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Issues & Activity Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issue Reports (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recent Issue Reports</h3>
              <p className="text-xs text-slate-500">Latest problem submissions requiring facility action</p>
            </div>
            <button
              onClick={() => setCurrentTab('tracking')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {recent_issues.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileQuestion className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No issues have been reported yet.</p>
              <button
                onClick={() => setCurrentTab('report')}
                className="mt-3 text-xs font-bold text-brand-600 hover:underline"
              >
                Submit the first campus report
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent_issues.map((issue) => (
                <div 
                  key={issue.id}
                  onClick={() => {
                    if (setSelectedIssueId) setSelectedIssueId(issue.id);
                    setCurrentTab('tracking');
                  }}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {issue.image_path ? (
                      <img 
                        src={getImageUrl(issue.image_path)} 
                        alt="Thumbnail" 
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <CategoryIcon category={issue.category} className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-brand-600">{issue.id}</span>
                        <PriorityBadge priority={issue.priority} />
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {issue.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">{issue.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={issue.status} />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline (1 col) */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Recent Activity</h3>
            <p className="text-xs text-slate-500 mb-4">Real-time status changes and updates</p>

            {recent_activity.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-4">
                {recent_activity.map((act) => (
                  <div key={act.id} className="relative pl-5 before:absolute before:left-1 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:hidden">
                    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-slate-700">{act.issue_id}</span>
                        <span className="text-[10px] text-slate-400">
                          {act.changed_at ? act.changed_at.substring(11, 16) : ''} UTC
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 leading-snug">
                        {act.note || `Status changed to ${act.new_status}`}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={act.new_status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
              Live Audit Log
            </span>
            <span className="font-mono text-slate-400 text-[11px]">SQLite Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
