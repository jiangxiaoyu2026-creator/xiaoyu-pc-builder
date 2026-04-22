import re

with open('src/components/admin/PriceTrendChart.tsx', 'r') as f:
    content = f.read()

# We want to replace the block starting with "{/* 筛选器 - 粘性顶部 */}" (or similar) until right before "{/* 全部品类全局概览面板 */}"
start_idx = content.find('{/* 筛选器 - 粘性顶部 */}')
end_idx = content.find('{/* 全部品类全局概览面板 */}')

if start_idx == -1 or end_idx == -1:
    print("Cannot find boundaries!")
    exit(1)

new_content = '''{/* 筛选器 - 粘性顶部 (高级感响应式版) */}
                        <div className="sticky top-0 z-20 -mt-3 pt-3 pb-4 mb-6 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 -mx-3 px-3 sm:mx-0 sm:px-0 transition-all duration-300">
                            <div className="flex flex-col xl:flex-row xl:justify-between gap-4 max-w-full">
                                {/* 第一组：品类与规格过滤 (横向滑动) */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 shrink-0 w-full xl:w-auto">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100/50 dark:bg-indigo-900/30 hidden sm:flex items-center justify-center shrink-0 mr-1">
                                        <Filter size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    
                                    {publicMode ? (
                                        <div className="px-5 py-2 text-[13px] tracking-wider font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-none rounded-xl flex items-center justify-center shrink-0">
                                            CPU 专区
                                        </div>
                                    ) : (
                                        <select
                                            value={category}
                                            onChange={e => {
                                                setCategory(e.target.value);
                                                setSubcategory('');
                                                setBrandFilter('');
                                                setActualBrandFilter('');
                                                setGpuChipFilter('');
                                                setRamGeneration('');
                                                setSelectedProductId('');
                                            }}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="all">全部品类</option>
                                            {sortCategories(data.categories).map(c => (
                                                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                                            ))}
                                        </select>
                                    )}

                                    {category === 'ram' && (
                                        <select
                                            value={ramGeneration}
                                            onChange={e => {
                                                setRamGeneration(e.target.value);
                                                setSubcategory('');
                                            }}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="">全部代数 (DDR4/5)</option>
                                            <option value="DDR4">DDR4 专区</option>
                                            <option value="DDR5">DDR5 专区</option>
                                        </select>
                                    )}

                                    {/* GPU Dropdown */}
                                    {category === 'gpu' && gpuChipSeries.length > 0 && (
                                        <select
                                            value={gpuChipFilter}
                                            onChange={e => { setGpuChipFilter(e.target.value); setSelectedProductId(''); }}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="">全部芯片组</option>
                                            {gpuChipSeries.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Dynamic OEM Brands */}
                                    {['ram', 'disk', 'gpu', 'motherboard', 'monitor', 'cooler', 'power', 'case', 'peripheral'].includes(category) && trendData && trendData.products && (
                                        (() => {
                                            const brands = Array.from(new Set(
                                                trendData.products
                                                    .filter(p => p.price > 0 && p.category === category)
                                                    .map(p => {
                                                        const m = p.name.match(/^([^\s\(（]+)/);
                                                        return m ? m[1] : '';
                                                    })
                                                    .filter(b => b.length > 0 && b.length < 15)
                                            )).sort();
                                            if (brands.length === 0) return null;
                                            return (
                                                <select
                                                    value={actualBrandFilter}
                                                    onChange={e => { setActualBrandFilter(e.target.value); setSelectedProductId(''); }}
                                                    className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none max-w-[150px] shrink-0"
                                                >
                                                    <option value="">全部品牌</option>
                                                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                            );
                                        })()
                                    )}

                                    {/* General Subcategory */}
                                    {category !== 'gpu' && category !== 'all' && specPriceTable && specPriceTable.length > 0 && (
                                        <select
                                            value={subcategory}
                                            onChange={e => setSubcategory(e.target.value)}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="">全部{category === 'cpu' ? '代数' : '具体规格'}</option>
                                            {specPriceTable.map(row => (
                                                <option key={row.label} value={row.label}>{row.label}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* 第二组：品牌组和单品列表 */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {['cpu', 'gpu', 'mainboard'].includes(category) && (
                                        <div className="flex gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-inner shrink-0 cursor-pointer border border-transparent">
                                            {[
                                                { value: '', label: '全部' },
                                                ...(category === 'gpu'
                                                    ? [{ value: 'NVIDIA', label: 'N卡' }, { value: 'AMD', label: 'A卡' }]
                                                    : [{ value: 'AMD', label: 'AMD' }, { value: 'Intel', label: 'Intel' }]
                                                )
                                            ].map(b => (
                                                <button
                                                    key={b.value}
                                                    onClick={() => { setBrandFilter(b.value); setSelectedProductId(''); }}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                                                        brandFilter === b.value
                                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                                >
                                                    {b.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {category !== 'all' && trendData && trendData.products && (
                                        <select
                                            value={selectedProductId}
                                            onChange={e => setSelectedProductId(e.target.value)}
                                            className="flex-1 sm:flex-none sm:w-[240px] px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none truncate"
                                        >
                                            <option value="">查看单品走势...</option>
                                            {trendData.products
                                                .filter(p => matchesBrand(p.name) && matchesChip(p.name))
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* 第三组：时间区间选择 */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 mt-3 w-full border-t border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-inner shrink-0">
                                    {[7, 14, 30, 60, 90].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => { setDays(d); setUseCustomRange(false); setShowDatePicker(false); }}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                                                days === d && !useCustomRange
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {d}天
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                                            useCustomRange
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <Calendar size={12} />
                                        {useCustomRange && customStartDate && customEndDate
                                            ? `${customStartDate.slice(5)} → ${customEndDate.slice(5)}`
                                            : '自定义'}
                                    </button>
                                </div>

                                {showDatePicker && (
                                    <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm animate-page-enter">
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={e => setCustomStartDate(e.target.value)}
                                            className="text-xs border-0 outline-none bg-transparent text-slate-700 dark:text-slate-200 font-semibold w-[100px] sm:w-auto"
                                        />
                                        <span className="text-slate-300 dark:text-slate-500 text-xs font-black">→</span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={e => setCustomEndDate(e.target.value)}
                                            className="text-xs border-0 outline-none bg-transparent text-slate-700 dark:text-slate-200 font-semibold w-[100px] sm:w-auto"
                                        />
                                        <button
                                            onClick={() => {
                                                if (customStartDate && customEndDate && customStartDate <= customEndDate) {
                                                    setUseCustomRange(true);
                                                    setShowDatePicker(false);
                                                }
                                            }}
                                            disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                                            className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg flex-shrink-0 hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-none shadow-sm"
                                        >
                                            确定
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

            {/* 单品类迷你统计条 (高颜值毛玻璃/微光效卡片) */}
            {category !== 'all' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {/* 涨价模块 */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-900 dark:to-rose-900/10 p-4 xl:p-5 rounded-2xl border border-rose-100/60 dark:border-rose-900/30 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-rose-100 dark:border-rose-800/50 text-rose-500 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <TrendingUp size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">本月涨价趋势</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-rose-600 dark:text-rose-500 leading-none drop-shadow-sm">{todaySummary.monthUpCount ?? todaySummary.upCount}</span>
                                        <span className="text-[10px] font-bold text-rose-400 bg-rose-100/50 dark:bg-rose-900/50 px-2 py-0.5 rounded-full">今日: {todaySummary.todayUpCount ?? todaySummary.upCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* 降价模块 */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-900/10 p-4 xl:p-5 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-100 dark:border-emerald-800/50 text-emerald-500 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <TrendingDown size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">本月降价趋势</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500 leading-none drop-shadow-sm">{todaySummary.monthDownCount ?? todaySummary.downCount}</span>
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">今日: {todaySummary.todayDownCount ?? todaySummary.downCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 总变动模块 */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-900/10 p-4 xl:p-5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-800/50 text-indigo-500 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <Activity size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">本月总变动数</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none drop-shadow-sm">{todaySummary.monthTotalChanges ?? todaySummary.totalChanges}</span>
                                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">今日: {todaySummary.todayTotalChanges ?? todaySummary.totalChanges}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            '''

with open('src/components/admin/PriceTrendChart.tsx', 'w') as f:
    f.write(content[:start_idx] + new_content + content[end_idx:])

print("Successfully replaced content.")
