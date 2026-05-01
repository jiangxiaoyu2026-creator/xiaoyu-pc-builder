import sys

with open('src/components/client/GameFPSViewer.tsx', 'r') as f:
    content = f.read()

start_marker = '<div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">'
end_marker = '                </div>\n            </div>\n        </div>\n    );\n};\n'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    sys.exit(1)

new_content = content[:start_idx] + '''<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
                    
                    {/* === 左侧：战术控制台 === */}
                    <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6 relative z-40">
                        {/* 1. 游戏选择器 */}
                        <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <Gamepad2 size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">测试目标</h2>
                                    <p className="text-[12px] text-slate-500 mt-0.5">选择要进行帧数测试的游戏</p>
                                </div>
                            </div>
                            
                            <SearchableSelect 
                                options={gamesList}
                                value={selectedGame}
                                onChange={handleSelectGame}
                                placeholder="搜索游戏..."
                                icon={Search}
                                label="选择游戏"
                                isGame={true}
                            />
                        </div>

                        {/* 2. 硬件与模式控制 */}
                        <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
                            {/* Mode Tabs */}
                            <div className="flex p-1.5 bg-slate-50 dark:bg-[#1A1A24] rounded-[14px] border border-slate-200 dark:border-[#2D3748]">
                                <button onClick={() => setActiveMode('config')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'config' ? 'bg-white dark:bg-[#2D3748] text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-transparent' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-transparent'}`}><Activity size={14}/> 整机诊断</button>
                                <button onClick={() => setActiveMode('cpu')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'cpu' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/30' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-transparent'}`}><Cpu size={14}/> CPU对比</button>
                                <button onClick={() => setActiveMode('gpu')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'gpu' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-emerald-500/30' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-transparent'}`}><MonitorPlay size={14}/> GPU对比</button>
                            </div>

                            {/* Selectors */}
                            <div className="flex flex-col gap-5">
                                {activeMode === 'config' ? (
                                    <>
                                        <SearchableSelect options={availableCpus} value={selectedCpu} onChange={setSelectedCpu} placeholder="输入或选择 CPU..." icon={Cpu} label="处理器 (CPU)"/>
                                        <SearchableSelect options={availableGpus} value={selectedGpu} onChange={setSelectedGpu} placeholder="输入或选择 显卡..." icon={MonitorPlay} label="独立显卡 (GPU)"/>
                                    </>
                                ) : activeMode === 'cpu' ? (
                                    <>
                                        <SearchableSelect options={availableCpus} value={selectedCpu} onChange={setSelectedCpu} placeholder="选择处理器 A..." icon={Cpu} label="处理器 (CPU) A"/>
                                        <SearchableSelect options={availableCpus} value={selectedCpu2} onChange={setSelectedCpu2} placeholder="选择处理器 B..." icon={Cpu} label="处理器 (CPU) B"/>
                                    </>
                                ) : (
                                    <>
                                        <SearchableSelect options={availableGpus} value={selectedGpu} onChange={setSelectedGpu} placeholder="选择显卡 A..." icon={MonitorPlay} label="独立显卡 (GPU) A"/>
                                        <SearchableSelect options={availableGpus} value={selectedGpu2} onChange={setSelectedGpu2} placeholder="选择显卡 B..." icon={MonitorPlay} label="独立显卡 (GPU) B"/>
                                    </>
                                )}

                                <div className="relative z-0 mt-2 border-t border-slate-100 dark:border-slate-800 pt-5">
                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1 uppercase tracking-widest">画面分辨率</div>
                                    <div className="flex gap-2 h-[46px] bg-slate-50 dark:bg-[#1A1A24] p-1.5 rounded-xl border border-slate-200 dark:border-[#2D3748] transition-colors">
                                        {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                                            <button
                                                key={res}
                                                onClick={() => setSelectedRes(res)}
                                                className={`flex-1 rounded-[8px] font-medium text-[13px] transition-all ${
                                                    selectedRes === res 
                                                    ? 'bg-white dark:bg-[#2D3748] text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent' 
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                                                }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50/80 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-800/20 flex items-start gap-2 leading-relaxed">
                                        <div className="text-amber-500 mt-0.5"><Activity size={14} /></div>
                                        <div>
                                            <span className="font-bold text-amber-700 dark:text-amber-500">基准：最高/超级画质。</span>
                                            实际游玩若用中低画质，帧率将大幅提升。
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* === 右侧：数据看板 === */}
                    <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6">
                        
                        {/* 所选游戏展示横幅 */}
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="relative overflow-hidden rounded-[24px] bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] h-[160px] sm:h-[180px] flex items-center shadow-sm transition-colors duration-300">
                            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.15] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600 via-transparent to-transparent"></div>
                            
                            {/* 游戏图片占位 */}
                            <div 
                                className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2 opacity-30 dark:opacity-40 bg-cover bg-center bg-no-repeat pointer-events-none" 
                                style={{ 
                                    backgroundImage: `url('/images/games/covers/${selectedGame}.jpg')`,
                                    maskImage: 'linear-gradient(to right, transparent, black)',
                                    WebkitMaskImage: 'linear-gradient(to right, transparent, black)'
                                }}
                            ></div>

                            <div className="relative z-10 p-8 sm:p-10 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-3">
                                    <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
                                        {selectedGame}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[12px] sm:text-[13px] font-bold tracking-widest uppercase bg-white/50 dark:bg-black/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20 dark:border-white/5">
                                    <Activity size={16} className="animate-pulse" /> 实时计算分析引擎激活
                                </div>
                            </div>
                        </motion.div>

                        {/* 主数据区 */}
                        {activeMode === 'config' ? (
                            <div className="flex flex-col gap-6">
                                {/* 核心指标与诊断容器 */}
                                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] shadow-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden">
                                    {/* 评级 */}
                                    <div className="absolute top-6 right-6">
                                        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border flex items-center gap-2 shadow-sm ${scoreStyle.bg} ${scoreStyle.border}`}>
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${scoreStyle.text.replace('text-', 'bg-')}`} />
                                            <span className={`text-[11px] sm:text-[12px] font-bold uppercase tracking-widest ${scoreStyle.text}`}>{rating.label}</span>
                                        </div>
                                    </div>

                                    {/* 帧数展示 */}
                                    <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start md:items-center mt-6 mb-12">
                                        <div>
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <GaugeCircle size={18} />
                                                <span className="text-[14px] font-bold">平均画面帧数</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <motion.div className={`text-[5rem] sm:text-[6rem] lg:text-[7rem] font-display leading-[0.8] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${scoreStyle.gradient}`}>
                                                    <BouncyNumber value={result.avg} />
                                                </motion.div>
                                                <span className={`text-xl sm:text-2xl font-display font-bold ${scoreStyle.text} opacity-50`}>FPS</span>
                                            </div>
                                        </div>
                                        
                                        <div className="hidden md:block w-px h-24 bg-slate-100 dark:bg-slate-800"></div>
                                        
                                        <div>
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <TrendingUp size={18} />
                                                <span className="text-[14px] font-bold">1% Low 最低帧</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <motion.div className={`text-[3rem] sm:text-[4rem] font-display leading-[0.8] font-black tracking-tight text-slate-700 dark:text-slate-300`}>
                                                    <BouncyNumber value={result.low} />
                                                </motion.div>
                                                <span className={`text-lg font-display font-bold text-slate-500 opacity-50`}>FPS</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 木桶效应可视化 */}
                                    <div className="bg-slate-50 dark:bg-[#1A1A24] rounded-[20px] p-6 sm:p-8 border border-slate-100 dark:border-[#2D3748]">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                <Activity size={18} />
                                            </div>
                                            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">木桶效应诊断</h3>
                                        </div>

                                        <div className="space-y-6">
                                            {/* CPU Bar */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <Cpu size={16} className="text-slate-400" />
                                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{selectedCpu}</span>
                                                        {result.isCpuBottleneck && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-[6px] ml-2 shadow-sm shadow-rose-500/20">瓶颈</span>}
                                                    </div>
                                                    <div className="text-[15px] font-display font-bold text-slate-900 dark:text-white">{result.cAvg} <span className="text-[11px] font-sans text-slate-400 font-normal">极限 FPS</span></div>
                                                </div>
                                                <div className="h-3.5 w-full bg-slate-200/50 dark:bg-[#121218] rounded-full overflow-hidden border border-slate-200/50 dark:border-[#2D3748] relative">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (result.cAvg / 300) * 100)}%` }}
                                                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${result.isCpuBottleneck ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-slate-400 dark:bg-slate-500'}`} 
                                                    />
                                                </div>
                                            </div>

                                            {/* GPU Bar */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <MonitorPlay size={16} className="text-slate-400" />
                                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{selectedGpu}</span>
                                                        {!result.isCpuBottleneck && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-[6px] ml-2 shadow-sm shadow-rose-500/20">瓶颈</span>}
                                                    </div>
                                                    <div className="text-[15px] font-display font-bold text-slate-900 dark:text-white">{result.gAvg} <span className="text-[11px] font-sans text-slate-400 font-normal">极限 FPS</span></div>
                                                </div>
                                                <div className="h-3.5 w-full bg-slate-200/50 dark:bg-[#121218] rounded-full overflow-hidden border border-slate-200/50 dark:border-[#2D3748] relative">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (result.gAvg / 300) * 100)}%` }}
                                                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${!result.isCpuBottleneck ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-slate-400 dark:bg-slate-500'}`} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-7 pt-5 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <p className="text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {result.diff < 10 ? (
                                                    "当前配置极为均衡，CPU与GPU性能几乎在同一水平线上，无明显瓶颈。"
                                                ) : result.isCpuBottleneck ? (
                                                    <><strong className="text-rose-500 font-bold">CPU 处理能力触达极限。</strong> 显卡性能仍有巨大富余，建议升级处理器或进一步拉高画质以榨干显卡性能。</>
                                                ) : (
                                                    <><strong className="text-rose-500 font-bold">GPU 满载成为帧率瓶颈。</strong> 处理器游刃有余但显卡已无余力，建议适当调低游戏画质或升级显卡。</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        ) : activeMode === 'cpu' ? (
                            <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] shadow-sm p-4 sm:p-6 lg:p-8">
                                {renderComparisonCard(selectedCpu, gamesFpsData[selectedGame]?.cpu[selectedCpu]?.[selectedRes], selectedCpu2, gamesFpsData[selectedGame]?.cpu[selectedCpu2]?.[selectedRes], Cpu)}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] shadow-sm p-4 sm:p-6 lg:p-8">
                                {renderComparisonCard(selectedGpu, gamesFpsData[selectedGame]?.gpu[selectedGpu]?.[selectedRes], selectedGpu2, gamesFpsData[selectedGame]?.gpu[selectedGpu2]?.[selectedRes], MonitorPlay)}
                            </div>
                        )}
                    </div>
''' + end_marker

with open('src/components/client/GameFPSViewer.tsx', 'w') as f:
    f.write(new_content)

print("Done")
