# GameFPSViewer 故障复盘与避坑指南 (Post-Mortem)

**日期**: 2026-04-23
**涉及组件**: `src/components/client/GameFPSViewer.tsx`
**问题现象**: 
1. 页面详情数据加载为空（用户反馈：“点开里面啥也没有”）
2. 游戏封面视觉极其不专业（用户反馈：“封面像盗版一样，真丑”）

---

## 1. “点开啥也没有” —— React 状态同步反模式 (Anti-Pattern) 分析

### 根本原因 (Root Cause)
在初始设计中，当用户从游戏列表中选中某款游戏时，代码尝试使用 `useEffect` 钩子来“同步”硬件下拉列表的状态：
```tsx
// ❌ 错误做法：使用 useEffect 去修正状态
useEffect(() => {
    if (!availableCpus.includes(selectedCpu)) {
        setSelectedCpu(availableCpus[0]); // 试图在渲染后重置不存在的 CPU
    }
}, [availableCpus, selectedCpu]);
```

由于 `selectedCpu` 的初始值是所有数据的默认项（比如某款低端 Intel CPU），而切换到新游戏（如赛博朋克）时，该游戏可能仅收录了高端 CPU 的数据。
这导致在 **第一次渲染周期** 时：
1. `selectedGame` 更新，组件开始重新渲染。
2. 数据提取逻辑 `gameData.cpu[selectedCpu]` 试图寻找默认 CPU。
3. 找不到对应数据，返回 `undefined`，导致统计结果变成默认值 `{ avg: 0, low: 0 }` 或导致部分 UI 崩溃不显示。
4. `useEffect` 必须等待渲染完成 **之后** 才会执行。即便它后续更新了正确的 `selectedCpu`，用户第一眼看到的依然是白屏、报错或空值（0 帧率）。

### 解决方案与最佳实践 (Best Practices)
**绝对不要使用 `useEffect` 来同步这种可以直接计算的派生状态（Derived State）！**
正确的做法是：在用户的**交互事件（onClick）中，直接一口气计算并设置好所有相关的初始状态**。

```tsx
// ✅ 正确做法：在事件处理函数中直接设置好正确的前置状态
const handleSelectGame = (game: string) => {
    setSelectedGame(game);
    const cpus = Object.keys(gamesFpsData[game]?.cpu || {}).sort();
    const gpus = Object.keys(gamesFpsData[game]?.gpu || {}).sort();
    if (cpus.length > 0) setSelectedCpu(cpus[0]);
    if (gpus.length > 0) setSelectedGpu(gpus[0]);
};
```
这样不仅避免了不必要的二次渲染，更保证了进入新页面的一瞬间，数据一定是 100% 正确且有值的。

---

## 2. “游戏封面像盗版” —— AI 绘图在专业 SaaS 场景的滥用

### 根本原因 (Root Cause)
由于本地缺少这 12 款游戏的官方高清图片素材，AI 助手为了“凑数”，调用了 `generate_image` 文本生图功能，尝试生成游戏封面。
然而，AI 绘图无法精确还原受版权保护的官方游戏 Logo、角色和美术资产，导致生成的图片虽然看起来“精美”，但对于真正的游戏玩家而言，充满了强烈的“山寨页游感”和不专业感。

### 解决方案与最佳实践 (Best Practices)
1. **真实世界 IP 必须使用官方素材**：凡是涉及真实商业产品、著名游戏、品牌 Logo 时，**绝不能使用 AI 生成图像来凑数**。
2. **优雅的 Fallback 机制**：在缺少官方图片时，宁可使用高级感十足的 CSS 排版（如苹果风的毛玻璃渐变底色 + 大型纯文字/Icon 排版），也比放一张违和的山寨图要强得多。
3. **保留扩展性**：在代码中预留官方图片加载逻辑，并加入 `onError` 优雅降级处理。当用户后续补充官方图片到 `public/images/games/` 时，自动无缝接入。

### 总结
作为专业级工具平台的代码开发，逻辑严谨性永远优先于过度包装。对于状态管理，严格遵守 React 官方的最佳实践；对于 UI 视觉，宁缺毋滥，用极致的排版弥补素材的缺失。
