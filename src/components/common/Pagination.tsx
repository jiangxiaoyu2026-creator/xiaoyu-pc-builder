import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    const pages = [];
    // Simple page range logic: show first, last, and around current
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return (
        <div className="flex items-center justify-center gap-2 py-6">
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
                <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
                {pages.map((p, idx) => (
                    p === '...' ? (
                        <span key={`dots-${idx}`} className="px-3 text-slate-400">...</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`min-w-[40px] h-10 rounded-lg font-bold text-sm transition-all ${currentPage === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            {p}
                        </button>
                    )
                ))}
            </div>

            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}
