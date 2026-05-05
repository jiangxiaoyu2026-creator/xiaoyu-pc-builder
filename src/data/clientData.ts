
import { HardwareItem, ConfigTemplate, Category, BuildEntry } from '../types/clientTypes';

export const TAGS_APPEARANCE = ['实用', '颜值', '小钢炮', '海景房'];
export const TAGS_USAGE = ['游戏', '直播', '生产力'];
export const ALL_SCENARIO_TAGS = [...TAGS_APPEARANCE, ...TAGS_USAGE];

export const CATEGORY_MAP: Record<Category, string> = {
    cpu: 'CPU',
    mainboard: '主板',
    gpu: '显卡',
    ram: '内存',
    disk: '硬盘',
    power: '电源',
    cooling: '散热',
    fan: '风扇',
    case: '机箱',
    monitor: '显示',
    mouse: '鼠标',
    keyboard: '键盘',
    accessory: '配件',
};

export const HARDWARE_DB: HardwareItem[] = [
    // CPU
    { id: 'c1', category: 'cpu', brand: 'Intel', model: 'i5-13600KF', price: 1899, specs: { socket: 'LGA1700', wattage: 125, memoryType: 'DDR5' } },
    { id: 'c2', category: 'cpu', brand: 'Intel', model: 'i5-12400F', price: 849, specs: { socket: 'LGA1700', wattage: 65, memoryType: 'DDR4' } },
    { id: 'c3', category: 'cpu', brand: 'AMD', model: 'R5 7500F', price: 1099, specs: { socket: 'AM5', wattage: 65, memoryType: 'DDR5' } },
    { id: 'c4', category: 'cpu', brand: 'AMD', model: 'R7 7800X3D', price: 2699, specs: { socket: 'AM5', wattage: 120, memoryType: 'DDR5' } },
    // 主板
    { id: 'm1', category: 'mainboard', brand: 'MSI', model: 'B760M 迫击炮 II', price: 1299, specs: { socket: 'LGA1700', memoryType: 'DDR5', formFactor: 'MATX' } },
    { id: 'm2', category: 'mainboard', brand: 'ASUS', model: 'H610M-A', price: 599, specs: { socket: 'LGA1700', memoryType: 'DDR4', formFactor: 'MATX' } },
    { id: 'm3', category: 'mainboard', brand: 'Gigabyte', model: 'B650M 小雕', price: 999, specs: { socket: 'AM5', memoryType: 'DDR5', formFactor: 'MATX' } },
    // 显卡
    { id: 'g1', category: 'gpu', brand: 'Colorful', model: 'RTX 4060 战斧', price: 2399, specs: { wattage: 115 } },
    { id: 'g2', category: 'gpu', brand: 'ASUS', model: 'RTX 4070 Ti Super', price: 6499, specs: { wattage: 285 } },
    { id: 'g3', category: 'gpu', brand: 'Sapphire', model: 'RX 7800 XT', price: 3899, specs: { wattage: 260 } },
    // 内存
    { id: 'r1', category: 'ram', brand: 'Kingston', model: 'Fury 16G DDR4 3200', price: 259, specs: { memoryType: 'DDR4' } },
    { id: 'r2', category: 'ram', brand: 'Corsair', model: 'Vengeance 32G(16*2) DDR5 6000', price: 799, specs: { memoryType: 'DDR5' } },
    // 硬盘
    { id: 'd1', category: 'disk', brand: 'Samsung', model: '990 PRO 1TB', price: 699, specs: {} },
    { id: 'd2', category: 'disk', brand: 'WD', model: 'SN770 1TB', price: 459, specs: {} },
    // 电源
    { id: 'p1', category: 'power', brand: 'GreatWall', model: 'G7 750W 金牌', price: 499, specs: { wattage: 750 } },
    // 散热
    { id: 'cl1', category: 'cooling', brand: 'Valkyrie', model: 'A360 水冷', price: 399, specs: {} },
    { id: 'cl2', category: 'cooling', brand: 'DeepCool', model: 'AK620 风冷', price: 299, specs: {} },
    // 风扇
    { id: 'f1', category: 'fan', brand: 'LianLi', model: '积木一代 12cm', price: 179, specs: {} },
    { id: 'f2', category: 'fan', brand: 'Phanteks', model: 'T30 12cm', price: 199, specs: {} },
    // 机箱
    { id: 'ca1', category: 'case', brand: 'LianLi', model: '包豪斯海景房', price: 899, specs: { formFactor: 'ATX' } },
    // 鼠标
    { id: 'mo1', category: 'mouse', brand: 'Logitech', model: 'G Pro X Superlight', price: 899, specs: {} },
    { id: 'mo2', category: 'mouse', brand: 'Razer', model: 'Viper V3 Pro', price: 1099, specs: {} },
    // 键盘
    { id: 'kb1', category: 'keyboard', brand: 'VGN', model: 'V98 Pro', price: 399, specs: {} },
];

