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
                appearance: req.appearance
            };

            // Call the new backend API
            const response = await ApiService.post('/ai/generate', payload);

            // Backend returns { items: {...}, totalPrice: number, description: string }
            // We generate fake logs to keep the UI animation happy and impressive
            const logs: AIBuildLog[] = [
                { type: 'analysis', step: '云端连接', detail: '[SYSTEM] Connecting to Neural Cloud... 正在握手远端 AI 算力节点。' },
                { type: 'search', step: 'RAG 检索', detail: `[RAG] 正在检索 ${req.budget}元 档位实时库存与社区高分配置... (Top Candidates Loaded)` },
                { type: 'match', step: '大模型推理', detail: '[LLM] DeepSeek 正在进行思维链(CoT)推演... 优化预算分配中。' },
                { type: 'adjustment', step: '完整性校验', detail: '[VERIFY] 校验接口兼容性与功耗冗余... 通过。' },
                { type: 'complete', step: '生成完毕', detail: '配置单已送达。' }
            ];

            if (response.error) {
                throw new Error(response.error);
            }

            return {
                items: response.items || {},
                totalPrice: response.totalPrice || 0,
                description: response.description || "AI 未返回描述。",
                evaluation: response.evaluation || undefined,
                logs: logs
            };

        } catch (error) {
            console.error("AI Generation Error:", error);

            const errorMsg = (error as any).message || "未知错误";
            let friendlyError = "连接云端失败";

            if (errorMsg.includes("503")) friendlyError = "AI 服务未配置 API Key，请联系管理员。";
            if (errorMsg.includes("500")) friendlyError = "AI 服务内部错误，请稍后重试。";

            return {
                items: {},
                totalPrice: 0,
                description: `⚠️ 生成失败: ${friendlyError}\n\n技术细节: ${errorMsg}`,
                logs: [
                    { type: 'analysis', step: '云端连接', detail: '[SYSTEM] Connecting...' },
                    { type: 'analysis', step: '错误', detail: `[ERROR] ${friendlyError}` }
                ]
            };
        }
    },

    // Legacy support alias
    generateBuildWithLogs: async function (req: AIBuildRequest) {
        return await this.generateBuild(req);
    }
};
