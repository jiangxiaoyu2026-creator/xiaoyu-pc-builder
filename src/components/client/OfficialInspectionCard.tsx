import { Shield, CheckCircle, XCircle, Thermometer, FileText, User } from 'lucide-react';
import { InspectionReport } from '../../types/adminTypes';

interface OfficialInspectionCardProps {
    report: InspectionReport;
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
    'A': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'B': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'C': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'D': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export default function OfficialInspectionCard({ report }: OfficialInspectionCardProps) {
    const gradeColor = gradeColors[report.grade] || gradeColors['C'];

    return (
        <div className={`rounded-2xl border-2 ${gradeColor.border} overflow-hidden`}>
            {/* Header */}
            <div className={`${gradeColor.bg} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${gradeColor.bg} border-2 ${gradeColor.border} flex items-center justify-center`}>
                        <Shield size={24} className={gradeColor.text} />
                    </div>
                    <div>
                        <h3 className={`font-bold ${gradeColor.text}`}>官方质检报告</h3>
                        <p className="text-xs text-slate-500">Report ID: {report.reportId || 'N/A'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-4xl font-black ${gradeColor.text}`}>{report.grade}</div>
                    <div className="text-xs text-slate-500">综合评级</div>
                </div>
            </div>

            {/* Score Bar */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700">综合评分</span>
                    <span className={`text-lg font-black ${gradeColor.text}`}>{report.score}/100</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${report.score >= 90 ? 'bg-emerald-500' :
                                report.score >= 70 ? 'bg-blue-500' :
                                    report.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${report.score}%` }}
                    />
                </div>
            </div>

            {/* Test Results */}
            <div className="p-4 grid grid-cols-2 gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    {report.stressTest ? (
                        <CheckCircle size={20} className="text-emerald-500" />
                    ) : (
                        <XCircle size={20} className="text-red-500" />
                    )}
                    <div>
                        <div className="text-xs text-slate-500">压力测试</div>
                        <div className={`text-sm font-bold ${report.stressTest ? 'text-emerald-600' : 'text-red-600'}`}>
                            {report.stressTest ? '通过' : '未通过'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    {report.functionTest ? (
                        <CheckCircle size={20} className="text-emerald-500" />
                    ) : (
                        <XCircle size={20} className="text-red-500" />
                    )}
                    <div>
                        <div className="text-xs text-slate-500">功能检测</div>
                        <div className={`text-sm font-bold ${report.functionTest ? 'text-emerald-600' : 'text-red-600'}`}>
                            {report.functionTest ? '通过' : '未通过'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
                {report.temperature && (
                    <div className="flex items-start gap-3">
                        <Thermometer size={16} className="text-slate-400 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500">核心温度</div>
                            <div className="text-sm font-medium text-slate-700">{report.temperature}</div>
                        </div>
                    </div>
                )}
                <div className="flex items-start gap-3">
                    <FileText size={16} className="text-slate-400 mt-0.5" />
                    <div>
                        <div className="text-xs text-slate-500">外观描述</div>
                        <div className="text-sm font-medium text-slate-700">{report.appearance}</div>
                    </div>
                </div>
                {report.notes && (
                    <div className="flex items-start gap-3">
                        <FileText size={16} className="text-slate-400 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500">备注</div>
                            <div className="text-sm font-medium text-slate-700">{report.notes}</div>
                        </div>
                    </div>
                )}
                {report.summary && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">质检总结</div>
                        <div className="text-sm font-medium text-slate-800">{report.summary}</div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <User size={12} />
                    <span>质检员: {report.inspectorName || '官方质检'}</span>
                </div>
                <span>检测日期: {new Date(report.inspectedAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
}
