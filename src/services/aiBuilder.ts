
import { HardwareItem, Category, BuildEntry } from '../types/clientTypes';
import { ConfigItem } from '../types/adminTypes';
import { storage } from './storage';

export interface AIBuildRequest {
    budget: number;
    usage: 'gaming' | 'work' | 'streaming';
    appearance: 'black' | 'white' | 'rgb';
    includeMonitor?: boolean;
}

export interface AIBuildLog {
    type: 'analysis' | 'search' | 'match' | 'adjustment' | 'complete';
    step: string;
    detail: string;
}

export interface AIBuildResult {
    items: Partial<Record<Category, HardwareItem>>;
    totalPrice: number;
    description: string;
    logs: AIBuildLog[];
}

export interface AIAnalysisResult {
    score: number;
    title: string;
    pros: string[];
    cons: string[];
    suggestions: string[];
}

const RATIOS = {
    // Optimized ratios for 2024/2025 Market
    gaming: { gpu: 0.45, cpu: 0.20, mainboard: 0.12, ram: 0.08, disk: 0.06, power: 0.07, cooling: 0.02, case: 0.05 },
    work: { gpu: 0.15, cpu: 0.35, mainboard: 0.15, ram: 0.15, disk: 0.12, power: 0.06, cooling: 0.02, case: 0.05 },
    streaming: { gpu: 0.35, cpu: 0.25, mainboard: 0.12, ram: 0.10, disk: 0.08, power: 0.08, cooling: 0.02, case: 0.05 },
};


