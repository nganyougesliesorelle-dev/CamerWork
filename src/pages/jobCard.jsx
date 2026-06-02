import React from 'react';
import { MapPin, Calendar, CheckCircle, Banknote } from 'lucide-react';


export function JobCard({ job, onClick }) {
  // Couleurs des badges de contrat
  const getTypeColor = (type) => {
    switch (type) {
      case 'CDI': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CDD': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Stage': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer relative overflow-hidden"
    >
      {/* Petite barre décorative au hover */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-all" />

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-600 font-medium">{job.company}</span>
              {job.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
            </div>
          </div>
          {/* Badge Type de contrat */}
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(job.type)}`}>
            {job.type}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>{job.city}</span>
          </div>
          
          {/* AFFICHAGE DU SALAIRE ICI */}
          {job.salary && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold bg-emerald-50 px-2 py-1 rounded-lg">
              <Banknote className="w-4 h-4" />
              <span>{job.salary}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs italic">
            <Calendar className="w-3.5 h-3.5" />
            <span>Publié récemment</span>
          </div>
          <span className="text-blue-600 text-xs font-bold group-hover:underline">Voir détails →</span>
        </div>
      </div>
    </div>
  );
}