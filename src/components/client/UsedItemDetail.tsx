import { useState } from 'react';
import { X, ShieldCheck, ExternalLink, User, Shield, AlertTriangle, Copy, Check } from 'lucide-react';
import { UsedItem, UserItem } from '../../types/adminTypes';
import OfficialInspectionCard from './OfficialInspectionCard';

interface UsedItemDetailProps {
    item: UsedItem;
    onClose: () => void;
    currentUser: UserItem | null;
    onLogin: () => void;
    onConsultPurchase?: (item: UsedItem) => void;
}

export default function UsedItemDetail({ item, onClose, currentUser, onLogin, onConsultPurchase }: UsedItemDetailProps) {
    const [activeImage, setActiveImage] = useState(0);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        if (item.xianyuLink) {
            navigator.clipboard.writeText(item.xianyuLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleGoToXianyu = () => {
        if (item.xianyuLink) {
            window.open(item.xianyuLink, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-up flex flex-col md:flex-row">

                {/* Close Button Mobile */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full md:hidden z-10 backdrop-blur-md">
                    <X size={20} />
                </button>

                {/* Left: Images */}
                <div className="w-full md:w-1/2 bg-slate-100 relative flex flex-col">
                    <div className="flex-1 relative">
                        {item.images[activeImage] ? (
                            <img src={item.images[activeImage]} alt="Main" className="w-full h-full object-contain bg-slate-900" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">暂无图片</div>
                        )}
                        {/* Type Badge */}
                        <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 ${item.type === 'official'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                            }`}>
                            {item.type === 'official' ? <Shield size={14} /> : <User size={14} />}
                            {item.type === 'official' ? '官方自营' : '个人闲置'}
                        </div>
                    </div>
                    {/* Thumbnails */}
                    <div className="p-4 flex gap-2 overflow-x-auto bg-white border-t border-slate-200">
                        {item.images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImage(idx)}
                                className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage === idx ? 'border-indigo-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Info */}
                <div className="w-full md:w-1/2 flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
                    <div className="p-6 md:p-8 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-bold uppercase">{item.category}</span>
                                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-bold">{item.condition}</span>
                                    {item.status === 'sold' && <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded font-bold">已售出</span>}
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">{item.brand} {item.model}</h2>
                            </div>
                            <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Price Card */}
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-red-500">¥{item.price}</span>
                            {item.originalPrice && <span className="text-sm text-slate-400 line-through">原价 ¥{item.originalPrice}</span>}
                            <div className="ml-auto text-xs text-slate-400 flex flex-col items-end">
                                <span>卖家: {item.sellerName}</span>
                                <span>发布于: {new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Personal Item Disclaimer */}
                        {item.type === 'personal' && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-bold mb-1">个人闲置商品</p>
                                    <p>此商品由个人用户发布，平台仅提供展示服务。交易请通过闲鱼完成，请自行核实商品信息，平台不承担担保责任。</p>
                                </div>
                            </div>
                        )}

                        {/* Official Inspection Report */}
                        {item.type === 'official' && item.inspectionReport && (
                            <div className="mb-6">
                                <OfficialInspectionCard report={item.inspectionReport} />
                            </div>
                        )}

                        {/* Simple Inspection for official without report */}
                        {item.type === 'official' && !item.inspectionReport && (
                            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
                                    <ShieldCheck size={18} />
                                    官方自营商品
                                </div>
                                <p className="text-sm text-emerald-600">此商品为平台自营，品质有保障。验机报告正在补充中。</p>
                            </div>
                        )}

                        {/* Description */}
                        <div className="mb-6">
                            <h3 className="font-bold text-slate-800 mb-2">商品详情</h3>
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {item.description}
                            </p>
                        </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0">
                        {item.type === 'personal' && item.xianyuLink ? (
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCopyLink}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                    >
                                        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                        {copied ? '已复制' : '复制链接'}
                                    </button>
                                    <button
                                        onClick={handleGoToXianyu}
                                        disabled={item.status === 'sold'}
                                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${item.status === 'sold'
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                                            }`}
                                    >
                                        <ExternalLink size={18} />
                                        {item.status === 'sold' ? '已售出' : '去闲鱼购买'}
                                    </button>
                                </div>
                                <p className="text-xs text-center text-slate-400">
                                    点击将跳转至闲鱼平台完成交易
                                </p>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        if (!currentUser) {
                                            onLogin();
                                            return;
                                        }
                                        if (onConsultPurchase) {
                                            onConsultPurchase(item);
                                        } else {
                                            alert('请联系客服咨询购买方式');
                                        }
                                    }}
                                    disabled={item.status === 'sold'}
                                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${item.status === 'sold'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                                        }`}
                                >
                                    {item.status === 'sold' ? '已售出' : `咨询购买 (¥${item.price})`}
                                </button>
                                <p className="text-xs text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
                                    <ShieldCheck size={12} />
                                    官方自营 • 品质保障 • 售后无忧
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
