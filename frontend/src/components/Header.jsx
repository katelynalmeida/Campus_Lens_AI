import React from 'react';
import { Menu, PlusCircle, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const TAB_METADATA = {
  overview: {
    title: 'Campus Facility Overview',
    subtitle: 'Real-time infrastructure health, issue distribution, and recent activity.'
  },
  report: {
    title: 'AI-Powered Campus Issue Detection',
    subtitle: 'Upload or capture a photo for zero-shot AI classification, or enter a manual report.'
  },
  tracking: {
    title: 'Issue Tracking & Maintenance',
    subtitle: 'Filter, review, and manage reported problems and their resolution lifecycles.'
  },
  facilities: {
    title: 'Campus Facilities Catalog',
    subtitle: 'Inventory of educational, research, and utility infrastructure across campus.'
  },
  assistant: {
    title: 'CampusLens AI Assistant',
    subtitle: 'Ask questions about live issue tickets, facility maintenance, and reporting guides.'
  },
  settings: {
    title: 'System Settings & Documentation',
    subtitle: 'Verify system endpoints, machine learning models, and reset demonstration data.'
  }
};

export default function Header({ currentTab, setCurrentTab, setMobileOpen, isOnline, onRefresh, isRefreshing }) {
  const meta = TAB_METADATA[currentTab] || TAB_METADATA.overview;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {meta.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal hidden sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Health Pill */}
          <div className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {isOnline ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Backend Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Backend Disconnected</span>
              </>
            )}
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          )}

          {/* Report an Issue Primary CTA */}
          {currentTab !== 'report' && (
            <button
              onClick={() => setCurrentTab('report')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 shadow-sm shadow-brand-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
