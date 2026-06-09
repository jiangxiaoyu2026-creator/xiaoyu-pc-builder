import { HardwareItem, Category, BuildEntry } from '../types/clientTypes';
import { ApiService } from './api';

export interface AIBuildRequest {
    budget: number;
    usage: 'gaming' | 'work' | 'streaming';
    appearance: 'black' | 'white' | 'rgb';
    includeMonitor?: boolean;
    prompt?: string; // Added to carry original user prompt
}

export interface AIBuildLog {
    type: 'analysis' | 'search' | 'match' | 'adjustment' | 'complete';
    step: string;
    detail: string;
}

export interface AIEvaluation {
    score: number;
    verdict: string;
    pros: string[];
    cons: string[];
    summary: string;
}

export interface AIBuildResult {
    items: Partial<Record<Category, HardwareItem>>;
    totalPrice: number;
    description: string;
    evaluation?: AIEvaluation;
    requirementSummary?: {
        budget: number;
        usage: string;
        appearance: string;
        includeMonitor: boolean;
        requestedItems: { id: string; category: string; name: string }[];
    };
    checks?: {
        budget?: { ok: boolean; limit: number; actual: number };
        compatibility?: { ok: boolean; issues: string[] };
        requestedItems?: { ok: boolean; items: { id: string; category: string; name: string; kept: boolean }[] };
    };
    logs: AIBuildLog[];
}

export interface AIAnalysisResult {
    score: number;
    title: string;
    pros: string[];
    cons: string[];
    suggestions: string[];
}

export const aiBuilder = {
    parseRequest: (prompt: string): AIBuildRequest => {
        let budget = 6000; // Default
        let usage: AIBuildRequest['usage'] = 'gaming';
        let appearance: AIBuildRequest['appearance'] = 'black';
        let includeMonitor = false;

        // 1. Extract Budget - prefer numbers near budget keywords over hardware model numbers
        let budgetFound = false;
        // First: look for explicit budget patterns like "预算8000" / "8000元" / "8000块"
        const explicitMatch = prompt.match(/(?:预算|budget|花|出|控制在)\s*(\d{3,6})/i) 
            || prompt.match(/(\d{4,6})\s*(?:元|块|左右|以内|上下|的预算)/);
        if (explicitMatch) {
            budget = parseInt(explicitMatch[1]);
            budgetFound = true;
        }
        // Second: Chinese number keywords
        if (!budgetFound) {
            if (prompt.includes('一万')) { budget = 10000; budgetFound = true; }
            else if (prompt.includes('两万')) { budget = 20000; budgetFound = true; }
            else if (prompt.includes('三万')) { budget = 30000; budgetFound = true; }
            else if (prompt.includes('五千')) { budget = 5000; budgetFound = true; }
        }
        // Third: fallback to 4+ digit numbers (likely budget, not model numbers)
        if (!budgetFound) {
            const allNumbers = [...prompt.matchAll(/(\d{4,6})/g)].map(m => parseInt(m[1]));
            // Filter out obvious model numbers (like 14600, 5060, 7800 etc.)
            const budgetCandidates = allNumbers.filter(n => n >= 2000 && n <= 100000);
            if (budgetCandidates.length > 0) {
                // Pick the last one (usually budget comes after hardware specs)
                budget = budgetCandidates[budgetCandidates.length - 1];
            }
        }

        // 2. Extract Usage
        if (/(办公|设计|剪辑|渲染|生产力|代码|编程)/.test(prompt)) usage = 'work';
        if (/(直播|推流|录制|OBS)/.test(prompt)) usage = 'streaming';

        // 3. Extract Appearance
        if (/(白|海景|雪|纯白)/.test(prompt)) appearance = 'white';
        else if (/(灯|光|RGB|炫|跑马灯)/.test(prompt)) appearance = 'rgb';

        // 4. Detect Monitor
        if (/(显示器|屏幕|带屏)/.test(prompt)) includeMonitor = true;

        return { budget, usage, appearance, includeMonitor, prompt };
    },

    // Keep this for VisualBuilder compatibility if used
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
        try {
            // Call Backend
            const payload = {
                prompt: req.prompt || `预算${req.budget}元，用途${req.usage}，外观${req.appearance}`,
                budget: req.budget,
                usage: req.usage,
                appearance: req.appearance,
                includeMonitor: Boolean(req.includeMonitor)
            };

            // Call the new backend API
            const response = await ApiService.post('/ai/generate', payload);

            // Backend returns the verified build. Logs are UI progress labels, not claims about model internals.
            const logs: AIBuildLog[] = [
                { type: 'analysis', step: '需求解析', detail: '正在提取预算、用途、外观偏好和点名配件。' },
                { type: 'search', step: '库存召回', detail: `正在检索 ${req.budget} 元档位的可用硬件候选。` },
                { type: 'match', step: '方案生成', detail: '正在组合满足预算和用途的配置方案。' },
                { type: 'adjustment', step: '规则校验', detail: '正在校验接口、内存、机箱尺寸和电源冗余。' },
                { type: 'complete', step: '生成完毕', detail: '配置单已生成。' }
            ];

            if (response.error) {
                throw new Error(response.error);
            }

            // Validate: check if any actual hardware was returned
            const items = response.items || {};
            const hasAnyItem = Object.values(items).some((v: any) => v && typeof v === 'object' && v.id);
            if (!hasAnyItem) {
                return {
                    items: {},
                    totalPrice: 0,
                    description: '⚠️ AI 未能在当前库存中找到匹配的硬件。请尝试调整预算或简化需求描述后重试。',
                    logs: [
                        { type: 'analysis' as const, step: '库存匹配', detail: '[WARN] 当前库存中没有找到满足您需求的配件组合。' }
                    ]
                };
            }

            return {
                items,
                totalPrice: response.totalPrice || 0,
                description: response.description || "AI 未返回描述。",
                evaluation: response.evaluation || undefined,
                requirementSummary: response.requirementSummary || undefined,
                checks: response.checks || undefined,
                logs: logs
            };

        } catch (error) {
            console.error("AI Generation Error:", error);

            const errorMsg = (error as any).message || "未知错误";
            let friendlyError = "连接云端失败";

            if (errorMsg.includes("503") || errorMsg.includes("Service Unavailable")) {
                friendlyError = "AI 服务未配置或配置有误，请在后台检查 API Key。";
            } else if (errorMsg.includes("500") || errorMsg.includes("Internal Server Error")) {
                friendlyError = "AI 服务内部错误或模型连接失败，请联系管理员检查后端日志。";
            } else if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
                friendlyError = "AI 服务授权失败，API Key 可能已过期或无效。";
            }

            return {
                items: {},
                totalPrice: 0,
                description: `⚠️ 生成失败: ${friendlyError}\n\n技术细节: ${errorMsg}`,
                logs: [
                    { type: 'analysis', step: '云端连接', detail: '[SYSTEM] Connecting...' },
                    { type: 'analysis', step: '错误', detail: `[ERROR] ${friendlyError} | 详情: ${errorMsg}` }
                ]
            };
        }
    },

    // Legacy support alias
    generateBuildWithLogs: async function (req: AIBuildRequest) {
        return await this.generateBuild(req);
    }
};
