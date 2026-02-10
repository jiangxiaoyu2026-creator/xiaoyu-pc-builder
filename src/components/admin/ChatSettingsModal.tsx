import { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { ChatSettings } from '../../types/adminTypes';

interface ChatSettingsModalProps {
    onClose: () => void;
}

export function ChatSettingsModal({ onClose }: ChatSettingsModalProps) {
    const [settings, setSettings] = useState<ChatSettings>({
        welcomeMessage: '',
        quickReplies: [],
        autoReplyEnabled: false,
        autoReplyContent: ''
    });

    useEffect(() => {
        const loadSettings = async () => {
            const current = await storage.getChatSettings();
            setSettings({
                ...current,
                autoReplyEnabled: current.autoReplyEnabled || false,
                autoReplyContent: current.autoReplyContent || ''
            });
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        await storage.saveChatSettings(settings);
        onClose();
    };

    const addQuickReply = () => {
        setSettings(prev => ({
            ...prev,
            quickReplies: [...prev.quickReplies, '']
        }));
    };

    const updateQuickReply = (index: number, value: string) => {
        const newReplies = [...settings.quickReplies];
        newReplies[index] = value;
        setSettings(prev => ({ ...prev, quickReplies: newReplies }));
    };

    const removeQuickReply = (index: number) => {
        setSettings(prev => ({
            ...prev,
            quickReplies: prev.quickReplies.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-scale-up border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="text-indigo-600" />
                        客户咨询设置
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* Auto Reply Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">自动回复</h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.autoReplyEnabled}
                                    onChange={e => setSettings(prev => ({ ...prev, autoReplyEnabled: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <p className="text-sm text-slate-500">
                            开启后，当用户发送第一条消息或在非工作时间咨询时，系统将自动发送下方设置的回复内容。
                        </p>
                        {settings.autoReplyEnabled && (
                            <textarea
                                value={settings.autoReplyContent}
                                onChange={e => setSettings(prev => ({ ...prev, autoReplyContent: e.target.value }))}
                                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="例如：您好，我现在有点忙，稍后会尽快回复您！您也可以先查看我们的配置广场。"
                            />
                        )}
                    </div>

                    <div className="w-full h-px bg-slate-100"></div>

                    {/* Quick Replies Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">快捷回复</h3>
                            <button
                                onClick={addQuickReply}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                            >
                                <Plus size={14} /> 添加一条
                            </button>
                        </div>
                        <p className="text-sm text-slate-500">
                            设置常用的回复语，在聊天窗口中可一键发送。
                        </p>
                        <div className="space-y-3">
                            {settings.quickReplies.map((reply, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={reply}
                                        onChange={e => updateQuickReply(index, e.target.value)}
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="输入快捷回复内容..."
                                    />
                                    <button
                                        onClick={() => removeQuickReply(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {settings.quickReplies.length === 0 && (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                                    暂无快捷回复，点击上方按钮添加
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2"
                    >
                        <Save size={18} /> 保存设置
                    </button>
                </div>
            </div>
        </div>
    );
}
