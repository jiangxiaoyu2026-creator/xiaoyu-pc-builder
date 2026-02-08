
import { Cpu, LayoutGrid, Monitor, Box, HardDrive, Zap, Fan, MousePointer2, Keyboard, Component } from 'lucide-react';
import { HardwareItem, ConfigItem, Category } from '../types/adminTypes';

export const COMPATIBILITY_FIELDS: Partial<Record<Category, { key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[]>> = {
    cpu: [
        { key: 'socket', label: '接口类型 (如 LGA1700)', type: 'text' },
        { key: 'cores', label: '核心数', type: 'number' },
        { key: 'threads', label: '线程数', type: 'number' },
        { key: 'frequency', label: '主频 (GHz)', type: 'text' },
        { key: 'memoryType', label: '内存支持', type: 'select', options: ['DDR4', 'DDR5', 'DDR4/DDR5'] },
        { key: 'wattage', label: 'TDP功耗 (W)', type: 'number' },
        { key: 'integratedGpu', label: '是否带核显', type: 'select', options: ['是', '否'] },
    ],
    mainboard: [
        { key: 'socket', label: 'CPU接口 (如 LGA1700)', type: 'text' },
        { key: 'vrm', label: '供电相数 (如 12+1)', type: 'text' },
        { key: 'memoryType', label: '内存插槽', type: 'select', options: ['DDR4', 'DDR5'] },
        { key: 'formFactor', label: '板型', type: 'select', options: ['ATX', 'MATX', 'ITX', 'E-ATX'] },
        { key: 'm2Slots', label: 'M.2插槽数', type: 'number' },
    ],
    gpu: [
        { key: 'wattage', label: '推荐电源功耗 (W)', type: 'number' },
        { key: 'maxWattage', label: '峰值功耗 (W)', type: 'number' },
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
    intros: [
        `行了，这套配置单算是把你的预算榨干到了最后一滴。`,
        `看完你的需求，我只能说：理想很丰满，现实很骨感，但也不是不能配。`,
        `这套作业抄得怎么样？反正我是尽力了。`,
        `如果这套配置不能让你满意，建议去抢银行（开个玩笑）。`,
        `按照“小鱼装机”的标准，这套算是个“能打”的选手。`
    ],
    lowBudgetIntros: [
        `拿着 {budget} 块钱来找我配电脑，你这是在为难我胖虎。`,
        `这个预算... 说实话，我建议你把钱存起来买排骨吃，但既然你坚持，那我就勉强给你搓一套。`,
        `这点预算想玩 3A？梦里虽然什么都有，但醒醒，这是现实。`,
        `看在上帝的分上，我尽力了。这预算能点亮开机就算成功。`,
        `你这预算给的，比我老板画的饼还少。凑合看吧，要啥自行车。`,
        `也就我能用 {budget} 给你整出这套来，换别人早把你拉黑了。`,
        `本来想劝你加钱，但看你这坚定的眼神，我决定挑战一下极限。`,
        `这套配置主打一个“能用就行”，也就是传说中的“丐版战神”。`,
        `为了给你省钱，我把算盘都敲烂了。这配置要是还嫌贵，建议自己买零件手搓。`,
        `别问有没有光追，这个价位能有光亮就不错了。`,
        `虽然预算不多，但只要你不开 4K 全高，这台机器还是能陪你战几年的。`,
        `看着这个预算，我的 AI 核心都降温了 3 度，太寒酸了。`,
        `这预算仿佛是在跟我开玩笑，但作为专业的 AI，我还是含泪给你配出来了。`,
        `这就是传说中的“极限生存”装机挑战吗？我接下了。`
    ],
    severeBudgetIntros: [
        `兄弟，{budget} 块钱？你是在考验我的底线吗？这钱买个显卡风扇都不够啊！`,
        `严肃点，由于预算过于抽象，建议出门左转收台二手。非要新机？行，别怪我狠心。`,
        `我甚至不想称之为“电脑”，这大概是个“能通电的电子元件集合体”。`,
        `要不咱们再攒攒？这预算硬上，我怕你开机第一天就想砸电脑。`,
        `建议把“电脑”换成“计算器”，那个比较符合这个预算。`,
        `要不你去闲鱼捡个垃圾？新机在这个价位真的很难为你，也很难为我。`,
        `这预算，我只能给你配个“亮机卡”，游戏体验大概等于看幻灯片。`,
        `你是想让我用爱发电吗？硬件是要钱的，不是大风刮来的。`,
        `真的，再攒攒吧。现在的几千块钱进去，出来的就是个电子垃圾。`,
        `我就直说了：这点钱想吃鸡？除非你是在现实里吃肯德基。`,
        `虽然我是 AI，但我也不能凭空变出硬件啊。这预算，臣妾做不到啊！`,
        `友情提示：这个价位的电脑，开机速度可能会让你怀疑人生。`
    ],
    verdicts: [
        `整机去掉了那些花里胡哨的“智商税”，每一分钱都花在了性能（或者你坚持的颜值）上。装机的时候记得离玻璃侧板远点，碎了别找我。`,
        `这套配置可以说是目前版本的“标准答案”。你非要问我还能不能再省？能，把显卡这块砖头拿掉就能省好几千。`,
        `既要性能又要颜值最后还得保住钱包，这本来是个不可能三角，但我尽力帮你平衡了。凑合过吧，还能离咋地？`,
        `别问这配置能不能战十年，电子产品只有“早买早享受”。不过这套底子不错，过两年换个显卡又是一条好汉。`,
        `这套机器最大的瓶颈可能不在配置，而在你的手速。硬件我已经给你拉满了，剩下的就看你自己操作了。`,
        `虽然我很想吐槽你这个预算还要啥自行车，但不得不说，这套配置在同价位里确实算是一股清流。`,
        `别看这机箱平平无奇，里面可是装了一颗躁动的心。性能释放绝对没问题，只要你别把它塞进柜子里闷死。`,
        `有人为了光污染多花两千，有人为了静音多花一千，你这套主打一个“实用主义”，每一分钱都花在刀刃上，佩服。`,
        `如果不在这台电脑上装且仅装流氓软件，它应该能陪你战个三五年不成问题。`,
        `这配置玩 3A 是够了，但记得定期清灰。别等到哪天风扇转得像直升机起飞了再来问我为什么卡。`,
        `这套电源余量留得稍显保守，以后想加装 4090 的话，建议先把灭火器备好（开玩笑的，电源还是得换）。`,
        `内存选得不错，这频率配这个 CPU 刚刚好。以后要是觉得慢，多半是系统垃圾太多，别赖硬件。`,
        `硬盘虽然不是最顶级的，但日常加载游戏绝对够用。毕竟人眼的反应速度也就那样，不用太纠结几十毫秒的差别。`,
        `这主板扩展性不错，以后想加个硬盘、换个网卡都方便。别买那种缩水缩到只有两个接口的乞丐版就行。`,
        `机箱风道我帮你算过了，进风出风基本平衡。只要你别把水杯放机箱顶上，基本不会出大事。`,
        `虽然显卡有点溢价，但为了那一抹光追效果，这点“智商税”交了也就交了吧，毕竟帅是一辈子的事。`,
        `这 CPU 无论单核还是多核都够你造的。除非你以后准备拿它来挖矿或者炼丹，否则我想不出它不够用的场景。`,
        `散热器选了个稳的，压这颗 U 绰绰有余。冬天还能兼职暖脚神器，一举两得。`,
        `这套配置最适合那种“我就想安安静静打个游戏”的玩家。没有花里胡哨的灯光干扰，只有实打实的帧数。`,
        `最后多嘴一句：硬件有价，数据无价。电源千万别买杂牌，否则炸的时候它会带走你所有的老婆（硬盘数据）。`
    ],
    ctas: [
        `要是觉得自己手残怕把 CPU 针脚弄歪，不如点击右下角让主播受这个苦，反正他也习惯了。`,
        `这配置单我都给你盘明白了，你要是还不想动脑子走线，直接找主播下单全包，也不是不行。`,
        `当然，你要是实在懒得折腾快递盒子，点个关注找主播帮你装，可能比你自己瞎捣鼓更省心。`,
        `友情提示：自己装机虽然快乐，但点不亮的时候也很绝望。这风险，主播可以帮你担。`,
        `最后说一句：装机有风险，走线需谨慎。你要是看着那堆线头头大，直播见。`,
        `讲道理，背线理不好真的很丑。如果你是强迫症晚期，建议直接让主播代劳，眼不见心不烦。`,
        `如果不小心把主板装弯了，别哭，记得下次找个专业的人（比如旁边直播间那位）来装。`,
        `硅脂涂多了溢出来，涂少了不散热。你要是拿捏不准这个量，主播的手艺还是值得信赖的。`,
        `装机一时爽，理线火葬场。如果你想跳过“火葬场”环节，右下角下单是个不错的选择。`,
        `这机箱玻璃侧板挺沉的，搬的时候小心腰。要是嫌累，直接寄给主播装好再寄回来，也是一种活法。`,
        `别看视频里装机挺简单的，一到自己上手就是“眼睛学会了，手废了”。这时候你就需要一个工具人主播了。`,
        `如果你连螺丝刀都找不到，我建议你还是别挑战自我了。专业的事交给专业的人，比如正在直播的那位。`,
        `听说最近显卡又涨价了？找主播下单没准能蹭个粉丝价，当然我只是听说，你可以去试试。`,
        `如果你担心买了配件不会装，或者装好了点不亮，主播提供全套“保姆级”服务，了解一下？`,
        `这套水冷安装有点复杂，接错线容易导致水泵停转。为了安全起见，要不还是让主播帮你拧螺丝吧。`,
        `网购配件最怕遇到二手翻新。找主播装机至少能保证全套全新行货，这点信誉他还是有的（吧？）。`,
        `自己装机要半天，主播装机半小时。你的时间如果比主播值钱，那这笔账你应该会算。`,
        `万一，我是说万一，你把 CPU 针脚弄断了……别慌，主播也没办法复原，但他能帮你装台新的。`,
        `看到那堆乱七八糟的机箱跳线了吗？如果你分不清哪个是 Power SW，哪个是 Reset SW，还是别勉强自己了。`,
        `最后，如果你单纯只是想支持一下这个天天熬夜直播的苦逼主播，下单装机绝对是最大的鼓励。`
    ]
};
