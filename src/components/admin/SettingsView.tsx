
import { useState } from 'react';
import { Calculator, Tag, Trash2, Plus, Download, Upload, ShieldCheck } from 'lucide-react';
import { PricingStrategy, DiscountTier } from '../../types/adminTypes';

import { storage } from '../../services/storage';

export default function SettingsView({ strategy, setStrategy }: { strategy: PricingStrategy, setStrategy: any }) {
    const [newTier, setNewTier] = useState<Partial<DiscountTier>>({ name: '', multiplier: 0.95, description: '', sortOrder: 99 });




    const updateTier = (id: string, field: keyof DiscountTier, val: any) => {
        const newTiers = strategy.discountTiers.map(t => t.id === id ? { ...t, [field]: val } : t);
        // 更新后自动排序
        newTiers.sort((a, b) => a.sortOrder - b.sortOrder);
        setStrategy({ ...strategy, discountTiers: newTiers });
    };

    const deleteTier = (id: string) => {
        if (confirm('确定删除该折扣方案吗？')) {
            const newTiers = strategy.discountTiers.filter(t => t.id !== id);
            setStrategy({ ...strategy, discountTiers: newTiers });
        }
    };

    const addTier = () => {
        if (!newTier.name) return alert('请输入方案名称');
        const tier: DiscountTier = {
            id: `dt-${Date.now()}`,
            name: newTier.name!,
            multiplier: Number(newTier.multiplier),
            description: newTier.description || '',
            sortOrder: Number(newTier.sortOrder) || 99
        };
        const newTiers = [...strategy.discountTiers, tier].sort((a, b) => a.sortOrder - b.sortOrder);
        setStrategy({ ...strategy, discountTiers: newTiers });
        setNewTier({ name: '', multiplier: 0.95, description: '', sortOrder: 99 });
    };

    const handleResetSystem = () => {
        if (confirm('⚠️ 警告：这将清空所有数据（配置单、用户、设置）并重置为初始状态！\n\n确定要继续吗？')) {
            storage.resetData();
        }
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
                        <label className="block text-sm font-bold text-slate-700 mb-2">全局基础服务费率 (Profit Margin)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                step="0.01"
                                value={strategy.serviceFeeRate}
                                onChange={e => setStrategy({ ...strategy, serviceFeeRate: parseFloat(e.target.value) })}
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
                                    <button onClick={() => deleteTier(tier.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
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

            {/* 数据管理与备份 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Download size={20} className="text-emerald-500" /> 数据导出与备份
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                        为了防止浏览器清理缓存导致数据丢失，建议定期导出本站所有数据（包含硬件库、配置单、用户信息及统计指标）。
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
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && confirm('确定要从备份文件恢复吗？当前所有数据将被覆盖！')) {
                                    const success = await storage.importData(file);
                                    if (!success) alert('导入失败，请检查文件格式。');
                                }
                            }}
                        />
                    </label>
                </div>
            </div>

            {/* 系统管理 - 危险区域 */}
            <div className="bg-red-50 p-8 rounded-[32px] border border-red-100 shadow-sm">
                <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} /> 系统底层重置 (Danger Zone)
                </h3>
                <p className="text-sm text-red-600 mb-4">
                    如果您需要清空所有测试数据重新开始，请点击下方按钮。这将会清除所有已发布的配置单、用户创建的硬件、以及自定义的设置，并将系统恢复到初始演示数据状态。
                </p>
                <button
                    onClick={handleResetSystem}
                    className="px-6 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                >
                    重置所有数据 (Factory Reset)
                </button>

                <div className="mt-6 pt-6 border-t border-red-100/50">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">测试数据生成</h4>
                    <p className="text-xs text-slate-500 mb-3">生成 200 条随机硬件数据以测试性能和前端选择功能。</p>
                    <button
                        onClick={handleGenerateMockData}
                        className="px-6 py-2 bg-white border border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
                    >
                        ⚡️ 生成 200 条测试硬件
                    </button>
                </div>
            </div>
        </div>
    )
}

const handleGenerateMockData = () => {
    if (!confirm('确定要生成 200 条测试数据吗？（质量更好，且默认上架）')) return;

    const MOCKS: Record<string, { brands: string[], models: string[] }> = {
        cpu: {
            brands: ['Intel', 'AMD'],
            models: ['Core i9-14900K', 'Core i7-14700K', 'Core i5-13600K', 'Ryzen 9 7950X', 'Ryzen 7 7800X3D', 'Ryzen 5 7600X']
        },
        gpu: {
            brands: ['ASUS', 'MSI', 'Gigabyte', 'Colorful', 'Zotac', 'Sapphire'],
            models: ['RTX 4090 D', 'RTX 4080 Super', 'RTX 4070 Ti Super', 'RTX 4060 Ti', 'RX 7900 XTX', 'RX 7800 XT']
        },
        mainboard: {
            brands: ['ASUS', 'MSI', 'Gigabyte', 'ASRock'],
            models: ['Z790 Hero', 'B760M Bomber', 'X670E Taichi', 'B650M Mortar', 'Z790 Formula', 'B760-G Strix']
        },
        ram: {
            brands: ['G.Skill', 'Corsair', 'Kingston', 'ADATA'],
            models: ['Trident Z5 32GB', 'Vengeance 16GB', 'Fury Beast 16GB', 'Lancer RGB 32GB']
        },
        disk: {
            brands: ['Samsung', 'WD', 'Crucial', 'Lexar'],
            models: ['990 Pro 2TB', 'SN850X 1TB', 'P3 Plus 1TB', 'NM800 Pro 2TB']
        },
        power: {
            brands: ['Corsair', 'Seasonic', 'ASUS', 'MSI'],
            models: ['RM1000e', 'Focus GX-850', 'Thor 1200W', 'A1000G']
        },
        case: {
            brands: ['LianLi', 'NZXT', 'Corsair', 'Phanteks'],
            models: ['O11 Ultra', 'H9 Flow', '4000D Airflow', 'NV7']
        },
        cooling: {
            brands: ['Valkyrie', 'DeepCool', 'NZXT', 'Corsair'],
            models: ['GL360', 'E360', 'Kraken 360', 'H150i']
        },
        monitor: {
            brands: ['LG', 'Samsung', 'ASUS', 'AOC'],
            models: ['27GP950', 'G9 Neo', 'PG27AQDM', 'Q27G2S']
        }
        // Others use generic
    };

    const GENERIC_BRANDS = ['Generic', 'Other'];
    const GENERIC_MODELS = ['Standard Edition', 'Pro Version'];
    const CATEGORIES = ['cpu', 'mainboard', 'gpu', 'ram', 'disk', 'power', 'case', 'cooling', 'monitor', 'keyboard', 'mouse', 'fan'];

    const newProducts = [];
    for (let i = 0; i < 200; i++) {
        const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const config = MOCKS[cat] || { brands: GENERIC_BRANDS, models: GENERIC_MODELS };

        const brand = config.brands[Math.floor(Math.random() * config.brands.length)];
        const modelBase = config.models[Math.floor(Math.random() * config.models.length)];
        const price = Math.floor(Math.random() * 8000) + 100;

        newProducts.push({
            id: `mock-${Date.now()}-${i}`,
            category: cat,
            brand: brand,
            model: `${modelBase} (Test-${i})`,
            price: price,
            status: 'active', // Default to active
            sortOrder: 100,
            specs: {
                socket: cat === 'cpu' || cat === 'mainboard' ? (modelBase.includes('Ryzen') || modelBase.includes('X670') || modelBase.includes('B650') ? 'AM5' : 'LGA1700') : undefined,
                memoryType: cat === 'ram' || cat === 'mainboard' ? 'DDR5' : undefined,
                wattage: cat === 'power' ? [750, 850, 1000, 1200][Math.floor(Math.random() * 4)] : undefined
            },
            imageUrl: ''
        });
    }

    const current = storage.getProducts();
    // @ts-ignore
    storage.saveProducts([...current, ...newProducts]);
    alert(`⚡️ 质量升级！成功生成 ${newProducts.length} 条有效且相关的测试数据。`);
};
