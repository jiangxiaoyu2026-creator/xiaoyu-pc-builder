
import React from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

export function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white font-medium'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

export function StatCard({ title, value, unit, desc, icon, color }: any) {
    const colors: any = {
        indigo: 'bg-indigo-50 text-indigo-600',
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600',
        gray: 'bg-gray-100 text-gray-600'
    }
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
            <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-800">{value}</span>
                    <span className="text-xs text-slate-500 font-medium">{unit}</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">{desc}</div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || colors.indigo}`}>
                {icon}
            </div>
        </div>
    )
}

export function SortIcon({ active, dir }: { active: boolean, dir?: 'asc' | 'desc' }) {
    if (!active) return <ArrowUpDown size={14} className="text-slate-300" />;
    return dir === 'asc' ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />;
}
