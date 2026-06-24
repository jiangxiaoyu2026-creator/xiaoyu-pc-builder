import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Button, Image, Input, Canvas } from '@tarojs/components'
import Taro, { useShareAppMessage, useDidShow, useDidHide } from '@tarojs/taro'
import { getConfigs, getProductsBatch, getProducts, createConfig, updateConfig, getSettings, toggleConfigLike, getConfigComments, addConfigComment } from '../../services/api'
import { getItemFilterTag, getItemSpecSummary, getMonitorSize, getMonitorRefresh } from '../../utils/filterHelpers'
import { gamesList, gamesFpsData, Resolution } from '../../data/gameFpsData'
import { PixelIcons } from '../../utils/pixelIcons'
import './index.scss'

// ==========================================
// 基础数据定义
// ==========================================
const SORT_OPTIONS = [
  { label: '综合推荐', value: 'recommend' },
  { label: '热门方案', value: 'hot' },
  { label: '最新上架', value: 'new' },
]

const BUDGET_FILTERS = [
  { label: '全部', min: undefined, max: undefined },
  { label: '3000内', min: undefined, max: 3000 },
  { label: '3k-5k', min: 3000, max: 5000 },
  { label: '5k-8k', min: 5000, max: 8000 },
  { label: '8k以上', min: 8000, max: undefined },
]

export const CATEGORY_MAP: Record<string, string> = {
  cpu: 'CPU',
  cooling: '散热',
  mainboard: '主板',
  ram: '内存',
  disk: '硬盘',
  gpu: '显卡',
  case: '机箱',
  power: '电源',
  fan: '风扇',
  monitor: '显示器',
  peripheral: '外设',
  accessory: '配件',
}

const DIY_SLOTS = [
  { id: 'cpu', category: 'cpu', icon: 'icon-cpu' },
  { id: 'cooling', category: 'cooling', icon: 'icon-cooler' },
  { id: 'mainboard', category: 'mainboard', icon: 'icon-motherboard' },
  { id: 'ram', category: 'ram', icon: 'icon-ram' },
  { id: 'disk', category: 'disk', icon: 'icon-disk' },
  { id: 'gpu', category: 'gpu', icon: 'icon-gpu' },
  { id: 'case', category: 'case', icon: 'icon-case' },
  { id: 'power', category: 'power', icon: 'icon-psu' },
  { id: 'fan', category: 'fan', icon: 'icon-fan' },
  { id: 'monitor', category: 'monitor', icon: 'icon-monitor' },
  { id: 'peripheral', category: 'peripheral', icon: 'icon-peripheral' },
]

type Mode = 'diy' | 'list'

interface HardwareItem {
  id: string
  category: string
  brand: string
  model: string
  price: number
  image?: string
  specs?: any
  isRecommended?: boolean
  isDiscount?: boolean
}

interface BuildSlot {
  id: string
  category: string
  item: HardwareItem | null
  quantity: number
  customName?: string
  customPrice?: number
}

// 初始化装机清单
const initBuildList = (): BuildSlot[] => DIY_SLOTS.map(s => ({
  id: s.id,
  category: s.category,
  item: null,
  quantity: 1
}))

// ==========================================
// 鲁大师跑分智能提取与预估算法
// ==========================================
const getLudashiScore = (item: HardwareItem | null, category: string): number => {
  if (!item) return 0;
  
  // 1. 优先尝试从 specs 读取真实跑分 (CPU, GPU 优先走这里)
  let specsObj: any = {};
  if (item.specs) {
    try {
      specsObj = typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs;
      const score = Number(specsObj.ludashi) || Number(specsObj['鲁大师']) || Number(specsObj['跑分']);
      if (!isNaN(score) && score > 0) return score;
    } catch (e) {
      // ignore
    }
  }

  // 2. CPU和显卡要求只用真实数据，如果缺失则直接返回0
  if (category === 'cpu' || category === 'gpu') return 0;

  // 3. 内存跑分参数化估算
  if (category === 'ram') {
    const text = `${item.model} ${item.brand} ${JSON.stringify(specsObj)}`.toUpperCase();
    let score = 40000; // 默认 DDR4 基础分
    let perGb = 3000;
    
    if (text.includes('DDR5')) {
      score = 80000;
      perGb = 4000;
    } else if (text.includes('DDR3')) {
      score = 20000;
      perGb = 1500;
    }

    // 提取容量 (支持如 16G, 32G, 8G*2)
    let totalGb = 16; // 默认 16GB
    const multiMatch = text.match(/(\d+)G\s*\*\s*(\d+)/);
    if (multiMatch) {
      totalGb = parseInt(multiMatch[1]) * parseInt(multiMatch[2]);
    } else {
      const singleMatch = text.match(/(\d+)G/);
      if (singleMatch) totalGb = parseInt(singleMatch[1]);
    }
    
    return score + totalGb * perGb;
  }

  // 4. 硬盘跑分参数化估算
  if (category === 'disk') {
    const text = `${item.model} ${item.brand} ${JSON.stringify(specsObj)}`.toUpperCase();
    let score = 100000; // 默认 PCIe 3.0 (Gen3) 基础分
    
    if (text.includes('PCIE 5.0') || text.includes('GEN5')) {
      score = 300000;
    } else if (text.includes('PCIE 4.0') || text.includes('GEN4') || text.includes('4.0')) {
      score = 180000;
    } else if (text.includes('SATA')) {
      score = 40000;
    }

    // 提取容量
    let totalGb = 1000; // 默认 1TB
    if (text.match(/(\d+)\s*T/)) {
      totalGb = parseInt(text.match(/(\d+)\s*T/)![1]) * 1000;
    } else if (text.match(/(\d+)\s*G/)) {
      totalGb = parseInt(text.match(/(\d+)\s*G/)![1]);
    }
    
    return score + totalGb * 20;
  }

  // 其他配件无独立跑分
  return 0;
}

