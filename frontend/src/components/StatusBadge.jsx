import React from 'react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Flame, 
  AlertTriangle, 
  Info,
  Wrench,
  Zap,
  Droplets,
  Armchair,
  Trash2,
  Building,
  Fan
} from 'lucide-react';

export function StatusBadge({ status }) {
  switch (status) {
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Pending
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Wrench className="w-3 h-3 text-blue-600 animate-spin-slow" />
          In Progress
        </span>
      );
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Resolved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}

export function PriorityBadge({ priority }) {
  switch (priority) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-600" />
          Critical
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          <AlertTriangle className="w-3 h-3 text-orange-600" />
          High
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Info className="w-3 h-3 text-sky-600" />
          Medium
        </span>
      );
    case 'Low':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Low
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {priority}
        </span>
      );
  }
}

export function CategoryIcon({ category, className = "w-4 h-4" }) {
  if (category.includes("Electrical") || category.includes("light")) {
    return <Zap className={`${className} text-amber-500`} />;
  }
  if (category.includes("Water") || category.includes("plumbing")) {
    return <Droplets className={`${className} text-cyan-500`} />;
  }
  if (category.includes("furniture") || category.includes("desk")) {
    return <Armchair className={`${className} text-indigo-500`} />;
  }
  if (category.includes("Garbage") || category.includes("litter")) {
    return <Trash2 className={`${className} text-emerald-500`} />;
  }
  if (category.includes("wall") || category.includes("door") || category.includes("ceiling")) {
    return <Building className={`${className} text-violet-500`} />;
  }
  if (category.includes("fan") || category.includes("equipment")) {
    return <Fan className={`${className} text-teal-500`} />;
  }
  return <AlertCircle className={`${className} text-slate-500`} />;
}
