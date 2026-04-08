import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { getConfigs, getProductsBatch } from '../../services/api'
import './index.scss'

// 排序方式
const SORT_OPTIONS = [
  { label: '综合推荐', value: 'recommend' },
  { label: '热门方案', value: 'hot' },
  { label: '最新上架', value: 'new' },
]

// 预算区间筛选
const BUDGET_FILTERS = [
  { label: '全部预算', min: undefined, max: undefined },
  { label: '3000内', min: undefined, max: 3000 },
  { label: '3k-5k', min: 3000, max: 5000 },
  { label: '5k-8k', min: 5000, max: 8000 },
  { label: '8k以上', min: 8000, max: undefined },
]

const DIY_SLOTS = [
  { id: 'cpu', name: 'CPU', icon: 'icon-cpu' },
  { id: 'cooler', name: '散热', icon: 'icon-cooler' },
  { id: 'motherboard', name: '主板', icon: 'icon-motherboard' },
  { id: 'ram', name: '内存', icon: 'icon-ram' },
  { id: 'disk', name: '硬盘', icon: 'icon-disk' },
  { id: 'gpu', name: '显卡', icon: 'icon-gpu' },
  { id: 'case', name: '机箱', icon: 'icon-case' },
  { id: 'psu', name: '电源', icon: 'icon-psu' },
  { id: 'fan', name: '风扇', icon: 'icon-fan' },
  { id: 'monitor', name: '显示器', icon: 'icon-monitor' },
  { id: 'peripheral', name: '外设', icon: 'icon-peripheral' },
]

type Mode = 'diy' | 'list'

export default function BuilderPage() {
  const [mode, setMode] = useState<Mode>('diy')
  
  // 列表模式状态
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('recommend')
  const [budgetIdx, setBudgetIdx] = useState(0)
  const [productNames, setProductNames] = useState<Record<string, string>>({})

  useShareAppMessage(() => ({
    title: '小鱼高级辅助装机系统',
    path: '/pages/builder/index'
  }))

  useEffect(() => {
    if (mode === 'list') {
      loadConfigs()
    }
  }, [sortBy, budgetIdx, mode])

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const budget = BUDGET_FILTERS[budgetIdx]
      const res = await getConfigs({
        page: 1,
        page_size: 30,
        sort_by: sortBy,
        min_price: budget.min,
        max_price: budget.max,
      })
      const items = res?.items || []
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
      setLoading(false)
    }
  }

  const getComponentName = (config: any, key: string) => {
    if (!config.items || typeof config.items !== 'object') return ''
    const val = config.items[key]
    const id = typeof val === 'string' ? val : val?.id
    if (!id) return ''
    return productNames[id] || ''
  }

  return (
    <View className='page'>
      <ScrollView scrollY className='main-scroll'>
        {/* ================= 模式一：极简无边框插槽 ================= */}
        {mode === 'diy' && (
          <View className='slot-list'>
            {DIY_SLOTS.map((slot) => (
              <View key={slot.id} className='slot-row'>
                <View className='slot-icon-wrap'>
                  <View className={`slot-icon ${slot.icon}`} />
                </View>
                <Text className='slot-name'>{slot.name}</Text>
                <View className='pick-btn' onClick={() => Taro.showToast({ title: '硬件库接入中...', icon: 'none'})}>
                  <Text className='pick-plus'>+</Text>
                  <Text>挑选组件</Text>
                </View>
              </View>
            ))}
          </View>
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

            {loading ? (
              <View className='loading-container'><Text>查询方案库中...</Text></View>
            ) : configs.length > 0 ? (
              <View className='config-list'>
                {configs.map((config: any, idx: number) => {
                  const cpuName = getComponentName(config, 'cpu')
                  const gpuName = getComponentName(config, 'gpu')
                  const tags = Array.isArray(config.tags) ? config.tags : []
                  return (
                    <View key={config.id || idx} className='config-card' onClick={() => Taro.showToast({ title: '已载入配置面板', icon: 'success' })}>
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

      {/* ================= Apple HIG 样式底栏 ================= */}
      {mode === 'diy' && (
        <>
          <View className='fab' onClick={() => Taro.showToast({ title: 'AI装机助理开发中...', icon: 'none'})}>
             <View className='fab-icon icon-ai' />
          </View>
          
          <View className='bottom-toolbar'>
            <View className='toolbar-left'>
              <Text className='price-label'>总价</Text>
              <Text className='price-unit'>¥</Text>
              <Text className='price-value'>0</Text>
            </View>
            <View className='toolbar-right'>
               {/* 这里的“载入方案”也就是曾经放在顶部的“官方推荐方案” */}
               <View className='share-btn load-btn' onClick={() => setMode('list')}>
                 <View className='share-icon icon-folder' />
                 <Text>载入方案</Text>
               </View>

               <View className='tool-btn' onClick={() => Taro.showToast({ title: '清空列表', icon: 'none'})}>
                 <View className='tool-btn-icon icon-trash' />
               </View>
               <Button className='tool-btn btn-clear' openType='share'>
                 <View className='tool-btn-icon icon-share-dark' />
               </Button>
            </View>
          </View>
        </>
      )}
    </View>
  )
}
