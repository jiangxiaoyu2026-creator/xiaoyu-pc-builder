import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PixelIcons } from '../../utils/pixelIcons'
import './index.scss'

// 现货商品类型定义
interface SecondHandProduct {
  id: string
  name: string
  desc: string
  price: number
  originalPrice?: number
  condition: string
  status: 'available' | 'sold'
  soldAt?: string // ISO 标准时间戳，例如 "2026-04-20T10:00:00Z"
}

// 模拟你的现货数据库
import { getUsedItems } from '../../services/api'

export default function RecyclePage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRealInventory()
  }, [])

  const fetchRealInventory = async () => {
    setLoading(true)
    try {
      // 传递 status='all' 拿到所有审核通过和已售的现货
      const res = await getUsedItems({ status: 'all', page: 1, page_size: 100 })
      const rawItems = res?.items || []

      const now = new Date().getTime()
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000

      // 1. 过滤：如果是已售出，且 soldAt 超过 10 天，则剔除
      const filtered = rawItems.filter((item: any) => {
        if (item.status === 'sold' && item.soldAt) {
          // soldAt 可能是毫秒时间戳也可能是秒时间戳。
          // 若 soldAt 比较小（< 100亿），说明是秒，需要乘1000。
          const ts = typeof item.soldAt === 'string' ? Date.parse(item.soldAt) : item.soldAt
          const finalTs = ts < 10000000000 ? ts * 1000 : ts
          if (now - finalTs > tenDaysInMs) {
            return false
          }
        }
        // 如果是待审核 pending 或其他状态，则不显示（仅显示 published 和 sold）
        if (item.status !== 'published' && item.status !== 'sold') {
           return false
        }
        return true
      })

      // 2. 排序：在售(published) 排在前面，已售(sold) 排在后面
      const sorted = filtered.sort((a: any, b: any) => {
        if (a.status === 'published' && b.status === 'sold') return -1
        if (a.status === 'sold' && b.status === 'published') return 1
        return 0
      })

      setProducts(sorted)
    } catch (e) {
      console.error('获取二手现货失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleContact = (product: SecondHandProduct) => {
    if (product.status === 'sold') {
      return Taro.showToast({ title: '该商品已经被抢走了~', icon: 'none' })
    }
    // 正常应该打开客服对话并带上商品信息，目前用默认 openType='contact' 按钮触发
  }

  return (
    <View className='page-container'>
      
      {/* 顶部 Hero 区域 */}
      <View className='hero-section'>
        <Text className='hero-title'>严选二手现货</Text>
        <Text className='hero-subtitle'>每一件都经过极限烤机测试，所见即所得。</Text>
      </View>

      {/* 现货商品列表 */}
      <ScrollView scrollY className='inventory-list'>
        {products.length > 0 ? (
          products.map(item => (
            <View 
              key={item.id} 
              className={`product-card ${item.status}`}
            >
              <View className='card-header'>
                <Text className='product-name'>{item.brand || ''} {item.model || ''}</Text>
                <Text className='condition-badge'>{item.condition}</Text>
              </View>
              
              <Text className='product-desc'>{item.description}</Text>
              
              <View className='card-footer'>
                <View className='price-box'>
                  <Text className='current-price'>
                    <Text className='price-symbol'>¥</Text>
                    {item.price}
                  </Text>
                  {item.originalPrice && (
                    <Text className='original-price'>原价 ¥{item.originalPrice}</Text>
                  )}
                </View>
                
                {item.status === 'published' ? (
                  <Button 
                    className='action-btn btn-buy' 
                    openType='contact'
                    onClick={() => handleContact(item)}
                  >
                    联系购买
                  </Button>
                ) : (
                  <Button className='action-btn btn-sold' onClick={() => handleContact(item)}>
                    已售出
                  </Button>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className='empty-state'>
            <Image src={PixelIcons.empty.gray} className='empty-icon-img' />
            <Text className='empty-text'>当前暂无现货，敬请期待</Text>
          </View>
        )}
      </ScrollView>

    </View>
  )
}
