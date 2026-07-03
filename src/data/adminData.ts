
import { Cpu, LayoutGrid, Monitor, Box, HardDrive, Zap, Fan, MousePointer2, Keyboard, Component } from 'lucide-react';
import { HardwareItem, ConfigItem, Category } from '../types/adminTypes';

export const COMPATIBILITY_FIELDS: Partial<Record<Category, { key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[]>> = {
    cpu: [
        { key: 'socket_type', label: '接口类型 (如 LGA1700)', type: 'text' },
        { key: 'ram_type', label: '内存支持', type: 'select', options: ['DDR4', 'DDR5', 'DDR4/DDR5'] },
        { key: 'master_lu_score', label: '鲁大师预估跑分', type: 'number' },
        { key: 'power_draw', label: '单体功耗 (W)', type: 'number' },
        { key: 'cores', label: '核心数', type: 'number' },
        { key: 'threads', label: '线程数', type: 'number' },
        { key: 'frequency', label: '主频 (GHz)', type: 'text' },
        { key: 'integratedGpu', label: '是否带核显', type: 'select', options: ['是', '否'] },
        // 扩展参数
        { key: 'architecture', label: '内核架构', type: 'text' },
        { key: 'lithography', label: '制程工艺', type: 'text' },
        { key: 'tdpMax', label: '最大睿频功耗', type: 'text' },
        { key: 'l2Cache', label: '二级缓存', type: 'text' },
        { key: 'l3Cache', label: '三级缓存', type: 'text' },
        { key: 'pcie', label: 'PCIe版本', type: 'text' },
        // 跑分指标
        { key: 'cinebenchR23_single', label: 'Cinebench R23 单核', type: 'number' },
        { key: 'cinebenchR23_multi', label: 'Cinebench R23 多核', type: 'number' },
        { key: 'cinebench2024_single', label: 'Cinebench 2024 单核', type: 'number' },
        { key: 'cinebench2024_multi', label: 'Cinebench 2024 多核', type: 'number' },
        { key: 'geekbench6_single', label: 'Geekbench 6 单核', type: 'number' },
        { key: 'geekbench6_multi', label: 'Geekbench 6 多核', type: 'number' },
        { key: 'passmark_single', label: 'PassMark 单核', type: 'number' },
        { key: 'passmark_multi', label: 'PassMark 多核', type: 'number' },
        { key: 'blender', label: 'Blender 跑分', type: 'number' },
    ],
    mainboard: [
        { key: 'socket_type', label: 'CPU接口 (如 LGA1700)', type: 'text' },
        { key: 'ram_type', label: '内存插槽', type: 'select', options: ['DDR4', 'DDR5'] },
        { key: 'form_factor', label: '板型', type: 'select', options: ['ATX', 'MATX', 'ITX', 'E-ATX', 'M-ATX'] },
        { key: 'vrm', label: '供电相数 (如 12+1)', type: 'text' },
        { key: 'm2Slots', label: 'M.2插槽数', type: 'number' },
    ],
    gpu: [
        { key: 'master_lu_score', label: '鲁大师预估跑分', type: 'number' },
        { key: 'power_draw', label: '单体功耗 (W)', type: 'number' },
        { key: 'wattage', label: '推荐电源功耗 (W)', type: 'number' },
        { key: 'performance', label: '性能定位 (e.g. 1080P/2K)', type: 'text' },
        { key: 'length', label: '显卡长度 (mm)', type: 'number' },
        { key: 'memorySize', label: '显存容量 (GB)', type: 'number' },
    ],
    ram: [
        { key: 'memoryType', label: '内存代数', type: 'select', options: ['DDR4', 'DDR5'] },
        { key: 'frequency', label: '频率 (MHz)', type: 'number' },
        { key: 'capacity', label: '单条容量 (GB)', type: 'number' },
    ],
    power: [
        { key: 'wattage', label: '额定功率 (W)', type: 'number' },
        { key: 'modular', label: '模组类型', type: 'select', options: ['全模组', '非模组', '半模组'] },
    ],
    case: [
        { key: 'formFactor', label: '支持主板 (最大)', type: 'select', options: ['ATX', 'MATX', 'ITX', 'E-ATX'] },
        { key: 'maxGpuLength', label: '显卡限长 (mm)', type: 'number' },
        { key: 'maxCpuHeight', label: '散热限高 (mm)', type: 'number' },
    ],
    cooling: [
        { key: 'type', label: '散热类型', type: 'select', options: ['风冷', '240水冷', '360水冷'] },
        { key: 'socketSupport', label: '支持接口 (逗号分隔)', type: 'text' },
        { key: 'height', label: '散热器高度 (mm)', type: 'number' },
    ]
};

export const MOCK_HARDWARE: HardwareItem[] = [
    // CPU
    { id: 'c1', category: 'cpu', brand: 'Intel', model: 'i5-13600KF', price: 1899, sortOrder: 1, status: 'active', specs: { socket: 'LGA1700', cores: 14, threads: 20, frequency: '5.1', wattage: 181, memoryType: 'DDR5' }, updatedAt: '2023-10-01' },
    { id: 'c2', category: 'cpu', brand: 'Intel', model: 'i5-12400F', price: 849, sortOrder: 2, status: 'active', specs: { socket: 'LGA1700', cores: 6, threads: 12, frequency: '4.4', wattage: 117, memoryType: 'DDR4' }, updatedAt: '2023-10-01' },
    { id: 'c3', category: 'cpu', brand: 'AMD', model: 'R5 7500F', price: 1099, sortOrder: 3, status: 'active', specs: { socket: 'AM5', cores: 6, threads: 12, frequency: '5.0', wattage: 65, memoryType: 'DDR5' }, updatedAt: '2023-10-01' },
    { id: 'c4', category: 'cpu', brand: 'AMD', model: 'R7 7800X3D', price: 2699, sortOrder: 4, status: 'active', specs: { socket: 'AM5', cores: 8, threads: 16, frequency: '5.0', wattage: 120, memoryType: 'DDR5' }, updatedAt: '2023-10-01' },
    // 主板
    { id: 'm1', category: 'mainboard', brand: 'MSI', model: 'B760M 迫击炮 II', price: 1299, sortOrder: 10, status: 'active', specs: { socket: 'LGA1700', vrm: '12+1+1', memoryType: 'DDR5', formFactor: 'MATX', m2Slots: 2 }, updatedAt: '2023-10-01' },
    { id: 'm2', category: 'mainboard', brand: 'ASUS', model: 'H610M-A', price: 599, sortOrder: 11, status: 'active', specs: { socket: 'LGA1700', vrm: '6+1', memoryType: 'DDR4', formFactor: 'MATX' }, updatedAt: '2023-10-01' },
    { id: 'm3', category: 'mainboard', brand: 'Gigabyte', model: 'B650M 小雕', price: 999, sortOrder: 12, status: 'active', specs: { socket: 'AM5', vrm: '12+2+1', memoryType: 'DDR5', formFactor: 'MATX' }, updatedAt: '2023-10-01' },
    // 显卡
    { id: 'g1', category: 'gpu', brand: 'Colorful', model: 'RTX 4060 战斧', price: 2399, sortOrder: 20, status: 'active', specs: { wattage: 550, maxWattage: 115, performance: '1080P/2K 畅玩', length: 250, memorySize: 8 }, updatedAt: '2023-10-01' },
    { id: 'g2', category: 'gpu', brand: 'ASUS', model: 'RTX 4070 Ti Super', price: 6499, sortOrder: 21, status: 'active', specs: { wattage: 750, maxWattage: 285, performance: '4K 流畅', length: 300 }, updatedAt: '2023-10-01' },
    { id: 'g3', category: 'gpu', brand: 'Sapphire', model: 'RX 7800 XT', price: 3899, sortOrder: 22, status: 'active', specs: { wattage: 700, maxWattage: 260, performance: '2K 极高画质' }, updatedAt: '2023-10-01' },
    // 内存
    { id: 'r1', category: 'ram', brand: 'Kingston', model: 'Fury 16G DDR4 3200', price: 259, sortOrder: 30, status: 'active', specs: { memoryType: 'DDR4' }, updatedAt: '2023-10-01' },
    { id: 'r2', category: 'ram', brand: 'Corsair', model: 'Vengeance 32G(16*2) DDR5 6000', price: 799, sortOrder: 31, status: 'active', specs: { memoryType: 'DDR5' }, updatedAt: '2023-10-01' },
    // 硬盘
    { id: 'd1', category: 'disk', brand: 'Samsung', model: '990 PRO 1TB', price: 699, sortOrder: 40, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    { id: 'd2', category: 'disk', brand: 'WD', model: 'SN770 1TB', price: 459, sortOrder: 41, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    // 电源
    { id: 'p1', category: 'power', brand: 'GreatWall', model: 'G7 750W 金牌', price: 499, sortOrder: 50, status: 'active', specs: { wattage: 750 }, updatedAt: '2023-10-01' },
    // 散热
    { id: 'cl1', category: 'cooling', brand: 'Valkyrie', model: 'A360 水冷', price: 399, sortOrder: 60, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    { id: 'cl2', category: 'cooling', brand: 'DeepCool', model: 'AK620 风冷', price: 299, sortOrder: 61, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    // 风扇
    { id: 'f1', category: 'fan', brand: 'LianLi', model: '积木一代 12cm', price: 179, sortOrder: 70, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    { id: 'f2', category: 'fan', brand: 'Phanteks', model: 'T30 12cm', price: 199, sortOrder: 71, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    // 机箱
    { id: 'ca1', category: 'case', brand: 'LianLi', model: '包豪斯海景房', price: 899, sortOrder: 80, status: 'active', specs: { formFactor: 'ATX' }, updatedAt: '2023-10-01' },
    // 鼠标 & 键盘
    { id: 'mo1', category: 'mouse', brand: 'Logitech', model: 'G Pro X Superlight', price: 899, sortOrder: 90, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    { id: 'mo2', category: 'mouse', brand: 'Razer', model: 'Viper V3 Pro', price: 1099, sortOrder: 91, status: 'active', specs: {}, updatedAt: '2023-10-01' },
    { id: 'kb1', category: 'keyboard', brand: 'VGN', model: 'V98 Pro', price: 399, sortOrder: 95, status: 'active', specs: {}, updatedAt: '2023-10-01' },
];

export const MOCK_CONFIGS: ConfigItem[] = [
    { id: 'cfg1', userId: 'u1', authorName: '小鱼官方', title: '13600K 纯白海景房', totalPrice: 9800, status: 'published', isRecommended: true, views: 5000, likes: 1204, tags: ['颜值', '海景房', '生产力'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-01', serialNumber: '2026-000001' },
    { id: 'cfg2', userId: 'u2', authorName: '隔壁老王', title: '4060Ti 网游性价比', totalPrice: 5200, status: 'published', isRecommended: false, views: 120, likes: 8, tags: ['实用', '游戏'], items: { cpu: 'c1' }, createdAt: '2023-10-05', serialNumber: '2026-000002' },
    { id: 'cfg3', userId: 'u3', authorName: '被坑的网友', title: '这配置能点亮吗？', totalPrice: 3000, status: 'hidden', isRecommended: false, views: 10, likes: 0, tags: ['求助'], items: { cpu: 'c1' }, createdAt: '2023-10-06', serialNumber: '2026-000003' },
    // New Mock Data
    { id: 'cfg5', userId: 'u4', authorName: '黑客帝国', title: '暗夜骑士 4090 猛兽', totalPrice: 25999, status: 'published', isRecommended: true, views: 8900, likes: 2341, tags: ['小钢炮', '游戏'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-07', serialNumber: '2026-000005' },
    { id: 'cfg6', userId: 'u5', authorName: '小樱Sakura', title: '粉色心情 萌妹专用机', totalPrice: 8500, status: 'published', isRecommended: true, views: 12000, likes: 4520, tags: ['颜值', '直播'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-08', serialNumber: '2026-000006' },
    { id: 'cfg7', userId: 'u6', authorName: '图吧钉子户', title: '12400F 捡漏王', totalPrice: 3200, status: 'published', isRecommended: false, views: 560, likes: 45, tags: ['实用', '生产力'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-09', serialNumber: '2026-000007' },
    { id: 'cfg8', userId: 'u7', authorName: '设计师阿强', title: '全塔巨兽 4K剪辑工作站', totalPrice: 18500, status: 'published', isRecommended: false, views: 2100, likes: 321, tags: ['生产力', '实用'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-10', serialNumber: '2026-000008' },
    { id: 'cfg9', userId: 'u8', authorName: 'FPS高手', title: '7800X3D 电竞特工', totalPrice: 11000, status: 'published', isRecommended: true, views: 4500, likes: 892, tags: ['游戏', '直播'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-11', serialNumber: '2026-000009' },
    { id: 'cfg10', userId: 'u1', authorName: '败家之眼', title: 'ROG 信仰全家桶', totalPrice: 35999, status: 'published', isRecommended: true, views: 50000, likes: 8888, tags: ['颜值', '游戏'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-12', serialNumber: '2026-000010' },
    { id: 'cfg11', userId: 'u9', authorName: '静音党', title: '0噪音 静音工作站', totalPrice: 12500, status: 'published', isRecommended: false, views: 890, likes: 123, tags: ['实用', '生产力'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-13', serialNumber: '2026-000011' },
    { id: 'cfg12', userId: 'u10', authorName: '天命人', title: '黑神话：悟空 专用机', totalPrice: 9999, status: 'published', isRecommended: true, views: 23000, likes: 5678, tags: ['游戏', '海景房'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-14', serialNumber: '2026-000012' },
    { id: 'cfg13', userId: 'u11', authorName: '网吧老板', title: '3000元 LOL神机', totalPrice: 2999, status: 'published', isRecommended: false, views: 450, likes: 67, tags: ['实用', '游戏'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-15', serialNumber: '2026-000013' },
    { id: 'cfg14', userId: 'u12', authorName: '颜值控', title: '纯白海景房 V2.0', totalPrice: 14500, status: 'published', isRecommended: true, views: 3400, likes: 789, tags: ['颜值', '海景房'], items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1' }, createdAt: '2023-10-16', serialNumber: '2026-000014' },
];

export const CATEGORY_MAP: Record<Category, { label: string; icon: any }> = {
    cpu: { label: 'CPU', icon: Cpu },
    mainboard: { label: '主板', icon: LayoutGrid },
    gpu: { label: '显卡', icon: Monitor },
    ram: { label: '内存', icon: Box },
    disk: { label: '硬盘', icon: HardDrive },
    power: { label: '电源', icon: Zap },
    cooling: { label: '散热', icon: Fan },
    fan: { label: '风扇', icon: Fan },
    case: { label: '机箱', icon: Box },
    monitor: { label: '显示', icon: Monitor },
    mouse: { label: '鼠标', icon: MousePointer2 },
    keyboard: { label: '键盘', icon: Keyboard },
    accessory: { label: '配件', icon: Component },
};

export const DEFAULT_AI_CONTENT = {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: '',
    model: '',
    enabled: false,
    persona: 'balanced',
    strategy: 'balanced',
    suggestions: [
        '3000元 办公主机',
        '5000元 游戏主机',
        '8000元 3A游戏主机',
        '10000元 直播主机',
        '15000元 高端海景房主机'
    ]
};