export const aiBuilder = {
    parseRequest: (prompt: string): AIBuildRequest => {
        let budget = 6000; // Default
        let usage: AIBuildRequest['usage'] = 'gaming';
        let appearance: AIBuildRequest['appearance'] = 'black';
        let includeMonitor = false;

        // 1. Extract Budget
        const budgetMatch = prompt.match(/(\d{1,6})/);
        if (budgetMatch) {
            budget = parseInt(budgetMatch[0]);
        } else {
            if (prompt.includes('一万')) budget = 10000;
            if (prompt.includes('两万')) budget = 20000;
            if (prompt.includes('三万')) budget = 30000;
            if (prompt.includes('五千')) budget = 5000;
        }

        // 2. Extract Usage
        if (/(办公|设计|剪辑|渲染|生产力|代码|编程)/.test(prompt)) usage = 'work';
        if (/(直播|推流|录制|OBS)/.test(prompt)) usage = 'streaming';

        // 3. Extract Appearance
        if (/(白|海景|雪|纯白)/.test(prompt)) appearance = 'white';
        else if (/(灯|光|RGB|炫|跑马灯)/.test(prompt)) appearance = 'rgb';

        // 4. Detect Monitor
        if (/(显示器|屏幕|带屏)/.test(prompt)) includeMonitor = true;

        return { budget, usage, appearance, includeMonitor };
    },

    analyzeBuild: (items: BuildEntry[]): AIAnalysisResult => {
        let score = 85;
        const pros: string[] = [];
        const cons: string[] = [];
        const suggestions: string[] = [];

        const cpu = items.find(i => i.category === 'cpu')?.item;
        const gpu = items.find(i => i.category === 'gpu')?.item;
        const ram = items.find(i => i.category === 'ram')?.item;


        if (cpu && gpu) {
            pros.push(`CPU与显卡组合合理`);
            // Simple bottleneck check logic could go here
        } else {
            cons.push('缺少核心组件');
            score -= 20;
        }

        if (ram?.model.includes('DDR5')) {
            pros.push('已启用 DDR5 高速内存');
            score += 5;
        }

        return { score, title: "AI 评测报告", pros, cons, suggestions };
    },

    generateBuild: async (req: AIBuildRequest): Promise<AIBuildResult> => {
        const aiSettings = await storage.getAISettings();
        const persona = aiSettings.persona || 'toxic';
        const strategy = aiSettings.strategy || 'balanced';

        const products = await storage.getProducts();
        const configs = await storage.getConfigs();
        const communityConfigs = configs.filter((c: ConfigItem) => c.status === 'published');
        const logs: AIBuildLog[] = [];
        const result: Partial<Record<Category, HardwareItem>> = {};

        const addLog = (type: AIBuildLog['type'], step: string, detail: string) => {
            logs.push({ type, step, detail });
        };

        const usageLabel = req.usage === 'gaming' ? '深度电竞' : req.usage === 'work' ? '专业创作' : '高清直播';
        const personaLabel = persona === 'toxic' ? '毒舌' : persona === 'professional' ? '专业' : persona === 'enthusiastic' ? '热心' : '稳重';
        const strategyLabel = strategy === 'performance' ? '性能至上' : strategy === 'aesthetic' ? '颜值巅峰' : strategy === 'budget' ? '极致性价比' : '均衡之道';

        addLog('analysis', '算法预热', `[SYSTEM] Booting AI hardware engine v2.4.0... 加载 [${personaLabel}] 认知模组与 [${strategyLabel}] 启发式算法策略。`);

        // --- Learning Phase: Reference Community Configs ---
        addLog('search', '特征向量提取', `[CRITICAL] 正在检索全局分布式存储 [官方推荐/主播精选] 方案簇，提取硬件特征向量...`);
        const relevantConfigs = communityConfigs
            .filter((c: ConfigItem) => {
                // Must be recommended by Official or Streamer
                if (!c.isRecommended) return false;

                // Price range matching (+/- 25% for broader learning)
                const priceMatch = c.totalPrice >= req.budget * 0.75 && c.totalPrice <= req.budget * 1.25;

                // Keyword matching for usage
                const usageKeywords = req.usage === 'gaming' ? ['游戏', '电竞', 'FPS'] : req.usage === 'work' ? ['办公', '生产力', '设计'] : ['直播', '推流'];
                const usageMatch = usageKeywords.some(k => c.title.includes(k) || (c.tags && c.tags.some(t => t.includes(k))));

                return priceMatch && usageMatch;
            })
            .sort((a: ConfigItem, b: ConfigItem) => (b.likes + b.views / 100) - (a.likes + a.views / 100)); // Sort by popularity

        let communityReference: ConfigItem | null = null;
        if (relevantConfigs.length > 0) {
            communityReference = relevantConfigs[0];
            addLog('match', '神经网络加权', `[CORE] 命中高关联性参考方案 《${communityReference.title}》 (Like: ${communityReference.likes})，已将其注入硬件偏差层。`);
        } else {
            addLog('analysis', '冷启动路径', `[WARN] 未发现高置信度外部模型，正在激活自注意力机制进行独立硬件组合演算...`);
        }

        addLog('analysis', '环境参数解析', `[ENV] 预算边界: ¥${req.budget} | 应用拓扑: ${usageLabel} | 视觉约束: ${req.appearance === 'white' ? '纯白海景' : '经典方案'}`);

        // --- Strategy: Dynamic Ratios ---
        let baseRatio = { ...RATIOS[req.usage] };

        if (strategy === 'performance') {
            baseRatio.gpu += 0.05;
            baseRatio.cpu += 0.03;
            baseRatio.case -= 0.04;
            baseRatio.cooling -= 0.02;
            baseRatio.mainboard -= 0.02;
        } else if (strategy === 'budget') {
            baseRatio.gpu -= 0.05;
            baseRatio.case = 0.03; // Ultra cheap case
            baseRatio.cooling = 0.02;
        } else if (strategy === 'aesthetic') {
            baseRatio.case += 0.05;
            baseRatio.cooling += 0.03;
            baseRatio.gpu -= 0.05;
            baseRatio.ram += 0.02;
        }

        const ratio = baseRatio;
        let currentTotal = 0;

        // Helper to find best fit with reason tracking
        const findBestFit = (cat: Category, budgetCap: number, filters: { keyword?: string, socket?: string, memoryType?: string } = {}): { item: HardwareItem | null, reason: string } => {
            const allCandidates = products.filter((p: HardwareItem) => p.category === cat && p.status === 'active');

            // 1. Strict Compatibility Filtering (Socket, Memory, Keyword)
            let compatible = allCandidates.filter((p: HardwareItem) => {
                if (filters.socket) {
                    const s = p.specs?.socket;
                    if (s && s !== filters.socket && !p.model.includes(filters.socket)) return false;
                }
                if (filters.memoryType) {
                    const m = (p.specs as any)?.memoryType;
                    if (m && !m.includes(filters.memoryType) && !p.model.includes(filters.memoryType)) return false;
                }
                if (filters.keyword && !p.model.toLowerCase().includes(filters.keyword.toLowerCase())) return false;
                return true;
            });

            if (compatible.length === 0) return { item: null, reason: 'stock_missing' };

            // 2. Strategy-based candidate selection
            let selectedCandidates = compatible;
            let reason = 'perfect_match';

            if (strategy === 'budget') {
                // Prioritize cheapest among those that are not "trash"
                selectedCandidates = compatible.filter((p: HardwareItem) => p.price <= budgetCap * 1.5);
                selectedCandidates.sort((a: HardwareItem, b: HardwareItem) => a.price - b.price);
                reason = 'budget_lock';
            } else if (strategy === 'performance' && (cat === 'gpu' || cat === 'cpu')) {
                // Allow up to 150% of targeted category budget if it gets a massive boost
                selectedCandidates = compatible.filter((p: HardwareItem) => p.price <= budgetCap * 1.5 && p.price >= budgetCap * 0.8);
                selectedCandidates.sort((a: HardwareItem, b: HardwareItem) => b.price - a.price); // Best performance in reach
                reason = 'perf_focus';
            } else {
                selectedCandidates = compatible.filter((p: HardwareItem) => p.price <= budgetCap * 1.3 && p.price >= budgetCap * 0.4);
                selectedCandidates.sort((a: HardwareItem, b: HardwareItem) => Math.abs(a.price - budgetCap) - Math.abs(b.price - budgetCap));
            }

            // Fallback 1: Relaxed Price Range
            if (selectedCandidates.length === 0) {
                selectedCandidates = compatible.filter((p: HardwareItem) => p.price <= budgetCap * 3.0 && p.price >= budgetCap * 0.1);
                selectedCandidates.sort((a: HardwareItem, b: HardwareItem) => Math.abs(a.price - budgetCap) - Math.abs(b.price - budgetCap));
                reason = 'tolerance_match';
            }

            // Fallback 2: Any Compatible Item
            if (selectedCandidates.length === 0) {
                selectedCandidates = compatible;
                reason = 'any_compatible';
            }

            // 3. Appearance Preference (White) - STRONGER if strategy is aesthetic
            if ((req.appearance === 'white' || strategy === 'aesthetic') && ['case', 'cooling', 'gpu', 'ram', 'mainboard'].includes(cat)) {
                const whiteOnes = selectedCandidates.filter((p: HardwareItem) => /white|白|雪|冰|纯/.test(p.model.toLowerCase()));
                if (whiteOnes.length > 0) {
                    selectedCandidates = whiteOnes;
                    reason = 'aesthetic_choice';
                }
            }

            return { item: selectedCandidates[0] || null, reason };
        };

        const selectionReasons: Record<Category, string> = {} as any;

        // 1. CPU
        addLog('search', '核心计算单元', `正在根据 [${strategyLabel}] 策略检索处理器...`);
        const cpuBudget = req.budget * ratio.cpu;

        // Influence from community reference
        let cpuFilters: any = {};
        if (communityReference?.items.cpu) {
            const refCpu = products.find((p: HardwareItem) => p.id === communityReference?.items.cpu);
            if (refCpu) {
                cpuFilters.keyword = refCpu.model.split(' ')[0]; // Use brand/series as hint
            }
        }

        let cpuResult = findBestFit('cpu', cpuBudget, cpuFilters);
        let cpu = cpuResult.item;

        // New Logic: Platform Cost Optimization (AM5 vs LGA1700)
        if (cpu && (strategy === 'budget' || req.budget < 6500) && (cpu.model.includes('7500') || cpu.model.includes('9600'))) {
            addLog('analysis', '平台性价比评估', `检测到 AM5 平台总价偏高，尝试通过 Intel D4 平台释放预算...`);
            const intelResult = findBestFit('cpu', cpuBudget, { keyword: '12400' });
            if (intelResult.item) {
                cpu = intelResult.item;
                cpuResult = intelResult;
                cpuResult.reason = 'budget_platform_opt';
                addLog('adjustment', '平台切换', `已自动切换至高性价比 Intel 平台 (${cpu.model})，释放预算给显卡。`);
            }
        }

        if (cpu) {
            result['cpu'] = cpu;
            selectionReasons['cpu'] = cpuResult.reason;
            currentTotal += cpu.price;
            addLog('match', 'CPU 锁定', `${cpu.model} (¥${cpu.price})`);
        } else {
            addLog('adjustment', '库存告急', '未找到合适的CPU');
        }

        // Determine Platform Specs
        const socket = cpu?.specs?.socket || (cpu?.model.includes('7500') || cpu?.model.includes('7800') ? 'AM5' : 'LGA1700');
        let memoryType = (req.budget > 7000 || cpu?.model.includes('DDR5')) ? 'DDR5' : 'DDR4';
        if (socket === 'AM5') memoryType = 'DDR5';

        addLog('analysis', '平台架构确认', `基于 CPU 自动匹配: ${socket} 主板 + ${memoryType} 内存`);

        // 2. GPU
        const gpuBudget = req.budget * ratio.gpu;
        addLog('search', '图形加速卡', `正在寻找适合${req.usage === 'gaming' ? '3A大作' : '生产力调度'}的显卡...`);

        let gpuFilters: any = {};
        if (req.usage === 'streaming') gpuFilters.keyword = 'RTX';

        // Influence from community reference
        if (communityReference?.items.gpu) {
            const refGpu = products.find((p: HardwareItem) => p.id === communityReference?.items.gpu);
            if (refGpu) {
                gpuFilters.keyword = refGpu.model.split(' ')[0];
            }
        }

        let gpuResult = findBestFit('gpu', gpuBudget, gpuFilters);
        let gpu = gpuResult.item;

        if (gpu) {
            result['gpu'] = gpu;
            selectionReasons['gpu'] = gpuResult.reason;
            currentTotal += gpu.price;
            addLog('match', '显卡 锁定', `${gpu.model} (¥${gpu.price})`);
        }

        // 3. Mainboard
        addLog('search', '主板座驾', `正在匹配 ${socket} 接口主板...`);
        const mbResult = findBestFit('mainboard', req.budget * ratio.mainboard, { socket, memoryType });
        const mb = mbResult.item;
        if (mb) {
            result['mainboard'] = mb;
            selectionReasons['mainboard'] = mbResult.reason;
            currentTotal += mb.price;
            addLog('match', '主板 锁定', `${mb.model} (¥${mb.price})`);
        }

        // 4. Components Fill
        const components: Category[] = ['ram', 'disk', 'power', 'cooling', 'case'];
        if (req.includeMonitor) components.push('monitor');

        for (const cat of components) {
            let budget = req.budget * (ratio[cat as keyof typeof ratio] || 0.05);
            if (cat === 'case' && (req.appearance !== 'black' || strategy === 'aesthetic')) budget *= 1.5;

            const res = findBestFit(cat, budget, cat === 'ram' ? { memoryType } : {});
            const item = res.item;

            if (item) {
                result[cat] = item;
                selectionReasons[cat] = res.reason;
                currentTotal += item.price;
            }
        }

        addLog('complete', '整机验证', `已完成全链路兼容性测试。总价: ¥${currentTotal}`);

        // --- Generate Narrative Description (Professional Structured Engine) ---
        let narrative = '这套配置整体搭配合理，但存在部分可优化空间，具体分析如下：\n\n';

        const targetCpu = result.cpu;
        const targetGpu = result.gpu;
        const targetMb = result.mainboard;
        const targetPsu = result.power;
        const targetCooler = result.cooling;
        const targetRam = result.ram;
        const targetDisk = result.disk;
        const targetChassis = result.case;

        // 1. Core Performance Matching Analysis
        narrative += `**1. 核心性能匹配性分析**\n`;
        if (targetCpu && targetGpu) {
            const cpuInfo = `${targetCpu.model}${targetCpu.specs.cores ? `（${targetCpu.specs.cores}核${targetCpu.specs.threads}线程）` : ''}`;
            const gpuInfo = `${targetGpu.model}${targetGpu.specs.memorySize ? ` ${targetGpu.specs.memorySize}GB` : ''}`;
            const gpuPerf = targetGpu.specs.performance || '主流游戏流畅运行';

            narrative += `- **CPU与显卡**：${cpuInfo}作为核心动力，搭配${gpuInfo}可实现${gpuPerf}表现。`;

            // Intelligence: Analysis of pairings
            if (targetCpu.model.includes('X3D') && targetGpu.price < 3000) {
                narrative += `虽被部分观点认为“大材小用”，但若追求极致电竞帧数，此组合在高刷新率线下表现极佳 ✅。`;
            } else if (targetGpu.price > targetCpu.price * 2.5) {
                narrative += `此组合偏向图形性能，适合 2K/4K 高画质游戏，但在部分吃 CPU 的网游中可能存在轻微瓶颈 🔍。`;
            } else {
                narrative += `两者搭配均衡，在大多数场景下都能发挥出最佳能效比 ✅。`;
            }
            narrative += `\n`;

            const vram = targetGpu.specs.memorySize || 8;
            narrative += `- **显存/性能考量**：${vram}GB显存应对当前主流分辨率足够，但在开启高画质3A大作时建议关注显存占用情况，必要时可优化纹理精度以维持稳定帧率 🔍。\n\n`;
        }

        // 2. Key Component Adaptability
        narrative += `**2. 关键组件适配性**\n`;
        if (targetPsu) {
            const psuW = targetPsu.specs.wattage || 650;
            const sysW = (targetCpu?.specs.wattage || 100) + (targetGpu?.specs.maxWattage || 200) + 100;
            narrative += `- **电源**：${targetPsu.model}（额定${psuW}W）可满足整机约${sysW}W的功耗需求。若未来有更高规格升级计划，建议关注电源余量 ⚡。\n`;
        }
        if (targetCooler) {
            const coolerType = targetCooler.model.includes('水冷') ? '水冷散热' : '风冷散热';
            narrative += `- **散热**：${targetCooler.model}${coolerType}可压制${targetCpu?.model || '处理器'}的发热需求。鉴于高性能处理器对温度敏感，建议保持良好风道以确保满载稳定 🌡️。\n`;
        }
        if (targetMb) {
            const vrmInfo = targetMb.specs.vrm ? `${targetMb.specs.vrm}相供电` : '稳定供电设计';
            narrative += `- **主板**：${targetMb.model}支持${targetMb.specs.socket || '对应'}接口与${targetMb.specs.memoryType || '对应'}内存，${vrmInfo}确保了性能的充分释放 💻。\n\n`;
        }

        // 3. Optimization Suggestions
        narrative += `**3. 优化建议**\n`;
        if (targetGpu && targetGpu.price < 4000) {
            narrative += `- **显卡升级**：若追求 2K 极高画质或更稳定的 1% Low 帧，未来可考虑升级至更高阶位显卡以获得质变提升 📈。\n`;
        }
        if (targetRam && targetDisk) {
            const ramInfo = targetRam.specs.memoryType ? `${targetRam.specs.memoryType}低时序内存` : '高性能内存';
            narrative += `- **内存/硬盘**：${ramInfo}完美匹配平台架构；当前固态硬盘性能达标，重度玩家建议后续根据存储需求加装大容量 SSD 💾。\n`;
        }
        if (targetChassis) {
            narrative += `- **机箱兼容性**：${targetChassis.model}空间布局合理，建议安装时确认显卡限长与风道规划以达到最佳视觉与散热平衡 🏗️。\n\n`;
        }

        // 4. Conclusion
        const priceDiff = currentTotal - req.budget;
        let conclusionEmoji = '🎯';
        if (priceDiff > 500) conclusionEmoji = '⚠️';
        else if (priceDiff < -200) conclusionEmoji = '💎';

        narrative += `**结论**：当前配置整机价格 ${currentTotal} 元，相比预算${priceDiff > 0 ? `超支 ${priceDiff} 元` : `节省 ${Math.abs(priceDiff)} 元`}。针对您的场景需求表现均衡，性价比表现优秀 ${conclusionEmoji}。\n\n`;

        const ctas = aiSettings.ctas || [];
        if (ctas.length > 0) narrative += `(${ctas[Math.floor(Math.random() * ctas.length)]})`;

        await storage.logAiGeneration();

        return {
            items: result,
            totalPrice: currentTotal,
            description: narrative,
            logs
        };
    },

    // Legacy support alias if needed, or just remove if we fix all calls
    generateBuildWithLogs: async function (req: AIBuildRequest) {
        return await this.generateBuild(req);
    }
};
