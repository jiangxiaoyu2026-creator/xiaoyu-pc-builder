import { useState, useEffect } from 'react'
import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getRecyclingEstimate, getRecyclingCategories } from '../../services/api'
import './index.scss'

export default function RecyclePage() {
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState<string>('gpu')
  
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 每个品类的智能默认搜词
  const defaultSearches: Record<string, string> = {
    gpu: '4060',
    cpu: 'i5',
    ram: '16G',
    disk: '1T',
    motherboard: 'B760',
    cooler: '360',
    case: '海景房',
    psu: '650W',
    monitor: '2K',
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    const defaultKeyword = defaultSearches[activeCategory] || ''
    setKeyword(defaultKeyword)
    if (defaultKeyword) {
      handleSearch(defaultKeyword)
    } else {
      setResults([])
    }
  }, [activeCategory])

  const loadCategories = async () => {
    try {
      const res = await getRecyclingCategories()
      if (res && typeof res === 'object') {
        const sortedCategories = {
          gpu: res.gpu || '显卡',
          cpu: res.cpu || 'CPU',
          ram: res.ram || '内存',
          disk: res.disk || '硬盘',
          motherboard: res.motherboard || '主板',
          ...res
        }
        setCategories(sortedCategories)
        const keys = Object.keys(sortedCategories)
        if (keys.length > 0 && !sortedCategories[activeCategory]) {
          setActiveCategory(keys[0])
        }
      }
    } catch (e) {
      console.error('Failed to load categories', e)
    }
  }

  const handleSearch = async (forceKeyword?: string) => {
    const searchKw = forceKeyword !== undefined ? forceKeyword : keyword
    if (!searchKw.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await getRecyclingEstimate({ keyword: searchKw, category: activeCategory })
      setResults(res || [])
    } catch (error) {
      console.error('搜索估价失败', error)
      Taro.showToast({ title: '没有找到相关数据', icon: 'none' })
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const contactRecycle = () => {
    Taro.makePhoneCall({
      phoneNumber: '15165066053',
      fail: () => Taro.showToast({ title: '已取消', icon: 'none' })
    })
  }

  // 计算差价空间
  const renderPriceDifference = (recycle: number, resale: number) => {
    if (!recycle || !resale || resale <= recycle) return null
    return (
      <View className='price-detail-item'>
        <Text className='price-detail-label'>差价空间</Text>
        <Text className='price-detail-value profit'>+¥{resale - recycle}</Text>
      </View>
    )
  }

  return (
    <View className='page-container'>
      <View className='bg-blobs'>
        <View className='blob blob-1'></View>
        <View className='blob blob-2'></View>
      </View>

      <View className='content-wrapper'>
        {/* 顶部悬浮搜索栏 */}
        <View className='search-bar'>
          <View className='search-input-wrap'>
            <Text className='search-icon'>🔎</Text>
            <Input
              className='search-input'
              placeholder='输入型号，如: 4060, i5, 16G...'
              value={keyword}
              onInput={(e) => setKeyword(e.detail.value)}
              onConfirm={() => handleSearch()}
            />
            {keyword && (
              <Text 
                className='search-clear' 
                onClick={() => { setKeyword(''); setResults([]) }}
              >
                ✕
              </Text>
            )}
          </View>
        </View>

        {/* 动态分类 Filter */}
        <ScrollView scrollX className='category-scroll' showScrollbar={false}>
          <View className='category-list'>
            {Object.entries(categories).map(([key, name]) => (
              <View
                key={key}
                className={`category-chip ${activeCategory === key ? 'active' : ''}`}
                onClick={() => setActiveCategory(key)}
              >
                <Text className='category-label'>{name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className='recycle-notice'>
          <Text className='notice-icon'>💡</Text>
          <Text className='notice-text'>
            平台回收全网比价，保证公平透明。寄件运费全免，收货测试无误后2小时极速打款。
          </Text>
        </View>

        {/* 搜索结果 */}
        <View className='price-section'>
          {loading && <View className='loading-container'><Text>查询中...</Text></View>}
          
          {!loading && results.length > 0 && (
            <View className='price-summary'>
              <Text className='summary-text'>找到 {results.length} 条关于 "{keyword}" 的报价库记录</Text>
            </View>
          )}

          {!loading && results.length > 0 && (
            <View className='price-list'>
              {results.map((item, idx) => (
                <View key={idx} className='price-card'>
                  <View className='price-card-left'>
                    <View className='price-model-row'>
                      <Text className='price-model'>{item.model}</Text>
                      <Text className={`validity-tag ${item.isValid ? 'active' : 'expired'}`}>
                        {item.isValid ? '生效中' : '已过期'}
                      </Text>
                    </View>
                    
                    <Text className='price-category'>分类: {categories[item.category] || item.category}</Text>

                    <View className='price-detail-row'>
                      <View className='price-detail-item'>
                        <Text className='price-detail-label'>回收保底价</Text>
                        <Text className='price-detail-value recycle'>¥{item.recyclePrice || '---'}</Text>
                      </View>
                      
                      <View className='price-detail-item'>
                        <Text className='price-detail-label'>市场参考价</Text>
                        <Text className='price-detail-value resale'>¥{item.resalePrice || '---'}</Text>
                      </View>

                      {renderPriceDifference(item.recyclePrice, item.resalePrice)}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!loading && results.length === 0 && keyword && (
            <View className='empty-state'>
              <Text className='empty-text'>未查到报价记录</Text>
            </View>
          )}
        </View>

        {/* 底部功能栏 */}
        <View className='recycle-footer'>
          <View className='btn-primary' onClick={contactRecycle}>
             联系官方客服一键估价
          </View>
        </View>
      </View>
    </View>
  )
}
