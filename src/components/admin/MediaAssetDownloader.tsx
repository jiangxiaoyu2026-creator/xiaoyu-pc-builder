import React from 'react';
import { Download, Image as ImageIcon, CheckCircle } from 'lucide-react';

export interface MediaAsset {
    id: string | null;
    brand: string;
    model: string;
    image: string | null;
    keyword: string;
}

interface Props {
    assets: MediaAsset[];
}

export const MediaAssetDownloader: React.FC<Props> = ({ assets }) => {
    
    const handleDownloadAll = async () => {
        // Simple download all implementation
        // Opens each image in a new tab or triggers download
        assets.forEach((asset, idx) => {
            if (asset.image) {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = asset.image!;
                    link.download = `${asset.brand}_${asset.model}.png`;
                    // some browsers block multiple downloads, target blank as fallback
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, idx * 300); // Stagger downloads slightly
            }
        });
    };

    if (!assets || assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
                <ImageIcon size={48} className="opacity-30" />
                <p>今日文案中未提取到明确的硬件主角，或未找到对应的官方素材图。</p>
            </div>
        );
    }

    const validAssets = assets.filter(a => a.image);
    const missingAssets = assets.filter(a => !a.image);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="text-indigo-600" />
                        今日视频专属配套素材包
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">AI 已自动从文案中提取了今日重点提及的硬件，并为您打包了高清去背素材，可直接用于剪映/PR视频剪辑。</p>
                </div>
                {validAssets.length > 0 && (
                    <button 
                        onClick={handleDownloadAll}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition"
                    >
                        <Download size={18} /> 一键打包下载生效图片 ({validAssets.length}张)
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {validAssets.map((asset, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group relative">
                        <div className="h-40 bg-slate-50 p-4 flex items-center justify-center relative inner-shadow-sm">
                            <img 
                                src={asset.image!} 
                                alt={asset.model} 
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                            />
                            <div className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                <CheckCircle size={10} /> 高清去背
                            </div>
                        </div>
                        <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center">
                            <div className="truncate">
                                <div className="text-xs font-bold text-slate-800 truncate">{asset.brand}</div>
                                <div className="text-[10px] text-slate-500 truncate">{asset.model}</div>
                            </div>
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = asset.image!;
                                    link.download = `${asset.brand}_${asset.model}.png`;
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-md transition"
                                title="单独下载此图"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {missingAssets.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span> 缺漏素材 (库中缺少图片)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {missingAssets.map((asset, idx) => (
                            <a 
                                key={idx}
                                href={`https://www.bing.com/images/search?q=${encodeURIComponent(asset.keyword + ' 京东 详情图')}&FORM=HDRSC2`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                            >
                                🔍 点击去百度/Bing搜索 "{asset.keyword}" 图片
                            </a>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">点击上述标签将打开搜索引擎帮您快速找到遗漏的素材图。</p>
                </div>
            )}
        </div>
    );
};
