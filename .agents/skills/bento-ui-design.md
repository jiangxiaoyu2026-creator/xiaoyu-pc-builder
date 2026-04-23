# 技能：Bento UI / 模块化设计系统

## 触发条件
当用户要求优化页面布局、创建仪表盘、优化视觉层级、创建 Landing Page 或提及 "Bento" 设计风格时，执行此技能。

## 核心设计原则

### 1. 模块化层级（Modular Hierarchy）
- 使用 CSS Grid 构建基础布局，推荐 4 列或 12 列基准网格
- 通过 `grid-column: span X` / `grid-row: span Y` 控制模块优先级
- 大模块（Hero Card）= 高优先级内容，小模块 = 辅助信息
- 每个视图的模块总数控制在 **6–12 个**之间，避免视觉噪音

### 2. 间距一致性（Consistent Spacing）
- 所有模块之间保持统一间距（推荐 `gap: 16px` 即 `gap-4`）
- 严禁出现不同间距混用的情况
- 配合内边距使用 `p-5` / `p-6` 保持内容呼吸感

### 3. 视觉统一性（Visual Uniformity）
- **圆角**：所有容器统一使用 `rounded-2xl`（16px）或 `rounded-3xl`（24px）
- **边框**：使用 `border border-slate-200/60 dark:border-slate-800` 统一外框
- **背景**：遵循 glassmorphism 风格 `bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl`
- **阴影**：`shadow-[0_8px_30px_rgb(0,0,0,0.04)]` 营造漂浮感

### 4. 平衡与节奏（Balance & Rhythm）
- 非对称布局要保持整体视觉重心平衡
- 交替使用大 / 中 / 小模块产生韵律感
- 关键数据使用超大字号（text-4xl ~ text-6xl）+ 辅助标签（text-xs）形成对比

### 5. 响应式适配（Responsive Adaptability）
- Mobile-first 设计：手机端所有模块堆叠为单列
- 平板（md）：2 列网格
- 桌面（lg/xl）：4 列完整 Bento 布局
- 使用 `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` 实现自动重排

---

## 模块化组件规范

### 标准 Bento 卡片模板
```tsx
<div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-lg transition-all duration-300">
    {/* 装饰背景 */}
    <div className="absolute -right-8 -bottom-8 opacity-5 text-indigo-500">
        <IconComponent size={80} />
    </div>
    {/* 内容区域 */}
    <div className="relative z-10">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <IconComponent size={14} className="text-indigo-500" />
            模块标题
        </h3>
        <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
            核心数据
        </div>
    </div>
</div>
```

### 尺寸变体
| 变体 | Grid Span | 适用内容 |
|------|-----------|----------|
| Hero | `col-span-2 row-span-2` | 核心仪表盘、主要可视化 |
| Wide | `col-span-2` | 趋势图表、进度条 |
| Tall | `row-span-2` | 垂直列表、排行榜 |
| Standard | `col-span-1` | 单一数据点、快捷操作 |

### 反模式（Anti-Patterns）
- ❌ 不要创建所有模块等大的网格（等大=无层级=无重心）
- ❌ 不要超过 12 个模块（信息过载）
- ❌ 不要混用不同圆角值
- ❌ 不要在模块内嵌套过深（最多 2 层嵌套）
- ❌ 不要使用纯白背景（要有微透明 + 毛玻璃效果）

---

## 动效建议（配合 Framer Motion）
- 模块入场：`staggerChildren: 0.05`，子项 `y: 20 → 0` + `opacity: 0 → 1`
- Hover 反馈：`whileHover={{ y: -4, scale: 1.01 }}` 轻微上浮
- 数据变化：使用 `BouncyNumber` 组件实现弹簧计数动画
- 布局切换：`layout` + `AnimatePresence` 实现无缝过渡

## CSS Grid 推荐结构
```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
}

@media (max-width: 1024px) {
    .bento-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
    .bento-grid { grid-template-columns: 1fr; }
}
```
