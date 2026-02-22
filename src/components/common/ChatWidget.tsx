import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Minimize2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { ChatMessage, ChatSession } from '../../types/adminTypes';

interface ChatWidgetProps {
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
    initialMessage?: string;
    onInitialMessageSent?: () => void;
}

export default function ChatWidget({ isOpen: externalIsOpen, onToggle, initialMessage, onInitialMessageSent }: ChatWidgetProps = {}) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [session, setSession] = useState<ChatSession | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCount] = useState(0);
    const initialMessageSentRef = useRef(false);

    const handleToggle = (open: boolean) => {
        if (onToggle) {
            onToggle(open);
        } else {
            setInternalIsOpen(open);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const initChat = async () => {
            const user = storage.getCurrentUser();
            const currentSession = await storage.getOrCreateCurrentUserSession(user);
            setSession(currentSession);
            const msgs = await storage.getChatMessages(currentSession.id);
            setMessages(msgs);

            // Listen for updates (Same Tab)
            const handleMsgUpdate = async (e: any) => {
                if (e.detail?.sessionId === currentSession.id) {
                    const freshMsgs = await storage.getChatMessages(currentSession.id);
                    setMessages(freshMsgs);
                }
            };

            // Listen for updates (Cross Tab)
            const handleStorageUpdate = async (e: StorageEvent) => {
                if (e.key === `xiaoyu_chat_msgs_${currentSession.id}`) {
                    const freshMsgs = await storage.getChatMessages(currentSession.id);
                    setMessages(freshMsgs);
                }
            };

            window.addEventListener('xiaoyu-chat-message-update', handleMsgUpdate as EventListener);
            window.addEventListener('storage', handleStorageUpdate);

            // Poll for new messages every 5 seconds (picks up admin replies)
            pollInterval = setInterval(async () => {
                try {
                    const freshMsgs = await storage.getChatMessages(currentSession.id);
                    setMessages(freshMsgs);
                } catch (e) {
                    // silently ignore polling errors
                }
            }, 5000);

            return () => {
                window.removeEventListener('xiaoyu-chat-message-update', handleMsgUpdate as EventListener);
                window.removeEventListener('storage', handleStorageUpdate);
            };
        };
        initChat();

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    // Handle initial message when chat opens
    useEffect(() => {
        if (isOpen && initialMessage && session && !initialMessageSentRef.current) {
            initialMessageSentRef.current = true;
            const sendInitial = async () => {
                try {
                    await storage.addChatMessage(session.id, {
                        sender: 'user',
                        content: initialMessage
                    });
                    const freshMsgs = await storage.getChatMessages(session.id);
                    setMessages(freshMsgs);
                    onInitialMessageSent?.();
                } catch (e) {
                    console.error('Failed to send initial message', e);
                }
            };
            sendInitial();
        }
    }, [isOpen, initialMessage, session, onInitialMessageSent]);

    // Reset the ref when initialMessage changes
    useEffect(() => {
        initialMessageSentRef.current = false;
    }, [initialMessage]);

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !session) return;

        const currentInput = input.trim();
        setInput(''); // Clear immediately for better UX

        try {
            await storage.addChatMessage(session.id, {
                sender: 'user',
                content: currentInput
            });
            // Re-fetch messages to get the auto-reply if there is any
            const freshMsgs = await storage.getChatMessages(session.id);
            setMessages(freshMsgs);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Optionally restore input on failure
            setInput(currentInput);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-36 md:bottom-20 right-4 md:right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[calc(100vw-2rem)] md:w-[360px] h-[60vh] md:h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="h-16 bg-slate-900 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-slate-900">
                                    <MessageCircle size={18} />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">小鱼装机平台客服</h3>
                                <p className="text-slate-400 text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    人工在线
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                            <button onClick={() => handleToggle(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <Minimize2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
                        {messages.map((msg) => {
                            const isMe = msg.sender === 'user';
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-transparent focus-within:border-indigo-200 focus-within:bg-white transition-all">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="请输入您的问题..."
                                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-200"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => handleToggle(true)}
                    className="group relative w-14 h-14 bg-slate-900 hover:bg-indigo-600 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                >
                    <MessageCircle size={28} className="group-hover:rotate-12 transition-transform duration-300" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}