export default function BuilderPage() {
  const [mode, setMode] = useState<Mode>('diy')
  const [buildList, setBuildList] = useState<BuildSlot[]>(() => {
    try {
      const draft = Taro.getStorageSync('draft_build')
      if (draft && Array.isArray(draft) && draft.length === DIY_SLOTS.length) {
        return draft
      }
    } catch (e) {}
    return initBuildList()
  })

  // ==========================================
  // 全局定价与优惠策略
  // ==========================================
  const [pricingStrategy, setPricingStrategy] = useState<any>(null)
  const [discountRate, setDiscountRate] = useState<number>(1.0)
  const [discountName, setDiscountName] = useState<string>('标准售价')

  useEffect(() => {
    getSettings().then(res => {
      if (res && res.pricingStrategy) {
        setPricingStrategy(res.pricingStrategy)
        // 尝试从缓存中恢复用户的优惠选择
        try {
          const savedDiscount = Taro.getStorageSync('xiaoyu_discount')
          if (savedDiscount && res.pricingStrategy.discountTiers) {
            const found = res.pricingStrategy.discountTiers.find((t: any) => t.multiplier === savedDiscount.rate)
            if (found) {
              setDiscountRate(found.multiplier)
              setDiscountName(found.name)
            }
          }
        } catch(e) {}
      }
    }).catch(console.error)
  }, [])

  // ==========================================
  // 防丢失：自动保存配置草稿
  // ==========================================
  useEffect(() => {
    const timer = setTimeout(() => {
      Taro.setStorageSync('draft_build', buildList)
    }, 500)
    return () => clearTimeout(timer)
  }, [buildList])

  // ==========================================
  // BottomSheet 选件库状态
  // ==========================================
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sheetCategory, setSheetCategory] = useState<string | null>(null)
  const [sheetItems, setSheetItems] = useState<HardwareItem[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetSearch, setSheetSearch] = useState('')
  const [sheetBrand, setSheetBrand] = useState<string>('all')
  const [sheetCapacity, setSheetCapacity] = useState<string>('all')
  const [sheetSize, setSheetSize] = useState<string>('all')
  const [sheetRefresh, setSheetRefresh] = useState<string>('all')
  const [sheetSort, setSheetSort] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [displayCount, setDisplayCount] = useState(20)

  // Detail Modal State (Same as Home)
  const [detailConfig, setDetailConfig] = useState<any | null>(null)
  const [detailItems, setDetailItems] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  // Product specs popup
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [productPopupVisible, setProductPopupVisible] = useState(false)

  useEffect(() => {
    setDisplayCount(20)
  }, [sheetSearch, sheetBrand, sheetCapacity, sheetSize, sheetRefresh, sheetSort, sheetCategory])

  // ==========================================
  // 云端方案列表状态
  // ==========================================
  const [configs, setConfigs] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [sortBy, setSortBy] = useState('recommend')
  const [budgetIdx, setBudgetIdx] = useState(0)
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  
  // ==========================================
  // 海报生成状态
  // ==========================================
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [posterTempPath, setPosterTempPath] = useState('')

  // ==========================================
  // 性能与弹窗状态
  // ==========================================
  const [selectedRes, setSelectedRes] = useState<Resolution>('1080p')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [configTitle, setConfigTitle] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 动态计算 ScrollView 可用高度（修复小程序 scroll-view height:0 黑屏问题）
  const [scrollHeight, setScrollHeight] = useState(0)
  useEffect(() => {
    setTimeout(() => {
      const sys = Taro.getSystemInfoSync()
      const query = Taro.createSelectorQuery()
      query.select('.top-header-bar').boundingClientRect((rect: any) => {
        const headerH = rect ? rect.height : 90
        setScrollHeight(sys.windowHeight - headerH)
      }).exec()
    }, 150)
  }, [])

  useShareAppMessage(() => ({
    title: '小鱼高级辅助装机系统',
    path: '/pages/builder/index'
  }))

  // ==========================================
  // 监听跨页面的 “一键应用” 配置数据
  // ==========================================
  useDidShow(() => {
    // 检查是否有从全局传递过来的需要加载的配置数据
    const app = Taro.getApp()
    if (app && app.globalData && app.globalData.loadConfig) {
      const configToLoad = app.globalData.loadConfig
      app.globalData.loadConfig = null // 消费后清除
      
      Taro.showLoading({ title: '加载配置中...' })
      
      // 解析配件ID并拉取详情回填
      const itemsMap = configToLoad.items || {}
      const idsToFetch: string[] = []
      
      Object.values(itemsMap).forEach((val: any) => {
        if (typeof val === 'string') idsToFetch.push(val)
        else if (val?.id) idsToFetch.push(val.id)
      })

      if (idsToFetch.length > 0) {
        getProductsBatch(idsToFetch).then((res: any) => {
          const products = Array.isArray(res) ? res : (res?.items || res?.results || res?.data || [])
          if (Array.isArray(products) && products.length > 0) {
            const newBuild = initBuildList()
            products.forEach(p => {
              const slot = newBuild.find(s => s.category === p.category)
              if (slot) {
                slot.item = p
                // 如果有数量信息可以继续扩展
              }
            })
            setBuildList(newBuild)
            setMode('diy')
            Taro.hideLoading()
            Taro.showToast({ title: '已应用配置', icon: 'success' })
          } else {
             Taro.hideLoading()
             Taro.showToast({ title: '加载失败', icon: 'error' })
          }
        }).catch(() => {
          Taro.hideLoading()
          Taro.showToast({ title: '加载失败', icon: 'error' })
        })
      } else {
        Taro.hideLoading()
        Taro.showToast({ title: '该配置无配件信息', icon: 'none' })
      }
    }
  })

  // 隐藏/显示底部导航栏
  useDidShow(() => {
    Taro.hideTabBar({ animation: true }).catch(() => {})
  })
  
  useDidHide(() => {
    Taro.showTabBar({ animation: true }).catch(() => {})
  })

  // 展开配置单抽屉==========================================
  // 计算属性
  // ==========================================
  const totalPricing = useMemo(() => {
    let total = 0
    let powerDraw = 0
    let ludashiScore = 40000 // 基础平台分（主板、外设等综合跑分垫底值）
    
    buildList.forEach(slot => {
      const price = slot.customPrice ?? (slot.item?.price ?? 0)
      total += price * slot.quantity

      if (slot.item) {
        // 累加鲁大师跑分
        ludashiScore += getLudashiScore(slot.item, slot.category) * slot.quantity

        if (slot.category !== 'power' && slot.item.specs) {
          let specsObj = slot.item.specs
          if (typeof specsObj === 'string') {
            try { specsObj = JSON.parse(specsObj) } catch { specsObj = {} }
          }
          const w = specsObj.wattage || specsObj.tdp || 0
          powerDraw += Number(w) * slot.quantity
        }
      }
    })
    
    // 如果没有任何核心配件，跑分归零
    if (total === 0) ludashiScore = 0

    // ==========================================
    // 动态价格计算引擎 (Dynamic Pricing Engine)
    // ==========================================
    const feeRate = pricingStrategy?.serviceFeeRate ?? 0.06
    const baseWithFee = Math.floor(total * (1 + feeRate))
    const finalPrice = Math.floor(baseWithFee * discountRate)

    return {
      hardwareTotal: total,
      baseWithFee: baseWithFee,
      price: finalPrice,
      power: powerDraw,
      suggestedPower: Math.ceil((powerDraw * 1.3) / 50) * 50, // 预留30%余量并向上取整50的倍数
      score: ludashiScore
    }
  }, [buildList, pricingStrategy, discountRate])

  const compInfo = useMemo(() => {
    const getSpecs = (cat: string) => {
      const item = buildList.find(s => s.category === cat)?.item
      if (!item || !item.specs) return null
      let specsObj = item.specs
      if (typeof specsObj === 'string') {
        try { specsObj = JSON.parse(specsObj) } catch { specsObj = {} }
      }
      return specsObj
    }

    const cpu = getSpecs('cpu')
    const mb = getSpecs('mainboard')
    const ram = getSpecs('ram')
    const power = getSpecs('power')

    // 提取电源额定功率
    let psuWattage = 0
    if (power) {
       psuWattage = Number(power.wattage || 0)
       if (!psuWattage) {
          // 尝试从 model 中提取
          const powerItem = buildList.find(s => s.category === 'power')?.item
          const wMatch = (powerItem?.model || '').match(/(\d+)W/i)
          if (wMatch) psuWattage = parseInt(wMatch[1], 10)
       }
    }

    return {
      cpuMb: (!cpu || !mb) ? '未知' : (cpu.socket === mb.socket ? '通过' : '不兼容'),
      ramMb: (!ram || !mb) ? '未知' : (ram.memoryType === mb.memoryType ? '通过' : '不兼容'),
      powerReq: !power ? '未知' : (psuWattage >= totalPricing.suggestedPower ? '充足' : '偏低'),
    }
  }, [buildList, totalPricing.suggestedPower])

  const currentFps = useMemo(() => {
    const cpuItem = buildList.find(s => s.category === 'cpu')?.item
    const gpuItem = buildList.find(s => s.category === 'gpu')?.item

    if (!cpuItem && !gpuItem) return null

    const matchKey = (item: any, type: 'cpu' | 'gpu') => {
      if (!item) return null;
      const rawModel = item.model.toUpperCase();
      const modelStr = `${item.brand} ${item.model}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const modelOnly = rawModel.replace(/[^A-Z0-9]/g, '');
      const canUseKey = (key: string) => {
        const upperKey = key.toUpperCase();
        if (type === 'gpu' && /\b[45]090D\b|RTX\s*[45]090D/.test(rawModel) && !/\b[45]090\s*D\b/.test(upperKey)) return false;
        if (type === 'cpu' && /13400EF/.test(rawModel) && !/13400EF|13400F/.test(upperKey)) return false;
        return true;
      };
      
      for (const game of Object.keys(gamesFpsData)) {
          const entries = Object.keys(gamesFpsData[game][type] || {});
          for (const key of entries) {
              const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
              if (modelStr.includes(cleanKey) || cleanKey.includes(modelStr) || modelOnly.includes(cleanKey) || cleanKey.includes(modelOnly)) {
                  if (canUseKey(key)) return key;
              }
          }
      }
      
      if (type === 'cpu') {
          const match = rawModel.match(/\d{4,5}[A-Z]{0,3}/);
          if (match) {
              const identifier = match[0];
              for (const game of Object.keys(gamesFpsData)) {
                  const entries = Object.keys(gamesFpsData[game][type] || {});
                  for (const key of entries) {
                      if (key.toUpperCase().includes(identifier) && canUseKey(key)) return key;
                  }
              }
              const numMatch = identifier.match(/\d+/);
              if (numMatch) {
                  for (const game of Object.keys(gamesFpsData)) {
                      const entries = Object.keys(gamesFpsData[game][type] || {});
                      for (const key of entries) {
                          if (key.toUpperCase().includes(numMatch[0]) && canUseKey(key)) return key;
                      }
                  }
              }
          }
      }
      
      if (type === 'gpu') {
          const numMatch = item.model.match(/\d{4}/);
          if (numMatch) {
              const num = numMatch[0];
              const isTi = /TI/i.test(item.model);
              const isSuper = /SUPER/i.test(item.model);
              const isXTX = /XTX/i.test(item.model);
              const isXT = /XT\b/i.test(item.model) && !isXTX;
              const isGRE = /GRE/i.test(item.model);
              
              for (const game of Object.keys(gamesFpsData)) {
                  const entries = Object.keys(gamesFpsData[game][type] || {});
                  for (const key of entries) {
                      const upperKey = key.toUpperCase();
                      if (upperKey.includes(num)) {
                          const keyTi = /TI/i.test(upperKey);
                          const keySuper = /SUPER/i.test(upperKey);
                          const keyXTX = /XTX/i.test(upperKey);
                          const keyXT = /XT\b/i.test(upperKey) && !keyXTX;
                          const keyGRE = /GRE/i.test(upperKey);
                          
                          if (isTi === keyTi && isSuper === keySuper && isXTX === keyXTX && isXT === keyXT && isGRE === keyGRE) {
                              if (canUseKey(key)) return key;
                          }
                      }
                  }
              }
              for (const game of Object.keys(gamesFpsData)) {
                  const entries = Object.keys(gamesFpsData[game][type] || {});
                  for (const key of entries) {
                      if (key.toUpperCase().includes(num) && canUseKey(key)) return key;
                  }
              }
          }
      }
      
      return null;
    }

    const cpuKey = matchKey(cpuItem, 'cpu')
    const gpuKey = matchKey(gpuItem, 'gpu')

    const results = []
    const preferredGames = ["黑神话：悟空", "赛博朋克 2077", "荒野大镖客：救赎 2", "三角洲行动", "反恐精英 2", "无畏契约", "绝地求生", "Apex 英雄", "刀塔 2", "守望先锋 2"];

    for (const gameName of preferredGames) {
      const gd = gamesFpsData[gameName]
      if (!gd) continue

      const cData = cpuKey ? gd.cpu[cpuKey]?.[selectedRes] : null
      const gData = gpuKey ? gd.gpu[gpuKey]?.[selectedRes] : null

      if (cData && gData) {
          results.push({ game: gameName, avg: Math.min(cData.avg, gData.avg), low: Math.min(cData.low || 0, gData.low || 0) });
      } else if (gData) {
          results.push({ game: gameName, avg: gData.avg, low: gData.low || 0 });
      } else if (cData) {
          results.push({ game: gameName, avg: cData.avg, low: cData.low || 0 });
      }
    }
    
    // Fallback: If no results found with preferred games, try first 5 games
    if (results.length === 0) {
      for (const gameName of gamesList.slice(0, 5)) {
        const gd = gamesFpsData[gameName]
        if (!gd) continue
        const cData = cpuKey ? gd.cpu[cpuKey]?.[selectedRes] : null
        const gData = gpuKey ? gd.gpu[gpuKey]?.[selectedRes] : null
        if (cData && gData) {
            results.push({ game: gameName, avg: Math.min(cData.avg, gData.avg), low: Math.min(cData.low || 0, gData.low || 0) });
        }
      }
    }

    // Limit to 3 items on mini program for space reasons
    return results.length > 0 ? results.slice(0, 3) : null
  }, [buildList, selectedRes])

  // ==========================================
  // 方法
  // ==========================================
  const handleUpdateSlot = (id: string, updates: Partial<BuildSlot>) => {
    setBuildList(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const handleEditPrice = (slotId: string, currentPrice: number) => {
    (Taro.showModal as any)({
      title: '修改实际购入价',
      editable: true,
      placeholderText: `当前价格: ¥${currentPrice}`,
      success: (res: any) => {
        if (res.confirm && res.content) {
          const val = parseFloat(res.content)
          if (!isNaN(val) && val >= 0) {
             handleUpdateSlot(slotId, { customPrice: val })
          } else {
             Taro.showToast({ title: '请输入有效的金额', icon: 'none' })
          }
        }
      }
    })
  }

  const handleClearBuild = () => {
    Taro.showModal({
      title: '清空确认',
      content: '确定要清空当前的装机列表吗？',
      success: (res) => {
        if (res.confirm) {
           setBuildList(initBuildList())
           Taro.removeStorageSync('draft_build')
        }
      }
    })
  }

  const handleSaveConfig = async () => {
    const token = Taro.getStorageSync('xiaoyu_token')
    if (!token) {
      Taro.showModal({
        title: '需要登录',
        content: '保存配置需要先登录，是否前往登录？',
        success: (res) => {
          if (res.confirm) Taro.switchTab({ url: '/pages/user/index' })
        }
      })
      return
    }

    if (!configTitle) return Taro.showToast({ title: '请输入配置名称', icon: 'none' })
    const activeItems = buildList.filter(s => s.item)
    if (activeItems.length === 0) return Taro.showToast({ title: '没有可保存的配件', icon: 'none' })

    const itemsMap: Record<string, string> = {}
    activeItems.forEach(slot => {
      itemsMap[slot.category] = slot.item!.id
    })

    setIsSaving(true)
    Taro.showLoading({ title: isSharing ? '发布中...' : '保存中...' })
    try {
      await createConfig({
        title: configTitle,
        items: itemsMap,
        totalPrice: totalPricing.price,
        tags: [totalPricing.price > 8000 ? '高端' : '性价比'],
        status: isSharing ? 'published' : 'draft',
      })
      Taro.hideLoading()
      Taro.showToast({ title: isSharing ? '已发布到广场' : '保存成功', icon: 'success' })
      setShowSaveModal(false)
    } catch (e) {
      Taro.hideLoading()
      Taro.showToast({ title: '请求失败', icon: 'none' })
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================
  // 海报生成逻辑 (Canvas 2D Robust Engine)
  // ==========================================
  const generatePoster = () => {
    if (isGenerating) return;
    const activeItems = buildList.filter(s => s.item);
    if (activeItems.length === 0) {
      return Taro.showToast({ title: '请先添加硬件', icon: 'none' });
    }

    setIsGenerating(true);
    Taro.showLoading({ title: '海报引擎启动中...', mask: true });

    // 动态计算精准的画布高度: Header(400) + Items(130 * len) + Footer(250) + BottomPadding(50)
    const fpsCardHeight = (currentFps && currentFps.length > 0) ? 140 : 0;
    const dynamicHeight = 400 + fpsCardHeight + (activeItems.length * 130) + 300;

    // 无需等待 DOM 高度更新（CSS 已写死 5000px 保证安全边界），直接抓取节点
    setTimeout(() => {
      const query = Taro.createSelectorQuery();
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            Taro.hideLoading();
            Taro.showToast({ title: '画板节点获取失败，请重试', icon: 'none' });
            setIsGenerating(false);
            return;
          }

          try {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 安全的圆角矩形绘制方案
            const drawRoundRect = (c, x, y, w, h, r) => {
              c.beginPath();
              c.moveTo(x + r, y);
              c.lineTo(x + w - r, y);
              c.arcTo(x + w, y, x + w, y + h, r);
              c.lineTo(x + w, y + h - r);
              c.arcTo(x + w, y + h, x, y + h, r);
              c.lineTo(x + r, y + h);
              c.arcTo(x, y + h, x, y, r);
              c.lineTo(x, y + r);
              c.arcTo(x, y, x + w, y, r);
              c.closePath();
            };

            const dpr = Taro.getSystemInfoSync().pixelRatio;
          const width = 750;
          const height = dynamicHeight;

          // 设定物理分辨率，解决模糊和截断问题
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          // 1. 赛博朋克深黑背景
          const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
          bgGradient.addColorStop(0, '#0B0B10');
          bgGradient.addColorStop(1, '#050508');
          ctx.fillStyle = bgGradient;
          ctx.fillRect(0, 0, width, height);

          // 科技感点缀网格光晕
          ctx.fillStyle = 'rgba(10, 132, 255, 0.05)';
          ctx.beginPath();
          ctx.arc(600, 100, 300, 0, 2 * Math.PI);
          ctx.fill();

          // 2. 头部品牌信息
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 54px sans-serif';
          ctx.fillText('小鱼装机', 40, 100);
          
          ctx.fillStyle = '#0A84FF';
          ctx.font = 'bold 36px sans-serif';
          ctx.fillText('专属神机配置单', 40, 160);

          ctx.fillStyle = '#8E8E93';
          ctx.font = '24px sans-serif';
          const dateStr = new Date().toLocaleDateString('zh-CN');
          ctx.fillText(`生成日期: ${dateStr}`, 40, 210);

          // 性能预估流光卡片
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 1;
          drawRoundRect(ctx, 40, 250, 670, 120, 24);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#8E8E93';
          ctx.font = '24px sans-serif';
          ctx.fillText('预估跑分 (分)', 80, 295);
          ctx.fillText('满载功耗 (W)', 380, 295);
          
          // 发光特效
          ctx.fillStyle = '#0A84FF';
          ctx.shadowColor = 'rgba(10, 132, 255, 0.4)';
          ctx.shadowBlur = 10;
          ctx.font = 'bold 44px sans-serif';
          ctx.fillText(`${(totalPricing.hardwareTotal * 128).toLocaleString()}`, 80, 345);
          
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 0; // 关闭发光
          ctx.fillText(`${totalPricing.power}`, 380, 345);

          // 3. 游戏帧率预测 (动态插入)
          let y = 400;
          if (currentFps && currentFps.length > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            drawRoundRect(ctx, 40, y, 670, 110, 20);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#8E8E93';
            ctx.font = '20px sans-serif';
            ctx.fillText(`${selectedRes} 极高画质预估`, 65, y + 35);
            
            const gamesToDraw = currentFps.slice(0, 3);
            const blockWidth = 630 / gamesToDraw.length;
            
            gamesToDraw.forEach((game, idx) => {
               const startX = 65 + (idx * blockWidth);
               
               ctx.fillStyle = '#FFFFFF';
               ctx.font = 'bold 36px sans-serif';
               ctx.fillText(String(game.avg), startX, y + 75);
               
               const fpsWidth = ctx.measureText(String(game.avg)).width;
               ctx.fillStyle = '#8E8E93';
               ctx.font = '16px sans-serif';
               ctx.fillText('FPS', startX + fpsWidth + 6, y + 72);
               
               let gName = game.game.length > 8 ? game.game.substring(0, 7) + '..' : game.game;
               ctx.font = '18px sans-serif';
               ctx.fillText(String(gName), startX, y + 100);
            });
            
            y += 140;
          }

          // 4. 硬件详单绘制
          activeItems.forEach(slot => {
            if(!slot.item) return;

            // 硬件底框
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            drawRoundRect(ctx, 40, y, 670, 110, 20);
            ctx.fill();

            // 类目与型号
            ctx.fillStyle = '#8E8E93';
            ctx.font = '24px sans-serif';
            ctx.fillText(String(CATEGORY_MAP[slot.category] || '未知类目'), 70, y + 45);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px sans-serif';
            const fullName = `${slot.item.brand || ''} ${slot.item.model || ''}`.trim() || '未命名商品';
            let displayName = fullName;
            if (ctx.measureText(fullName).width > 360) {
               displayName = fullName.substring(0, 19) + '...';
            }
            ctx.fillText(String(displayName), 70, y + 90);

            // 数量角标
            if (slot.quantity > 1) {
               ctx.fillStyle = '#0A84FF';
               ctx.font = 'bold 24px sans-serif';
               ctx.fillText(`x${slot.quantity}`, 460, y + 90);
            }

            // 单项价格
            ctx.fillStyle = '#FA5151';
            ctx.font = 'bold 36px sans-serif';
            const priceText = `¥${slot.item.price}`;
            const priceWidth = ctx.measureText(priceText).width;
            ctx.fillText(priceText, 680 - priceWidth, y + 90);

            y += 130;
          });

          // 4. 底部裂变引流区
          y += 30;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(40, y, 670, 1);

          y += 50;

          // 二维码引导文案
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText('长按扫码', 40, y + 30);
          ctx.fillStyle = '#8E8E93';
          ctx.font = '24px sans-serif';
          ctx.fillText('进入小鱼装机一键复刻', 40, y + 70);
          
          // 总造价标签
          const feePercent = ((pricingStrategy?.serviceFeeRate ?? 0.06) * 100).toFixed(0);
          const feeText = `(含${feePercent}%装机费)`;
          ctx.fillStyle = '#8E8E93';
          ctx.font = '22px sans-serif';
          const feeWidth = ctx.measureText(feeText).width;
          ctx.fillText(feeText, 710 - feeWidth, y + 25);

          if (discountRate !== 1.0) {
            const discountText = `【${discountName}】`;
            ctx.fillStyle = '#FA5151';
            const dWidth = ctx.measureText(discountText).width;
            ctx.fillText(discountText, 710 - feeWidth - dWidth - 5, y + 25);
          }

          ctx.fillStyle = '#8E8E93';
          ctx.font = '28px sans-serif';
          const totalLabel = '总计金额';
          const totalLabelWidth = ctx.measureText(totalLabel).width;
          ctx.fillText(totalLabel, 710 - totalLabelWidth, y + 60);

          // 总计金额数字
          ctx.fillStyle = '#FA5151';
          ctx.shadowColor = 'rgba(250, 81, 81, 0.4)';
          ctx.shadowBlur = 15;
          ctx.font = 'bold 64px "DIN Alternate", sans-serif';
          const totalText = `¥${totalPricing.price.toLocaleString()}`;
          const totalWidth = ctx.measureText(totalText).width;
          ctx.fillText(totalText, 710 - totalWidth, y + 125);
          ctx.shadowBlur = 0;

          // 给 Canvas 绘制预留充足的时间，确保不产生残影黑屏
          setTimeout(() => {
            Taro.canvasToTempFilePath({
              canvas,
              fileType: 'jpg',
              quality: 1,
              success: (res2) => {
                setPosterTempPath(res2.tempFilePath);
                setShowPosterModal(true);
              },
              fail: (err) => {
                console.error('Canvas export failed:', err);
                Taro.showToast({ title: '导出图片失败', icon: 'none' });
              },
              complete: () => {
                Taro.hideLoading();
                setIsGenerating(false);
              }
            });
          }, 300); // 确保上下文队列渲染完毕
          } catch (e) {
            console.error('Canvas Drawing Error:', e);
            Taro.hideLoading();
            Taro.showModal({ title: '绘图底层异常', content: String(e.message || e), showCancel: false });
            setIsGenerating(false);
          }
        });
    }, 100); // 轻微延迟确保组件已完全 Mount
  }

  // 保存到系统相册
  const saveToAlbum = () => {
    if (!posterTempPath) return;
    Taro.saveImageToPhotosAlbum({
      filePath: posterTempPath,
      success: () => {
        Taro.showToast({ title: '已保存到相册', icon: 'success' });
        setShowPosterModal(false);
      },
      fail: (err) => {
        if (err.errMsg === 'saveImageToPhotosAlbum:fail auth deny' || err.errMsg === 'saveImageToPhotosAlbum:fail:auth denied') {
          Taro.showModal({
            title: '需要授权',
            content: '请授权小鱼装机访问您的相册以保存图片',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) Taro.openSetting();
            }
          });
        } else if (err.errMsg !== 'saveImageToPhotosAlbum:fail cancel') {
          Taro.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    });
  }

  // 打开选件库
  const openLibrary = async (category: string) => {
    setSheetCategory(category)
    setSheetSearch('')
    setSheetBrand('all')
    setSheetCapacity('all')
    setSheetSize('all')
    setSheetRefresh('all')
    setSheetSort('default')
    setSheetItems([])
    setDisplayCount(20)
    setIsSheetOpen(true)
    Taro.showLoading({ title: '加载中...', mask: true })
    setSheetLoading(true)
    
    try {
      // 解决性能隐患：先拉取2000个获取全量过滤维度，但在前端做分页渲染
      const res = await getProducts({ category, page: 1, page_size: 2000 })
      const fetchedItems = res?.items || res?.results || res?.data || res || []
      setSheetItems(Array.isArray(fetchedItems) ? fetchedItems : [])
    } catch (e) {
      Taro.showToast({ title: '加载失败', icon: 'error' })
      setSheetItems([])
    } finally {
      setSheetLoading(false)
      Taro.hideLoading()
    }
  }

  // 选中配件
  const selectItem = (item: HardwareItem) => {
    if (sheetCategory) {
      handleUpdateSlot(sheetCategory, { item, customName: undefined, customPrice: undefined, quantity: 1 })
    }
    setIsSheetOpen(false)
  }

  // 云端方案加载
  useEffect(() => {
    if (mode === 'list') loadConfigs()
  }, [sortBy, budgetIdx, mode])

  const loadConfigs = async () => {
    setListLoading(true)
    try {
      const budget = BUDGET_FILTERS[budgetIdx]
      const res = await getConfigs({
        page: 1,
        page_size: 30,
        sort_by: sortBy,
        min_price: budget.min,
        max_price: budget.max,
      })
      const fetchedConfigs = res?.items || res?.results || res?.data || res || []
      const items = Array.isArray(fetchedConfigs) ? fetchedConfigs : []
      setConfigs(items)

      const allIds: string[] = []
      items.forEach((c: any) => {
        if (c.items && typeof c.items === 'object') {
          Object.values(c.items).forEach((val: any) => {
            if (typeof val === 'string') allIds.push(val)
            else if (val?.id) allIds.push(val.id)
          })
        }
      })
      const uniqueIds = [...new Set(allIds)]
      if (uniqueIds.length > 0) {
        getProductsBatch(uniqueIds).then((products: any) => {
          if (Array.isArray(products)) {
            const nameMap: Record<string, string> = {}
            products.forEach((p: any) => {
              nameMap[p.id] = `${p.brand || ''} ${p.model || ''}`.trim()
            })
            setProductNames(prev => ({ ...prev, ...nameMap }))
          }
        }).catch(() => {})
      }
    } catch (e) {
      console.error('获取配置失败:', e)
    } finally {
      setListLoading(false)
    }
  }

  const getComponentName = (config: any, key: string) => {
    if (!config.items || typeof config.items !== 'object') return ''
    const val = config.items[key]
    const id = typeof val === 'string' ? val : val?.id
    if (!id) return ''
    return productNames[id] || ''
  }

  // 一键应用云端列表中的方案
  // --- Detail Modal Functions (Same as Home) ---
  const openDetail = async (config: any) => {
    Taro.showLoading({ title: '加载中...' })
    setDetailConfig(config)
    setDetailItems([])
    setDetailLoading(true)
    setLiked(false)
    setLikesCount(config.likes || 0)
    
    // Fetch real comments from backend
    try {
      const res = await getConfigComments(config.id)
      const fetchedComments = Array.isArray(res) ? res : (res?.items || res?.data || [])
      setComments(fetchedComments)
    } catch (e) {
      console.error('Failed to load comments', e)
      setComments([]) 
    }
    try {
      const itemsMap = config.items || {}
      const ids: string[] = []
      Object.values(itemsMap).forEach((val: any) => {
        if (typeof val === 'string') ids.push(val)
        else if (val?.id) ids.push(val.id)
      })
      if (ids.length > 0) {
        const res = await getProductsBatch(ids)
        const fetchedItems = Array.isArray(res) ? res : (res?.items || res?.results || res?.data || [])
        setDetailItems(fetchedItems)
      }
    } catch (e) { console.error(e) }
    setDetailLoading(false)
    Taro.hideLoading()
  }

  const closeDetail = () => {
    setDetailConfig(null)
    setDetailItems([])
    setComments([])
    setCommentInput('')
  }

  const toggleLike = async () => {
    if (!detailConfig) return;
    
    // Optimistic UI update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount(c => c + (nextLiked ? 1 : -1));
    Taro.showToast({ title: nextLiked ? '已点赞 ❤️' : '取消点赞', icon: 'none', duration: 800 });
    
    try {
      await toggleConfigLike(detailConfig.id);
    } catch (e) {
      // Revert if failed
      setLiked(!nextLiked);
      setLikesCount(c => c + (!nextLiked ? 1 : -1));
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }

  const quickReply = (text: string) => {
    setCommentInput(text)
  }

  const submitComment = async () => {
    if (!commentInput.trim() || !detailConfig) return
    
    // Check login logic (basic check, can be improved)
    const token = Taro.getStorageSync('xiaoyu_token')
    if (!token) {
      Taro.showModal({
        title: '需要登录',
        content: '请先前往“我的”页面登录后再发表评论',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) Taro.switchTab({ url: '/pages/user/index' })
        }
      })
      return
    }

    setSubmittingComment(true)
    Taro.showLoading({ title: '发送中...' })
    
    try {
      const newComment = await addConfigComment(detailConfig.id, commentInput.trim())
      // Add the new comment to the top of the list
      setComments([newComment, ...comments])
      setCommentInput('')
      Taro.showToast({ title: '评论成功', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e.message || '评论失败', icon: 'error' })
    } finally {
      Taro.hideLoading()
      setSubmittingComment(false)
    }
  }

  const applyCloudConfig = (config: any) => {
    closeDetail()
    const itemsMap = config.items || {}
    const idsToFetch: string[] = []
    
    Object.values(itemsMap).forEach((val: any) => {
      if (typeof val === 'string') idsToFetch.push(val)
      else if (val?.id) idsToFetch.push(val.id)
    })

    if (idsToFetch.length > 0) {
      Taro.showLoading({ title: '加载中...' })
      getProductsBatch(idsToFetch).then((products: HardwareItem[]) => {
        if (Array.isArray(products)) {
          const newBuild = initBuildList()
          products.forEach(p => {
            const slot = newBuild.find(s => s.category === p.category)
            if (slot) {
              slot.item = p
            }
          })
          setBuildList(newBuild)
          setMode('diy')
          Taro.hideLoading()
          Taro.showToast({ title: '已应用配置', icon: 'success' })
        } else {
           Taro.hideLoading()
           Taro.showToast({ title: '加载失败', icon: 'error' })
        }
      }).catch(() => {
        Taro.hideLoading()
        Taro.showToast({ title: '加载失败', icon: 'error' })
      })
    }
  }

  // 选件库过滤逻辑
  const filteredSheetItems = useMemo(() => {
    let list = sheetItems.map(i => {
      let isCompatible = true;
      if (sheetCategory === 'mainboard') {
         const cpuItem = buildList.find(s => s.category === 'cpu')?.item
         if (cpuItem && cpuItem.specs && i.specs) {
            try {
              const cpuSpecs = typeof cpuItem.specs === 'string' ? JSON.parse(cpuItem.specs) : cpuItem.specs
              const mbSpecs = typeof i.specs === 'string' ? JSON.parse(i.specs) : i.specs
              if (cpuSpecs.socket && mbSpecs.socket && cpuSpecs.socket !== mbSpecs.socket) isCompatible = false
            } catch (e) {}
         }
      }
      if (sheetCategory === 'ram') {
         const mbItem = buildList.find(s => s.category === 'mainboard')?.item
         if (mbItem && mbItem.specs && i.specs) {
            try {
              const mbSpecs = typeof mbItem.specs === 'string' ? JSON.parse(mbItem.specs) : mbItem.specs
              const ramSpecs = typeof i.specs === 'string' ? JSON.parse(i.specs) : i.specs
              if (mbSpecs.memoryType && ramSpecs.memoryType && mbSpecs.memoryType !== ramSpecs.memoryType) isCompatible = false
            } catch (e) {}
         }
      }
      return { ...i, isCompatible };
    }).filter(i => {
      if (sheetBrand !== 'all' && i.brand !== sheetBrand) return false
      
      // 按次要属性过滤 (容量/功率)
      if (sheetCapacity !== 'all') {
        const tag = getItemFilterTag(i, sheetCategory || '');
        if (tag !== sheetCapacity) return false;
      }
      
      // 按尺寸/刷新率过滤 (显示器)
      if (sheetCategory === 'monitor') {
        if (sheetSize !== 'all' && getMonitorSize(i) !== sheetSize) return false;
        if (sheetRefresh !== 'all' && getMonitorRefresh(i) !== sheetRefresh) return false;
      }

      if (sheetSearch) {
        const str = `${i.brand} ${i.model}`.toLowerCase()
        if (!str.includes(sheetSearch.toLowerCase())) return false
      }
      
      return true
    })
    
    if (sheetSort === 'price_asc') {
      list.sort((a, b) => a.price - b.price)
    } else if (sheetSort === 'price_desc') {
      list.sort((a, b) => b.price - a.price)
    } else {
      // 默认排序：推荐优先，其次按价格升序
      list.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.price - b.price;
      })
    }
    
    return list;
  }, [sheetItems, sheetSearch, sheetBrand, sheetSort, sheetCapacity])

  const availableBrands = useMemo(() => {
    const brandsSet = new Set(sheetItems.map(i => i.brand))
    const brands = Array.from(brandsSet)
    
    // 用户指定优先级顺序
    const priority = ['追风者', '九州风神', '华硕', '海韵', '航嘉', '长城']
    
    brands.sort((a, b) => {
      // 1. 玄武 永远在最后面
      if (a === '玄武') return 1
      if (b === '玄武') return -1
      
      // 2. 处理优先级品牌
      const indexA = priority.indexOf(a)
      const indexB = priority.indexOf(b)
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      
      // 3. 其他品牌按字母序
      return a.localeCompare(b)
    })
    
    return ['all', ...brands]
  }, [sheetItems])

  const availableCapacities = useMemo(() => {
    if (!['ram', 'disk', 'power'].includes(sheetCategory || '')) return []
    const caps = new Set<string>()
    sheetItems.forEach(i => {
      const tag = getItemFilterTag(i, sheetCategory || '');
      if (tag) caps.add(tag);
    })
    return ['all', ...Array.from(caps).sort((a, b) => {
      const parseVal = (c: string) => {
         let val = parseFloat(c) || 0
         if (c.toUpperCase().includes('TB')) val *= 1000
         return val
      }
      return parseVal(a) - parseVal(b)
    })]
  }, [sheetItems, sheetCategory])

  const availableSizes = useMemo(() => {
    if (sheetCategory !== 'monitor') return []
    const caps = new Set<string>()
    sheetItems.forEach(i => {
      const tag = getMonitorSize(i);
      if (tag) caps.add(tag);
    })
    return ['all', ...Array.from(caps).sort((a, b) => parseFloat(a) - parseFloat(b))]
  }, [sheetItems, sheetCategory])

  const availableRefreshes = useMemo(() => {
    if (sheetCategory !== 'monitor') return []
    const caps = new Set<string>()
    sheetItems.forEach(i => {
      const tag = getMonitorRefresh(i);
      if (tag) caps.add(tag);
    })
    return ['all', ...Array.from(caps).sort((a, b) => parseInt(a) - parseInt(b))]
  }, [sheetItems, sheetCategory])

  return (
    <View className={`page ${isSheetOpen ? 'sheet-open' : ''}`}>
      {/* ================= 顶部导航栏 ================= */}
      <View className='top-header-bar'>
        <View className='header-left' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
          <Text className='back-arrow'>←首页</Text>
        </View>
        <Text className='header-title'>智能装机</Text>
        <View className='header-right' onClick={handleClearBuild}>
          <Text className='clear-text'>≡清空</Text>
        </View>
      </View>

      <ScrollView scrollY className='main-scroll' scrollWithAnimation style={scrollHeight ? { height: `${scrollHeight}px` } : {}}>
        
        {/* ================= 模式一：微信暗黑风紧凑列表 ================= */}
        {mode === 'diy' && (
          <>
            <View className='slot-list-group'>
              {buildList.map((slot) => {
                return (
                  <View key={slot.id} className={`wx-cell ${slot.item ? 'wx-cell-filled' : 'wx-cell-empty'}`} onClick={() => openLibrary(slot.category)}>
                    <View className='wx-cell-hd'>
                      <Text className='wx-label'>{CATEGORY_MAP[slot.category]}</Text>
                    </View>
                    
                    {slot.item ? (
                      <>
                        <View className='wx-cell-bd'>
                          <View className='wx-item-info'>
                            <Text className='wx-item-name'>
                              {slot.item.brand} {slot.item.model}
                              {(() => {
                                if (slot.category === 'ram' && slot.item.specs) {
                                  try {
                                    const sp = typeof slot.item.specs === 'string' ? JSON.parse(slot.item.specs) : slot.item.specs
                                    return sp.memoryType ? ` ${sp.memoryType}` : ''
                                  } catch (e) { return '' }
                                }
                                return ''
                              })()}
                            </Text>
                          </View>
                        </View>
                        <View className='wx-cell-ft has-actions'>
                          <View className='ft-top'>
                            <View className='wx-item-price'>
                              <Text>¥{slot.customPrice ?? slot.item!.price}</Text>
                              {slot.customPrice !== undefined && <Text className='price-custom-tag' style={{ fontSize: '20px', marginLeft: '4px', color: '#0A84FF' }}>手填</Text>}
                            </View>
                            <View className='wx-remove' onClick={(e) => { e.stopPropagation(); handleUpdateSlot(slot.id, { item: null, quantity: 1 }) }}>
                              <Text className='wx-icon-close'>×</Text>
                            </View>
                          </View>
                          {(slot.category === 'fan' || slot.category === 'ram' || slot.category === 'disk') && (
                            <View className='wx-qty' onClick={(e) => e.stopPropagation()}>
                              <Text className='wx-qbtn' onClick={() => handleUpdateSlot(slot.id, { quantity: Math.max(1, slot.quantity - 1) })}>-</Text>
                              <Text className='wx-qval'>{slot.quantity}</Text>
                              <Text className='wx-qbtn' onClick={() => handleUpdateSlot(slot.id, { quantity: slot.quantity + 1 })}>+</Text>
                            </View>
                          )}
                        </View>
                      </>
                    ) : (
                      <>
                        <View className='wx-cell-bd'>
                          <Text className='wx-placeholder'>未选择</Text>
                        </View>
                        <View className='wx-cell-ft'>
                          <View className='wx-arrow'></View>
                        </View>
                      </>
                    )}
                  </View>
                )
              })}
            </View>
            
            {/* ================= 性能评估面板 (4大模块) ================= */}
            <View className='perf-modules-container'>
              {/* 模块1: 功耗分析 */}
              <View className='perf-module power-module'>
                <View className='mod-header'><View className='icon-svg icon-power' /><Text className='mod-title'>整机功耗分析</Text></View>
                <View className='power-stats'>
                  <View className='p-stat'><Text className='p-label'>满载功耗</Text><Text className='p-val'>{totalPricing.power} W</Text></View>
                  <View className='p-stat'><Text className='p-label'>建议电源</Text><Text className='p-val'>{totalPricing.suggestedPower} W</Text></View>
                </View>
                <View className='power-bar-wrap'>
                  <View className='power-bar-inner' style={{ width: `${Math.min(100, (totalPricing.power / totalPricing.suggestedPower) * 100 || 0)}%` }}></View>
                </View>
                <Text className='power-tip'>负载余量: {totalPricing.suggestedPower ? Math.max(0, Math.floor(100 - (totalPricing.power / totalPricing.suggestedPower) * 100)) : 0}%</Text>
              </View>

              {/* 模块2: 兼容性检测 */}
              <View className='perf-module comp-module'>
                <View className='mod-header'><View className='icon-svg icon-check' /><Text className='mod-title'>兼容性检测</Text></View>
                <View className='comp-list'>
                  <View className='comp-item'><Text className='c-label'>CPU 与主板接口</Text><Text className={`c-status ${compInfo.cpuMb === '通过' ? 'ok' : compInfo.cpuMb === '未知' ? '' : 'err'}`}>{compInfo.cpuMb}</Text></View>
                  <View className='comp-item'><Text className='c-label'>内存规格匹配</Text><Text className={`c-status ${compInfo.ramMb === '通过' ? 'ok' : compInfo.ramMb === '未知' ? '' : 'err'}`}>{compInfo.ramMb}</Text></View>
                  <View className='comp-item'><Text className='c-label'>电源功率裕度</Text><Text className={`c-status ${compInfo.powerReq === '充足' ? 'ok' : compInfo.powerReq === '未知' ? '' : 'warn'}`}>{compInfo.powerReq}</Text></View>
                </View>
              </View>

              {/* 模块3: 游戏帧数预估 */}
              <View className='perf-module fps-module'>
                <View className='mod-header'>
                  <View className='h-left'><Text className='mod-icon'>🎮</Text><Text className='mod-title'>游戏帧数预估</Text></View>
                  <View className='res-tabs'>
                    {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                      <Text key={res} className={`res-tab ${selectedRes === res ? 'active' : ''}`} onClick={() => setSelectedRes(res)}>{res}</Text>
                    ))}
                  </View>
                </View>
                <View className='fps-list'>
                  {currentFps ? currentFps.map((fps, i) => (
                    <View key={i} className='fps-item'>
                      <Text className='f-name'>{fps.game}</Text>
                      <View className='f-vals'>
                        <Text className='f-avg'>avg <Text className={fps.avg >= 144 ? 'green' : fps.avg >= 60 ? 'white' : 'red'}>{fps.avg}</Text></Text>
                        <Text className='f-low'>low {fps.low}</Text>
                      </View>
                    </View>
                  )) : <Text className='f-empty'>请选择 CPU 和显卡以查看帧数预估</Text>}
                </View>
              </View>

              {/* 模块4: 鲁大师跑分预估 */}
              <View className='perf-module rank-module'>
                <View className='mod-header'>
                  <View className='h-left'><Text className='mod-icon'>🏆</Text><Text className='mod-title'>鲁大师跑分预估</Text></View>
                </View>
                <View className='rank-content'>
                   <Text className='r-level' style={{ color: '#FF3B30', fontSize: '32px', fontWeight: '800', fontFamily: 'ui-monospace, monospace' }}>
                     {totalPricing.hardwareTotal > 0 ? totalPricing.score.toLocaleString() : '---'}
                   </Text>
                   <Text className='r-tip'>预估综合性能得分 (仅供参考)</Text>
                </View>
              </View>
            </View>
            
            <View style={{ height: '140px' }}></View>
          </>
        )}

        {/* ================= 模式二：读取方案 ================= */}
        {mode === 'list' && (
          <View>
            <ScrollView scrollX className='filter-bar' showScrollbar={false}>
              <View className='filter-list'>
                {SORT_OPTIONS.map(opt => (
                  <View
                    key={opt.value}
                    className={`filter-chip ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
                {BUDGET_FILTERS.map((b, i) => (
                  <View
                    key={i}
                    className={`filter-chip ${budgetIdx === i ? 'active' : ''}`}
                    onClick={() => setBudgetIdx(i)}
                  >
                    {b.label}
                  </View>
                ))}
              </View>
            </ScrollView>

            {listLoading ? (
              <View className='loading-container'><Text>查询方案库中...</Text></View>
            ) : configs.length > 0 ? (
              <View className='config-list'>
                {configs.map((config: any, idx: number) => {
                  const cpuName = getComponentName(config, 'cpu')
                  const gpuName = getComponentName(config, 'gpu')
                  const tags = Array.isArray(config.tags) ? config.tags : []
                  return (
                    <View key={config.id || idx} className='config-card' onClick={() => openDetail(config)}>
                      <View className='card-head'>
                        <Text className='card-title'>{config.title || `云端方案 ${idx + 1}`}</Text>
                        <Text className='card-price'>¥{config.totalPrice ? Math.floor(config.totalPrice).toLocaleString() : '---'}</Text>
                      </View>
                      {tags.length > 0 && (
                        <View className='card-tags'>
                          {tags.map((tag: string, ti: number) => (
                            <Text key={ti} className='tag'>{tag}</Text>
                          ))}
                          {config.authorRole === 'admin' && <Text className='tag tag-official'>官方模板</Text>}
                        </View>
                      )}
                      <View className='card-specs'>
                        {cpuName && <Text className='spec-line'>处理器: {cpuName}</Text>}
                        {gpuName && <Text className='spec-line'>显卡: {gpuName}</Text>}
                        {!cpuName && !gpuName && config.description && <Text className='spec-line'>{config.description}</Text>}
                      </View>
                      <View className='card-footer'>
                        <Text className='card-author'>{config.userName || '匿名极客'}</Text>
                        <Text className='card-date'>一键应用此配置 {'>'}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            ) : (
              <View className='empty-state'><Text>该区间暂无配置</Text></View>
            )}
            
            {/* 列表模式下的返回悬浮球 */}
            <View className='fab fab-back' onClick={() => setMode('diy')}>
               <View className='fab-icon icon-back' />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ================= Cyberpunk 终端底栏 ================= */}
      {mode === 'diy' && (
        <>
          <View className='fab' onClick={() => Taro.showToast({ title: 'AI装机助理开发中...', icon: 'none'})}>
             <View className='fab-icon icon-ai' />
          </View>
          
          <View className='bottom-toolbar modern-tb'>
            <View className='tb-price-wrap'>
              <View className='tb-price-row'>
                <Text className='tb-curr'>¥</Text>
                <Text className='tb-price'>{totalPricing.price.toLocaleString()}</Text>
              </View>
              <View className='tb-tag-row'>
                <Text className='tb-fee-tag'>含{((pricingStrategy?.serviceFeeRate ?? 0.06) * 100).toFixed(0)}%装机费</Text>
                <Text className='tb-discount-tag' onClick={() => {
                  if (!pricingStrategy || !pricingStrategy.discountTiers) return
                  const itemList = pricingStrategy.discountTiers.map((t: any) => t.name)
                  Taro.showActionSheet({
                    itemList,
                    success: (res) => {
                      const selected = pricingStrategy.discountTiers[res.tapIndex]
                      setDiscountRate(selected.multiplier)
                      setDiscountName(selected.name)
                      Taro.setStorageSync('xiaoyu_discount', { rate: selected.multiplier })
                    }
                  }).catch(() => {})
                }}>{discountName}</Text>
              </View>
            </View>
            <View className='tb-actions'>
               <View className='tba-btn-icon' onClick={() => { setIsSharing(false); setShowSaveModal(true) }}>
                 <Image src={PixelIcons.box.white} className='tba-icon-img' />
               </View>
               <View className='tba-btn tba-share' onClick={() => { setIsSharing(true); setShowSaveModal(true) }}>
                 <Text>分享</Text>
               </View>
               <View className='tba-btn tba-primary' onClick={generatePoster}>
                 <Text>海报</Text>
               </View>
            </View>
          </View>
        </>
      )}

      {/* ================= 选件库 BottomSheet ================= */}
      {isSheetOpen && (
        <View className='bottom-sheet-overlay' onClick={() => setIsSheetOpen(false)}>
          <View className='bottom-sheet' onClick={(e) => e.stopPropagation()}>
             {/* 顶部把手与搜索区 */}
             <View className='sheet-header'>
                <View className='sheet-handle'></View>
                <View className='sheet-search-and-sort'>
                  <View className='sheet-search-bar'>
                     <Input 
                       className='sheet-search-input' 
                       placeholder={`搜索 ${CATEGORY_MAP[sheetCategory || '']}...`} 
                       value={sheetSearch}
                       onInput={(e) => setSheetSearch(e.detail.value)}
                     />
                  </View>
                  <View className='sheet-sort-wrap' onClick={() => {
                     if (sheetSort === 'default' || sheetSort === 'price_desc') setSheetSort('price_asc');
                     else setSheetSort('price_desc');
                  }}>
                    <Text className={`sort-text ${sheetSort !== 'default' ? 'active' : ''}`}>
                       价格 {sheetSort === 'price_asc' ? '↑' : sheetSort === 'price_desc' ? '↓' : '↕'}
                    </Text>
                  </View>
                </View>
                
                <View className='sheet-filters'>
                  <View className='filter-row filter-row-toggles'>
                  </View>
                  {availableBrands.length > 1 && (
                    <View className='filter-row'>
                      <View 
                        className={`filter-label ${sheetBrand === 'all' ? 'active' : ''}`}
                        onClick={() => setSheetBrand('all')}
                      >
                        品牌
                      </View>
                      <ScrollView scrollX className='sheet-brand-scroll' showScrollbar={false}>
                         <View className='sheet-brands'>
                           {availableBrands.filter(b => b !== 'all').map(b => (
                             <View 
                               key={b} 
                               className={`sheet-brand-chip ${sheetBrand === b ? 'active' : ''}`}
                               onClick={() => setSheetBrand(b)}
                             >
                               {b}
                             </View>
                           ))}
                         </View>
                      </ScrollView>
                    </View>
                  )}
                  {availableCapacities.length > 1 && (
                    <View className='filter-row'>
                      <View 
                        className={`filter-label ${sheetCapacity === 'all' ? 'active' : ''}`}
                        onClick={() => setSheetCapacity('all')}
                      >
                        {sheetCategory === 'power' ? '功率' : '容量'}
                      </View>
                      <ScrollView scrollX className='sheet-brand-scroll sheet-cap-scroll' showScrollbar={false}>
                         <View className='sheet-brands'>
                           {availableCapacities.filter(c => c !== 'all').map(c => (
                             <View 
                               key={`cap_${c}`} 
                               className={`sheet-brand-chip ${sheetCapacity === c ? 'active' : ''}`}
                               onClick={() => setSheetCapacity(c)}
                             >
                               {c}
                             </View>
                           ))}
                         </View>
                      </ScrollView>
                    </View>
                  )}
                  {availableSizes.length > 1 && (
                    <View className='filter-row'>
                      <View 
                        className={`filter-label ${sheetSize === 'all' ? 'active' : ''}`}
                        onClick={() => setSheetSize('all')}
                      >
                        尺寸
                      </View>
                      <ScrollView scrollX className='sheet-brand-scroll sheet-cap-scroll' showScrollbar={false}>
                         <View className='sheet-brands'>
                           {availableSizes.filter(c => c !== 'all').map(c => (
                             <View 
                               key={`size_${c}`} 
                               className={`sheet-brand-chip ${sheetSize === c ? 'active' : ''}`}
                               onClick={() => setSheetSize(c)}
                             >
                               {c}
                             </View>
                           ))}
                         </View>
                      </ScrollView>
                    </View>
                  )}
                  {availableRefreshes.length > 1 && (
                    <View className='filter-row'>
                      <View 
                        className={`filter-label ${sheetRefresh === 'all' ? 'active' : ''}`}
                        onClick={() => setSheetRefresh('all')}
                      >
                        刷新率
                      </View>
                      <ScrollView scrollX className='sheet-brand-scroll sheet-cap-scroll' showScrollbar={false}>
                         <View className='sheet-brands'>
                           {availableRefreshes.filter(c => c !== 'all').map(c => (
                             <View 
                               key={`refresh_${c}`} 
                               className={`sheet-brand-chip ${sheetRefresh === c ? 'active' : ''}`}
                               onClick={() => setSheetRefresh(c)}
                             >
                               {c}
                             </View>
                           ))}
                         </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
             </View>

             {/* 产品列表区 */}
             <ScrollView scrollY className='sheet-body' onScrollToLower={() => setDisplayCount(prev => prev + 20)}>
                {sheetLoading ? (
                  <View className='sheet-loading'>加载中...</View>
                ) : filteredSheetItems.length > 0 ? (
                  <View className='sheet-item-list'>
                    {filteredSheetItems.slice(0, displayCount).map(item => (
                      <View 
                        key={item.id} 
                        className={`sheet-item-card ${item.price === 0 ? 'out-of-stock' : ''} ${!item.isCompatible ? 'incompatible' : ''}`} 
                        onClick={() => { if(item.price !== 0 && item.isCompatible) selectItem(item) }}
                      >
                        <View className='sheet-item-img-wrap'>
                          {item.image ? (
                             <Image className='sheet-item-img' src={item.image.startsWith('/') ? `https://www.diyxx.com${item.image}` : item.image} mode='aspectFill' />
                          ) : (
                             <View className='sheet-item-placeholder'>
                                <Text className='placeholder-text'>{item.brand}</Text>
                             </View>
                          )}
                          {/* 角标 */}
                          <View className='sheet-item-badges'>
                            {item.isRecommended && <Text className='badge-tag tag-rec'>推荐</Text>}
                          </View>
                        </View>
                        <View className='sheet-item-info'>
                           <View className='sheet-item-header'>
                             <View className='sheet-item-brand-wrap'>
                               <Text className='sheet-item-brand'>{item.brand}</Text>
                               {item.isDiscount && <Text className='badge-tag tag-dis inline-tag'>特价</Text>}
                             </View>
                             <Text className='sheet-item-spec-summary'>
                               {getItemSpecSummary(item, sheetCategory || '')}
                             </Text>
                           </View>
                           <Text className='sheet-item-model'>{item.model}</Text>
                        </View>
                        <View className='sheet-item-price'>
                          {item.price === 0 ? (
                            <Text className='price-num oos-text'>缺货</Text>
                          ) : (
                            <>
                              <Text className='price-symbol'>¥</Text>
                              <Text className='price-num'>{item.price}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className='sheet-empty'>暂无匹配的硬件</View>
                )}
             </ScrollView>
          </View>
         </View>
       )}
 
      {/* ================= 隐藏的绘图 Canvas ================= */}
      <Canvas 
        type="2d" 
        id="shareCanvas" 
        className="offscreen-canvas" 
      />

      {/* ================= 海报预览弹窗 ================= */}
      {showPosterModal && (
        <View className="poster-modal-overlay">
          <View className="poster-modal-content">
            <ScrollView scrollY className="poster-scroll-area">
              <Image src={posterTempPath} mode="widthFix" className="poster-preview-img" showMenuByLongpress />
            </ScrollView>
            <View className="poster-actions">
              <View className="poster-btn btn-cancel" onClick={() => setShowPosterModal(false)}>取消</View>
              <Button className="poster-btn btn-share" openType="share">发送给好友</Button>
              <View className="poster-btn btn-save" onClick={saveToAlbum}>保存到手机</View>
            </View>
          </View>
        </View>
      )}

      {/* ================= 保存/分享配置弹窗 ================= */}
      {showSaveModal && (
        <View className='save-modal-overlay' onClick={() => !isSaving && setShowSaveModal(false)}>
          <View className='save-modal-content' onClick={(e) => e.stopPropagation()}>
             <View className='modal-title'>{isSharing ? '分享到配置广场' : '保存到我的方案'}</View>
             <View className='modal-body'>
                <Text className='input-label'>为你的配置起个名字</Text>
                <Input 
                   className='name-input'
                   placeholder='例如：我的赛博朋克主机'
                   value={configTitle}
                   onInput={(e) => setConfigTitle(e.detail.value)}
                   maxlength={20}
                />
             </View>
             <View className='modal-footer'>
                <View className='btn-cancel' onClick={() => setShowSaveModal(false)}>取消</View>
                <View className='btn-confirm' onClick={handleSaveConfig}>{isSaving ? '提交中...' : '确认'}</View>
             </View>
          </View>
        </View>
      )}

      {/* ================= 配置详情弹窗 ================= */}
      {detailConfig && (
        <View className='detail-overlay' onClick={closeDetail}>
          <View className='detail-sheet' onClick={(e) => e.stopPropagation()}>
            {/* 把手 */}
            <View className='detail-handle' />

            <ScrollView scrollY className='detail-scroll'>
              {/* 基本信息 */}
              <View className='detail-header'>
                <View className='detail-author-row'>
                  <View className='author-avatar' />
                  <Text className='author-name'>{detailConfig.userName || '匿名极客'}</Text>
                  {detailConfig.isRecommended && <Text className='card-badge'>官方推荐</Text>}
                </View>
                <Text className='detail-title'>{detailConfig.title || '未命名配置'}</Text>
                <View className='detail-meta-row'>
                  <Text className='detail-price'>¥{detailConfig.totalPrice ? Math.floor(detailConfig.totalPrice).toLocaleString() : '---'}</Text>
                  <View className='detail-tags'>
                    {(Array.isArray(detailConfig.tags) ? detailConfig.tags : []).slice(0, 3).map((t: string, i: number) => (
                      <Text key={i} className='tag'>{t}</Text>
                    ))}
                  </View>
                </View>
              </View>

              {/* 晒单图片 */}
              {Array.isArray(detailConfig.showcaseImages) && detailConfig.showcaseImages.length > 0 && (
                <View className='detail-section'>
                  <Text className='detail-section-title'>📸 晒单图片</Text>
                  {detailConfig.showcaseMessage && (
                    <Text className='showcase-message'>{detailConfig.showcaseMessage}</Text>
                  )}
                  <ScrollView scrollX className='showcase-scroll'>
                    <View className='showcase-imgs'>
                      {detailConfig.showcaseImages.map((img: string, i: number) => (
                        <Image
                          key={i}
                          src={img}
                          className='showcase-img'
                          mode='aspectFill'
                          onClick={() => Taro.previewImage({ urls: detailConfig.showcaseImages, current: img })}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* 配件清单 */}
              <View className='detail-section'>
                <Text className='detail-section-title'>⚙️ 配件清单</Text>
                {detailLoading ? (
                  <Text className='detail-loading'>加载配件中...</Text>
                ) : detailItems.length > 0 ? (
                  <View className='detail-items'>
                    {detailItems.map((item: any) => (
                      <View
                        key={item.id}
                        className='detail-item-row clickable'
                        onClick={() => { setSelectedProduct(item); setProductPopupVisible(true) }}
                      >
                        {item.image ? (
                          <Image src={item.image} className='detail-item-thumb' mode='aspectFill' />
                        ) : (
                          <View className='detail-item-thumb detail-item-thumb-placeholder'>
                            <Text className='detail-item-cat-icon'>{item.category?.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        <View className='detail-item-info'>
                          <Text className='detail-item-cat'>{item.category?.toUpperCase()}</Text>
                          <Text className='detail-item-name' numberOfLines={1}>{item.brand} {item.model}</Text>
                        </View>
                        <View className='detail-item-right'>
                          <Text className='detail-item-price'>¥{item.price}</Text>
                          <Text className='detail-item-chevron'>›</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className='detail-loading'>暂无配件详情</Text>
                )}
              </View>

              {/* 评论区 */}
              <View className='detail-section'>
                <Text className='detail-section-title'>💬 评论区 ({comments.length})</Text>
                {/* 快捷回复 chips */}
                <ScrollView scrollX className='quick-reply-scroll'>
                  <View className='quick-reply-chips'>
                    {['👍 冲啊！', '💰 性价比高', '🔥 配置牛', '❓ 内存够用吗', '🏗️ 想抗一台', '🌊 越级空间大吗'].map((t, i) => (
                      <View key={i} className='quick-chip' onClick={() => quickReply(t)}>
                        <Text>{t}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                {/* 输入框 */}
                <View className='comment-input-wrap'>
                  <Input
                    className='comment-input'
                    placeholder='说点什么...'
                    value={commentInput}
                    onInput={(e) => setCommentInput(e.detail.value)}
                    maxlength={100}
                    confirmType='send'
                    onConfirm={submitComment}
                  />
                  <View
                    className={`comment-send-btn ${commentInput.trim() ? 'active' : ''}`}
                    onClick={submitComment}
                  >
                    <Text>{submittingComment ? '...' : '发送'}</Text>
                  </View>
                </View>
                {/* 评论列表 */}
                {comments.length > 0 ? (
                  <View className='comment-list'>
                    {comments.map((c: any) => (
                      <View key={c.id} className='comment-item'>
                        <View className='comment-item-header'>
                          <Text className='comment-author'>{c.userName}</Text>
                          <Text className='comment-time'>{c.createdAt}</Text>
                        </View>
                        <Text className='comment-content'>{c.content}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className='detail-loading'>暂无评论，来说第一句！</Text>
                )}
              </View>

              {/* 底部安全区 */}
              <View style={{ height: '32px' }} />
            </ScrollView>

            {/* 底部工具栏 */}
            <View className='detail-toolbar'>
              <View className={`toolbar-like-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
                <Text className='toolbar-like-icon'>{liked ? '❤️' : '🤍'}</Text>
                <Text className='toolbar-like-count'>{likesCount}</Text>
              </View>
              <View className='toolbar-divider' />
              <View className='toolbar-apply-btn' onClick={() => applyCloudConfig(detailConfig)}>
                <View className='icon-svg icon-rocket' />
                <Text className='toolbar-apply-text'>载入配置单</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ================= 产品参数弹窗 ================= */}
      {productPopupVisible && selectedProduct && (
        <View className='product-popup-overlay' onClick={() => setProductPopupVisible(false)}>
          <View className='product-popup' onClick={(e) => e.stopPropagation()}>
            <View className='product-popup-handle' />
            <ScrollView scrollY className='product-popup-scroll'>
              {selectedProduct.image ? (
                <Image
                  src={selectedProduct.image}
                  className='product-popup-img'
                  mode='aspectFit'
                  onClick={() => Taro.previewImage({ urls: [selectedProduct.image], current: selectedProduct.image })}
                />
              ) : (
                <View className='product-popup-img-placeholder'>
                  <Text className='product-popup-cat-icon'>{selectedProduct.category?.toUpperCase()}</Text>
                </View>
              )}
              <View className='product-popup-info'>
                <Text className='product-popup-cat-tag'>{selectedProduct.category?.toUpperCase()}</Text>
                <Text className='product-popup-name'>{selectedProduct.brand} {selectedProduct.model}</Text>
                <Text className='product-popup-price'>¥{selectedProduct.price}</Text>
              </View>
              {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 && (
                <View className='product-popup-specs'>
                  <Text className='product-popup-specs-title'>📋 产品规格</Text>
                  {Object.entries(selectedProduct.specs)
                    .filter(([, v]) => v !== null && v !== undefined && v !== '')
                    .map(([k, v]: [string, any], i: number) => {
                      const specMap: Record<string, string> = {
                        cpu: '处理器型号', socket: '接口类型', architecture: '架构', cores: '核心数', threads: '线程数',
                        baseClock: '基础频率', boostClock: '加速频率', l3Cache: '三级缓存', tdp: '功耗(TDP)',
                        memorySupport: '内存支持', integratedGraphics: '核心显卡', cinebenchR23_multi: 'R23多核', cinebenchR23_single: 'R23单核',
                        formFactor: '板型', chipset: '芯片组', memoryType: '内存类型', memorySlots: '内存插槽', maxMemory: '最大内存容量',
                        pcieSlots: 'PCIe插槽', m2Slots: 'M.2插槽', sataPorts: 'SATA接口',
                        capacity: '容量', speed: '频率/速度', timing: '时序', voltage: '电压',
                        interface: '接口类型', readSpeed: '读取速度', writeSpeed: '写入速度',
                        gpu: '显示核心', vram: '显存容量', coreClock: '核心频率', powerReq: '建议电源', length: '长度', ports: '输出接口',
                        size: '尺寸', motherboardSupport: '主板兼容', maxGpuLength: '显卡限长', maxCpuCoolerHeight: '散热限高',
                        wattage: '额定功率', efficiency: '转换效率', modularity: '模组设计', fanSize: '风扇尺寸',
                        type: '类型', rpm: '转速', noiseLevel: '噪音',
                        resolution: '分辨率', refreshRate: '刷新率', panelType: '面板类型', responseTime: '响应时间',
                        layout: '按键布局', switches: '轴体', dpi: '最高DPI'
                      };
                      return (
                        <View key={i} className={`spec-row ${i % 2 === 0 ? 'spec-row-even' : ''}`}>
                          <Text className='spec-key'>{specMap[k] || k}</Text>
                          <Text className='spec-val'>{String(v)}</Text>
                        </View>
                      );
                    })}
                </View>
              )}
              <View style={{ height: '32px' }} />
            </ScrollView>
            <View className='product-popup-footer'>
              <View className='product-popup-close' onClick={() => setProductPopupVisible(false)}>
                <Text>关闭</Text>
              </View>
            </View>
          </View>
        </View>
      )}

     </View>
   )
}
