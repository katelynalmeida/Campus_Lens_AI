import React, { useState, useEffect } from 'react';
import { fetchFacilities } from '../api/client';
import { 
  Building2, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  PlusCircle, 
  Flame,
  ArrowRight
} from 'lucide-react';

export default function Facilities({ setCurrentTab, setPreloadedLocation }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchFacilities();
      setFacilities(res);
    } catch (err) {
      setError(err.message || "Failed to load facilities records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const facilityTypes = ['All', ...new Set(facilities.map(f => f.facility_type))];

  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.building_or_block.toLowerCase().includes(search.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'All' || f.facility_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleReportForFacility = (facility) => {
    if (setPreloadedLocation) {
      setPreloadedLocation(`${facility.building_or_block}, ${facility.name}`);
    }
    setCurrentTab('report');
  };

  return (
    <div className="space-y-6">
      {/* Intro & Search Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-600" />
              Campus Facilities & Infrastructure Catalog
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active facility zones, laboratory spaces, and operational maintenance status.
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Facilities"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by facility name, building or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {facilityTypes.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'All Facility Types' : t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && facilities.length === 0 && (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading campus facilities database...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center">
          <p className="text-sm font-medium mb-3">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFacilities.map((fac) => {
          const isOperational = fac.maintenance_status === 'Operational';
          const isUnderMaint = fac.maintenance_status === 'Under Maintenance';

          return (
            <div
              key={fac.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header tags */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                    {fac.facility_type}
                  </span>

                  {/* Status pill */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isOperational 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : isUnderMaint 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {isOperational && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {isUnderMaint && <Wrench className="w-3 h-3 text-amber-600" />}
                    {!isOperational && !isUnderMaint && <AlertCircle className="w-3 h-3 text-rose-600" />}
                    {fac.maintenance_status}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {fac.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {fac.building_or_block}
                </p>

                <p className="text-xs text-slate-600 leading-relaxed mt-3 line-clamp-3">
                  {fac.description || "Campus educational and utility infrastructure record."}
                </p>
              </div>

              {/* Footer info & CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {fac.open_issues_count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      {fac.open_issues_count} open issue{fac.open_issues_count > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      ✓ No active open issues
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleReportForFacility(fac)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 transition"
                >
                  <span>Report Issue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