export const CONFIG_SQUARE_DB: ConfigTemplate[] = [
    {
        id: 'cfg1', title: '13600K 纯白海景房', author: '小鱼官方', avatarColor: 'bg-zinc-900', type: 'official',
        tags: [{ type: 'appearance', label: '颜值' }, { type: 'appearance', label: '海景房' }, { type: 'usage', label: '生产力' }],
        price: 9800, likes: 1204, views: 5000, comments: 45, date: '2023-10-01',
        items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1', ram: 'r2', disk: 'd1', power: 'p1', cooling: 'cl1', case: 'ca1', fan: 'f1' },
        serialNumber: '2026-000001'
    },
    {
        id: 'cfg2', title: '4060Ti 网游性价比', author: '隔壁老王', avatarColor: 'bg-blue-500', type: 'user',
        tags: [{ type: 'appearance', label: '实用' }, { type: 'usage', label: '游戏' }],
        price: 5200, likes: 89, views: 1200, comments: 12, date: '2023-10-05',
        items: { cpu: 'c2', mainboard: 'm2', gpu: 'g1', ram: 'r1', disk: 'd2', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000002'
    },
    {
        id: 'cfg3', title: '7800X3D 游戏神机', author: 'AMD YES', avatarColor: 'bg-purple-600', type: 'streamer',
        tags: [{ type: 'usage', label: '游戏' }, { type: 'appearance', label: '小钢炮' }],
        price: 12000, likes: 562, views: 3400, comments: 88, date: '2023-10-03',
        items: { cpu: 'c4', mainboard: 'm3', gpu: 'g2', ram: 'r2', disk: 'd1', power: 'p1', cooling: 'cl1', case: 'ca1' },
        serialNumber: '2026-000003'
    },
    {
        id: 'cfg4', title: '求助！5000元预算怎么配？', author: '装机小白', avatarColor: 'bg-amber-500', type: 'help',
        tags: [{ type: 'usage', label: '游戏' }, { type: 'appearance', label: '实用' }],
        price: 5000, likes: 12, views: 340, comments: 5, date: '2023-10-06',
        items: {},
    },
    // Mock Data Insertion
    {
        id: 'cfg5', title: '暗夜骑士 4090 猛兽', author: '黑客帝国', avatarColor: 'bg-stone-800', type: 'user',
        tags: [{ type: 'appearance', label: '小钢炮' }, { type: 'usage', label: '游戏' }],
        price: 25999, likes: 2341, views: 8900, comments: 156, date: '2023-10-07',
        items: { cpu: 'c1', mainboard: 'm1', gpu: 'g2', ram: 'r2', disk: 'd1', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000005'
    },
    {
        id: 'cfg6', title: '粉色心情 萌妹专用机', author: '小樱Sakura', avatarColor: 'bg-pink-500', type: 'user',
        tags: [{ type: 'appearance', label: '颜值' }, { type: 'usage', label: '直播' }],
        price: 8500, likes: 4520, views: 12000, comments: 342, date: '2023-10-08',
        items: { cpu: 'c2', mainboard: 'm2', gpu: 'g1', ram: 'r1', disk: 'd2', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000006'
    },
    {
        id: 'cfg7', title: '12400F 捡漏王', author: '图吧钉子户', avatarColor: 'bg-green-600', type: 'help',
        tags: [{ type: 'appearance', label: '实用' }, { type: 'usage', label: '生产力' }],
        price: 3200, likes: 45, views: 560, comments: 23, date: '2023-10-09',
        items: { cpu: 'c2', mainboard: 'm2', gpu: 'g3', ram: 'r1', disk: 'd2', power: 'p1' },
        serialNumber: '2026-000007'
    },
    {
        id: 'cfg8', title: '全塔巨兽 4K剪辑工作站', author: '设计师阿强', avatarColor: 'bg-blue-600', type: 'user',
        tags: [{ type: 'usage', label: '生产力' }, { type: 'appearance', label: '实用' }],
        price: 18500, likes: 321, views: 2100, comments: 45, date: '2023-10-10',
        items: { cpu: 'c1', mainboard: 'm1', gpu: 'g2', ram: 'r2', disk: 'd1', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000008'
    },
    {
        id: 'cfg9', title: '7800X3D 电竞特工', author: 'FPS高手', avatarColor: 'bg-red-600', type: 'streamer',
        tags: [{ type: 'usage', label: '游戏' }, { type: 'usage', label: '直播' }],
        price: 11000, likes: 892, views: 4500, comments: 89, date: '2023-10-11',
        items: { cpu: 'c4', mainboard: 'm3', gpu: 'g3', ram: 'r2', disk: 'd1', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000009'
    },
    {
        id: 'cfg10', title: 'ROG 信仰全家桶', author: '败家之眼', avatarColor: 'bg-red-700', type: 'official',
        tags: [{ type: 'appearance', label: '颜值' }, { type: 'usage', label: '游戏' }],
        price: 35999, likes: 8888, views: 50000, comments: 999, date: '2023-10-12',
        items: { cpu: 'c1', mainboard: 'm1', gpu: 'g2', ram: 'r2', disk: 'd1', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000010'
    },
    {
        id: 'cfg11', title: '0噪音 静音工作站', author: '静音党', avatarColor: 'bg-slate-500', type: 'user',
        tags: [{ type: 'appearance', label: '实用' }, { type: 'usage', label: '生产力' }],
        price: 12500, likes: 123, views: 890, comments: 12, date: '2023-10-13',
        items: { cpu: 'c2', mainboard: 'm2', gpu: 'g1', ram: 'r1', disk: 'd2', power: 'p1', cooling: 'cl2' },
        serialNumber: '2026-000011'
    },
    {
        id: 'cfg12', title: '黑神话：悟空 专用机', author: '天命人', avatarColor: 'bg-amber-600', type: 'official',
        tags: [{ type: 'usage', label: '游戏' }, { type: 'appearance', label: '海景房' }],
        price: 9999, likes: 5678, views: 23000, comments: 456, date: '2023-10-14',
        items: { cpu: 'c1', mainboard: 'm1', gpu: 'g1', ram: 'r2', disk: 'd1', power: 'p1', case: 'ca1' },
        serialNumber: '2026-000012'
    },
    {
        id: 'cfg13', title: '3000元 LOL神机', author: '网吧老板', avatarColor: 'bg-teal-600', type: 'user',
        tags: [{ type: 'appearance', label: '实用' }, { type: 'usage', label: '游戏' }],
        price: 2999, likes: 67, views: 450, comments: 8, date: '2023-10-15',
        items: { cpu: 'c2', mainboard: 'm2', gpu: 'g1', ram: 'r1', disk: 'd2', power: 'p1' },
        serialNumber: '2026-000013'
    },
    {
        id: 'cfg14', title: '纯白海景房 V2.0', author: '颜值控', avatarColor: 'bg-indigo-500', type: 'streamer',
        tags: [{ type: 'appearance', label: '颜值' }, { type: 'appearance', label: '海景房' }],
        price: 14500, likes: 789, views: 3400, comments: 67, date: '2023-10-16',
        items: { cpu: 'c1', mainboard: 'm1', gpu: 'g2', ram: 'r2', disk: 'd1', power: 'p1', case: 'ca1', fan: 'f1' },
        serialNumber: '2026-000014'
    },
];

export const DEFAULT_BUILD_TEMPLATE: BuildEntry[] = [
    { id: 'row-cpu', category: 'cpu', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-cool', category: 'cooling', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-mb', category: 'mainboard', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-ram', category: 'ram', item: null, quantity: 1, isLockedQty: false },
    { id: 'row-disk', category: 'disk', item: null, quantity: 1, isLockedQty: false },
    { id: 'row-gpu', category: 'gpu', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-case', category: 'case', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-power', category: 'power', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-fan', category: 'fan', item: null, quantity: 1, isLockedQty: false },
    { id: 'row-monitor', category: 'monitor', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-mouse', category: 'mouse', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-keyboard', category: 'keyboard', item: null, quantity: 1, isLockedQty: true },
    { id: 'row-accessory', category: 'accessory', item: null, quantity: 1, isLockedQty: true },
];

export const PROFIT_MARGIN = 0.06;
export const DISCOUNT_OPTIONS = [
    { label: '标准价格', value: 1.0 },
    { label: '粉丝专享 (99折)', value: 0.99 },
    { label: '老铁特惠 (98折)', value: 0.98 },
    { label: '老板骨折 (95折)', value: 0.95 },
];

export const QUICK_COMMENTS = ["这个配置不错👍", "学习了", "带带弟弟", "性价比很高", "显卡能换A卡吗？", "求作业链接"];
