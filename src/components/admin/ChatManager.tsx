import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Search, User, CheckCircle, Send, MoreHorizontal, Settings } from 'lucide-react';
import { storage } from '../../services/storage';
import { ChatSession, ChatMessage } from '../../types/adminTypes';
import { ChatSettingsModal } from './ChatSettingsModal';

export default function ChatManager() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Initial Load & Polling
    useEffect(() => {
        const loadSessions = () => {
            const all = storage.getChatSessions();
            setSessions(all);
            // Load Settings too
            const settings = storage.getChatSettings();
            setQuickReplies(settings.quickReplies || []);
        };
        loadSessions();

        const handleSessionUpdate = () => loadSessions();

        const handleStorageUpdate = (e: StorageEvent) => {
            if (e.key === 'xiaoyu_chat_sessions') {
                loadSessions();
            }
        };

        window.addEventListener('xiaoyu-chat-session-update', handleSessionUpdate);
        window.addEventListener('storage', handleStorageUpdate);

        // Poll for new sessions every 5s (Backup)
        const interval = setInterval(loadSessions, 5000);

        return () => {
            window.removeEventListener('xiaoyu-chat-session-update', handleSessionUpdate);
            window.removeEventListener('storage', handleStorageUpdate);
            clearInterval(interval);
        };
    }, []);

    // Load Messages when session selected
    useEffect(() => {
        if (!selectedSessionId) return;

        const loadMessages = () => {
            setMessages(storage.getChatMessages(selectedSessionId));
            // Mark as read
            storage.markSessionRead(selectedSessionId);
        };
        loadMessages();

        // Listen for specific message updates (Same Tab)
        const handleMsgUpdate = (e: CustomEvent) => {
            if (e.detail?.sessionId === selectedSessionId) {
                loadMessages();
            }
        };

        // Listen for specific message updates (Cross Tab)
        const handleStorageUpdate = (e: StorageEvent) => {
            if (e.key === `xiaoyu_chat_msgs_${selectedSessionId}`) {
                loadMessages();
            }
        };

        window.addEventListener('xiaoyu-chat-message-update', handleMsgUpdate as EventListener);
        window.addEventListener('storage', handleStorageUpdate);

        return () => {
            window.removeEventListener('xiaoyu-chat-message-update', handleMsgUpdate as EventListener);
            window.removeEventListener('storage', handleStorageUpdate);
        };
    }, [selectedSessionId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || !selectedSessionId) return;

        storage.addChatMessage(selectedSessionId, {
            sender: 'agent',
            content: input.trim()
        });
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectedSession = sessions.find(s => s.id === selectedSessionId);

    return (
        <>
            <div className="h-full flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Sidebar: Session List */}
                <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <MessageCircle size={20} className="text-indigo-600" />
                                会话列表
                            </h2>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="咨询设置"
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="搜索用户..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">暂无活跃会话</div>
                        ) : (
                            sessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => setSelectedSessionId(session.id)}
                                    className={`w-full p-4 flex items-start gap-3 hover:bg-white transition-colors border-b border-slate-50 text-left relative ${selectedSessionId === session.id ? 'bg-white border-l-4 border-l-indigo-500 shadow-sm' : 'border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                            {session.username?.slice(0, 1) || '客'}
                                        </div>
                                        {session.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                                                {session.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`text-sm font-medium truncate ${session.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                                                {session.username}
                                            </h3>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${session.unreadCount > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                                            {session.lastMessage?.content || '暂无消息'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main: Chat Area */}
                {selectedSession ? (
                    <div className="flex-1 flex flex-col bg-white">
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{selectedSession.username}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        ID: {selectedSession.userId}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                                    <CheckCircle size={18} />
                                </button>
                                <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                            {messages.map((msg) => {
                                const isAgent = msg.sender === 'agent' || msg.sender === 'system';
                                const isSystem = msg.sender === 'system';

                                if (isSystem) {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-4">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
                                                {msg.content}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isAgent
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-bl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-slate-300 mt-1 px-1">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Replies */}
                        <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 overflow-x-auto flex gap-2 no-scrollbar">
                            {quickReplies.length > 0 ? quickReplies.map((text, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setInput(text)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors max-w-[180px] truncate shrink-0"
                                    title={text}
                                >
                                    {text}
                                </button>
                            )) : (
                                <span className="text-xs text-slate-400 italic">暂无快捷回复，请在设置中添加</span>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-slate-100 bg-white">
                            <div className="flex gap-4">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="输入回复内容，按 Enter 发送..."
                                    className="flex-1 h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                                />
                                <div className="flex flex-col justify-end">
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-indigo-200"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-white">
                        <MessageCircle size={64} className="mb-4 opacity-20" />
                        <p>请选择左侧会话开始聊天</p>
                    </div>
                )}
            </div>

            {showSettings && <ChatSettingsModal onClose={() => setShowSettings(false)} />}
        </>
    );
}


