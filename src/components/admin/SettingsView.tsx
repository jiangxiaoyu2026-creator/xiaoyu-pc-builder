import { useState, useEffect, useRef } from 'react';
import { Calculator, Tag, Trash2, Plus, Download, Upload, Pin, Sparkles, X } from 'lucide-react';
import { PricingStrategy, DiscountTier, PopupSettings, SystemAnnouncementSettings, AnnouncementItem } from '../../types/adminTypes';
import { storage } from '../../services/storage';
import ConfirmModal from '../common/ConfirmModal';

export default function SettingsView({ strategy, setStrategy }: { strategy: PricingStrategy, setStrategy: any }) {
    const [newTier, setNewTier] = useState<Partial<DiscountTier>>({ name: '', multiplier: 0.95, description: '', sortOrder: 99 });

    // Confirm Modal States
    const [deleteTierId, setDeleteTierId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [importConfirmFile, setImportConfirmFile] = useState<File | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Popup Settings State
    const [popupSettings, setPopupSettings] = useState<PopupSettings>({
        enabled: false,
        title: '',
        content: '',
        frequency: 'daily',
        theme: 'default'
    });

    const [announcementSettings, setAnnouncementSettings] = useState<SystemAnnouncementSettings>({
        enabled: true,
        items: []
    });

    const isLoadedRef = useRef(false);

    useEffect(() => {
        storage.getPopupSettings().then(setPopupSettings);
        storage.getSystemAnnouncement().then(s => {
            setAnnouncementSettings(s);
            // Small delay to allow initial render before enabling auto-save
            setTimeout(() => { isLoadedRef.current = true; }, 500);
        });
    }, []);

    // Debounced auto-save for announcements
    useEffect(() => {
        if (!isLoadedRef.current) return;

        const timer = setTimeout(() => {
            storage.saveSystemAnnouncement(announcementSettings);
        }, 1000);

        return () => clearTimeout(timer);
    }, [announcementSettings]);



    // Debounced auto-save for popup settings
    useEffect(() => {
        if (!isLoadedRef.current) return;

        const timer = setTimeout(() => {
            storage.savePopupSettings(popupSettings);
        }, 1000);

        return () => clearTimeout(timer);
    }, [popupSettings]);



    const updateTier = async (id: string, field: keyof DiscountTier, val: any) => {
        const newTiers = strategy.discountTiers.map(t => t.id === id ? { ...t, [field]: val } : t);
        newTiers.sort((a, b) => a.sortOrder - b.sortOrder);
        const updatedStrategy = { ...strategy, discountTiers: newTiers };
        setStrategy(updatedStrategy);
        await storage.savePricingStrategy(updatedStrategy);
    };

    const deleteTier = async () => {
        if (!deleteTierId) return;
        const newTiers = strategy.discountTiers.filter(t => t.id !== deleteTierId);
        const updatedStrategy = { ...strategy, discountTiers: newTiers };
        setStrategy(updatedStrategy);
        await storage.savePricingStrategy(updatedStrategy);
        setIsDeleteModalOpen(false);
        setDeleteTierId(null);
    };

    const addTier = async () => {
        if (!newTier.name) return alert('请输入方案名称');
        const tier: DiscountTier = {
            id: `dt-${Date.now()}`,
            name: newTier.name!,
            multiplier: Number(newTier.multiplier),
            description: newTier.description || '',
            sortOrder: Number(newTier.sortOrder) || 99
        };
        const newTiers = [...strategy.discountTiers, tier].sort((a, b) => a.sortOrder - b.sortOrder);
        const updatedStrategy = { ...strategy, discountTiers: newTiers };
        setStrategy(updatedStrategy);
        await storage.savePricingStrategy(updatedStrategy);
        setNewTier({ name: '', multiplier: 0.95, description: '', sortOrder: 99 });
    };



    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 基础利润设置 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calculator size={20} className="text-indigo-600" /> 基础定价公式
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                        <code className="text-sm text-slate-600 font-mono block text-center">
                            最终售价 = 硬件成本价 × (1 + <span className="text-indigo-600 font-bold">服务费率</span>) × 折扣系数
                        </code>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">全局基础服务费率</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                step="0.01"
                                value={strategy.serviceFeeRate}
                                onChange={async (e) => {
                                    const val = parseFloat(e.target.value);
                                    const updated = { ...strategy, serviceFeeRate: val };
                                    setStrategy(updated);
                                    await storage.savePricingStrategy(updated);
                                }}
                                className="w-24 border border-slate-300 rounded-lg p-2 text-center font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-slate-500">= {Math.round(strategy.serviceFeeRate * 100)}% 利润</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">此费率将应用到所有硬件的基础售价计算中。</p>
                    </div>
                </div>

                {/* 折扣阶梯设置 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Tag size={20} className="text-amber-500" /> 折扣阶梯管理
                    </h3>
                    <div className="space-y-3">
                        {strategy.discountTiers.map(tier => (
                            <div key={tier.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 font-mono w-6">#{tier.sortOrder}</span>
                                        <input
                                            className="font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-32"
                                            value={tier.name}
                                            onChange={e => updateTier(tier.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => { setDeleteTierId(tier.id); setIsDeleteModalOpen(true); }} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">系数:</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            max="1"
                                            min="0.1"
                                            value={tier.multiplier}
                                            onChange={e => updateTier(tier.id, 'multiplier', parseFloat(e.target.value))}
                                            className="w-16 border border-slate-200 rounded-lg p-1 text-center font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                            {Math.round(tier.multiplier * 100)}% 折
                                        </span>
                                    </div>
                                    <input
                                        className="flex-1 text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                                        value={tier.description}
                                        onChange={e => updateTier(tier.id, 'description', e.target.value)}
                                        placeholder="描述..."
                                    />
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400">排序:</span>
                                        <input
                                            type="number"
                                            className="w-10 border border-slate-200 rounded text-center text-xs p-1"
                                            value={tier.sortOrder}
                                            onChange={e => updateTier(tier.id, 'sortOrder', Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 mb-2">添加新方案</h4>
                        <div className="flex gap-2">
                            <input type="number" placeholder="排序" className="w-14 border border-slate-200 rounded-lg p-2 text-sm text-center" value={newTier.sortOrder} onChange={e => setNewTier({ ...newTier, sortOrder: Number(e.target.value) })} />
                            <input type="text" placeholder="名称 (如: 老板价)" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} />
                            <input type="number" placeholder="系数 (0.9)" className="w-20 border border-slate-200 rounded-lg p-2 text-sm" value={newTier.multiplier} onChange={e => setNewTier({ ...newTier, multiplier: parseFloat(e.target.value) })} />
                            <button onClick={addTier} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-indigo-600"><Plus size={20} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 营销弹窗设置 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">📢</span> 每日营销弹窗设置
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${popupSettings.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {popupSettings.enabled ? '已开启' : '已关闭'}
                        </span>
                        <button
                            onClick={() => setPopupSettings({ ...popupSettings, enabled: !popupSettings.enabled })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${popupSettings.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${popupSettings.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">弹窗标题</label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="例如：今日限定优惠"
                                value={popupSettings.title}
                                onChange={e => setPopupSettings({ ...popupSettings, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Banner 图片链接 (可选)</label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                                placeholder="https://..."
                                value={popupSettings.imageUrl || ''}
                                onChange={e => setPopupSettings({ ...popupSettings, imageUrl: e.target.value })}
                            />
                            <p className="text-xs text-slate-400 mt-1">建议尺寸: 800x400。留空则不显示图片。</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">跳转链接 (可选)</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="https://..."
                                    value={popupSettings.linkUrl || ''}
                                    onChange={e => setPopupSettings({ ...popupSettings, linkUrl: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">按钮文字</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="默认: 查看详情"
                                    value={popupSettings.buttonText || ''}
                                    onChange={e => setPopupSettings({ ...popupSettings, buttonText: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col h-full">
                        <label className="block text-sm font-bold text-slate-700 mb-1">弹窗正文内容</label>
                        <textarea
                            className="flex-1 w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[120px]"
                            placeholder="支持简单的文本内容..."
                            value={popupSettings.content}
                            onChange={e => setPopupSettings({ ...popupSettings, content: e.target.value })}
                        />

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">展示频率</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={popupSettings.frequency || 'daily'}
                                    onChange={e => setPopupSettings({ ...popupSettings, frequency: e.target.value as any })}
                                >
                                    <option value="once">仅一次 (Once)</option>
                                    <option value="daily">每天一次 (Daily)</option>
                                    <option value="always">每次刷新 (Always)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">主题风格</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={popupSettings.theme || 'default'}
                                    onChange={e => setPopupSettings({ ...popupSettings, theme: e.target.value as any })}
                                >
                                    <option value="default">默认 (Default)</option>
                                    <option value="festive">节日 (Festive)</option>
                                    <option value="promo">大促 (Promo)</option>
                                    <option value="notice">公告 (Notice)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">开始日期 (可选)</label>
                                <input
                                    type="date"
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                    value={popupSettings.startDate || ''}
                                    onChange={e => setPopupSettings({ ...popupSettings, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">结束日期 (可选)</label>
                                <input
                                    type="date"
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                    value={popupSettings.endDate || ''}
                                    onChange={e => setPopupSettings({ ...popupSettings, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Preview Section */}
                <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
                    <h4 className="text-sm font-bold text-slate-400 mb-4 w-full">效果预览 (Live Preview)</h4>

                    {/* Mock Popup Window */}
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 transform scale-90 sm:scale-100 transition-all duration-300">
                        {/* Close Button Mock */}
                        <div className="absolute top-4 right-4 z-10 text-slate-400">
                            <X size={20} />
                        </div>

                        {/* Image Area */}
                        {popupSettings.imageUrl ? (
                            <div className="w-full h-40 bg-slate-100 relative">
                                <img src={popupSettings.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                                {popupSettings.theme === 'promo' && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500" />
                                )}
                            </div>
                        ) : (
                            <div className={`w-full h-24 flex items-center justify-center ${popupSettings.theme === 'festive' ? 'bg-red-50 text-red-500' :
                                popupSettings.theme === 'promo' ? 'bg-indigo-50 text-indigo-500' :
                                    popupSettings.theme === 'notice' ? 'bg-amber-50 text-amber-500' :
                                        'bg-slate-100 text-slate-400'
                                }`}>
                                <Sparkles size={32} />
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="p-6 text-center">
                            <h3 className={`text-xl font-bold mb-2 ${popupSettings.theme === 'festive' ? 'text-red-600' :
                                popupSettings.theme === 'promo' ? 'text-indigo-600' :
                                    'text-slate-800'
                                }`}>
                                {popupSettings.title || '标题'}
                            </h3>
                            <p className="text-slate-600 text-sm mb-6 whitespace-pre-wrap">
                                {popupSettings.content || '内容...'}
                            </p>

                            {popupSettings.linkUrl && (
                                <button className={`px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${popupSettings.theme === 'festive' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                                    popupSettings.theme === 'promo' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                                        popupSettings.theme === 'notice' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                                            'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
                                    }`}>
                                    {popupSettings.buttonText || '查看详情'}
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">注意：实际显示效果可能因用户设备屏幕大小而略有不同。</p>

                    {/* 系统公告设置 (Visual Builder Remark Replacement) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-2xl">📢</span> 首页公告栏设置
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${announcementSettings.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {announcementSettings.enabled ? '已开启' : '已关闭'}
                                </span>
                                <button
                                    onClick={() => setAnnouncementSettings({ ...announcementSettings, enabled: !announcementSettings.enabled })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${announcementSettings.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${announcementSettings.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-4">
                                {announcementSettings.items && announcementSettings.items.length > 0 ? (
                                    <div className="space-y-3">
                                        {announcementSettings.items.map((item, index) => (
                                            <div key={item.id} className={`p-4 border rounded-xl transition-all ${item.pinned ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'}`}>
                                                <div className="flex gap-3 items-start">
                                                    <div className="pt-2">
                                                        <select
                                                            className={`text-xs font-bold rounded px-2 py-1 border outline-none cursor-pointer ${item.type === 'warning' ? 'bg-red-100 text-red-600 border-red-200' :
                                                                item.type === 'promo' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                                    'bg-blue-100 text-blue-600 border-blue-200'
                                                                }`}
                                                            value={item.type}
                                                            onChange={e => {
                                                                const newItems = [...announcementSettings.items];
                                                                newItems[index].type = e.target.value as any;
                                                                setAnnouncementSettings({ ...announcementSettings, items: newItems });
                                                            }}
                                                        >
                                                            <option value="info">通知</option>
                                                            <option value="warning">紧急</option>
                                                            <option value="promo">活动</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <textarea
                                                            className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-700 outline-none resize-none focus:ring-0 placeholder:text-slate-400"
                                                            placeholder="公告内容..."
                                                            rows={2}
                                                            value={item.content}
                                                            onChange={e => {
                                                                const newItems = [...announcementSettings.items];
                                                                newItems[index].content = e.target.value;
                                                                setAnnouncementSettings({ ...announcementSettings, items: newItems });
                                                            }}
                                                        />
                                                        <input
                                                            className="w-full bg-transparent border-none p-0 text-xs text-slate-500 outline-none focus:ring-0 placeholder:text-slate-400"
                                                            placeholder="跳转链接 (可选)..."
                                                            value={item.linkUrl || ''}
                                                            onChange={e => {
                                                                const newItems = [...announcementSettings.items];
                                                                newItems[index].linkUrl = e.target.value;
                                                                setAnnouncementSettings({ ...announcementSettings, items: newItems });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const newItems = [...announcementSettings.items];
                                                                newItems[index].pinned = !newItems[index].pinned;
                                                                // Sort: Pinned first
                                                                newItems.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
                                                                setAnnouncementSettings({ ...announcementSettings, items: newItems });
                                                            }}
                                                            className={`p-1.5 rounded hover:bg-black/5 ${item.pinned ? 'text-indigo-600' : 'text-slate-300'}`}
                                                            title={item.pinned ? "取消置顶" : "置顶公告"}
                                                        >
                                                            <Pin size={16} className={item.pinned ? 'fill-current' : ''} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const newItems = announcementSettings.items.filter((_, i) => i !== index);
                                                                setAnnouncementSettings({ ...announcementSettings, items: newItems });
                                                            }}
                                                            className="p-1.5 rounded hover:bg-black/5 text-slate-300 hover:text-red-500"
                                                            title="删除"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        暂无公告，点击下方按钮添加
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        const newItem: AnnouncementItem = {
                                            id: `ann-${Date.now()}`,
                                            content: '',
                                            type: 'info',
                                            pinned: false
                                        };
                                        setAnnouncementSettings({
                                            ...announcementSettings,
                                            items: [...(announcementSettings.items || []), newItem]
                                        });
                                    }}
                                    className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-bold text-sm"
                                >
                                    <Plus size={18} /> 添加新公告
                                </button>
                                <p className="text-xs text-slate-400 mt-2">提示：置顶公告将优先展示。支持多条公告轮播显示。</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 邮件 SMTP 设置 (已隐藏) */}
            {/* <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                ... (Email settings hidden as requested) ...
            </div> */}



            {/* 数据管理与备份 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Download size={20} className="text-emerald-500" /> 数据导出与备份
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                        目前导出功能主要备份本地设置及缓存。服务端数据建议定期通过后端数据库工具备份。
                    </p>
                    <button
                        onClick={() => storage.exportData()}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                    >
                        <Download size={18} /> 导出全站备份 (.json)
                    </button>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Upload size={20} className="text-indigo-500" /> 恢复备份数据
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                        选择您之前导出的备份文件进行恢复。注意：<span className="text-red-500">恢复操作将覆盖当前所有数据并刷新页面。</span>
                    </p>
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer">
                        <Upload size={18} /> 选择备份文件并恢复
                        <input
                            type="file"
                            className="hidden"
                            accept=".json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setImportConfirmFile(file);
                                    setIsImportModalOpen(true);
                                }
                            }}
                        />
                    </label>
                </div>
            </div>

            {/* Confirm Tier Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="确认删除折扣方案"
                description="确定要删除该折扣方案吗？删除后相关的价格策略将受影响。"
                confirmText="确认删除"
                isDangerous={true}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={deleteTier}
            />

            {/* Confirm Import Modal */}
            <ConfirmModal
                isOpen={isImportModalOpen}
                title="确认从备份恢复"
                description="确定要从备份文件恢复吗？当前所有数据（包括硬件、配置、用户等）将被覆盖并刷新页面！"
                confirmText="确认恢复"
                isDangerous={true}
                onClose={() => setIsImportModalOpen(false)}
                onConfirm={async () => {
                    if (importConfirmFile) {
                        const success = await storage.importData(importConfirmFile);
                        if (!success) alert('导入失败，请检查文件格式。');
                        setIsImportModalOpen(false);
                    }
                }}
            />
        </div>
    );
}
