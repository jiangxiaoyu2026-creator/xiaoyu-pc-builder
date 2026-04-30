import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getConfigs } from '../../../services/api'
import './index.scss'

export default function MyConfigsPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    loadMyConfigs()
  })

  const loadMyConfigs = async () => {
    const token = Taro.getStorageSync('xiaoyu_token')
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }

    setLoading(true)
    try {
      // 真实后端应该有 user_id 过滤，目前我们暂用 getConfigs
      // 假设 /configs/ 返回的是当前登录用户的列表（如果在 header 中携带了 token 且后端做了鉴权过滤）
      const res = await getConfigs({ page: 1, page_size: 50 })
      setConfigs(res?.items || [])
    } catch (e) {
      console.error(e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const applyConfig = (config: any) => {
    const app = Taro.getApp()
    if (app) {
      app.globalData = app.globalData || {}
      app.globalData.loadConfig = config
    }
    Taro.switchTab({ url: '/pages/builder/index' })
  }

  return (
    <View className='page-container'>
      <View className='header-glass'>
        <Text className='brand-title'>我的方案</Text>
        <Text className='brand-slogan'>你的所有硬件灵感都在这里</Text>
      </View>

      <ScrollView scrollY className='list-scroll'>
        {loading ? (
          <View className='empty-state'><Text className='empty-text'>加载中...</Text></View>
        ) : configs.length > 0 ? (
          configs.map((config, idx) => (
            <View key={config.id || idx} className='config-card' onClick={() => applyConfig(config)}>
              <Text className='card-title'>{config.title || '未命名方案'}</Text>
              
              <View className='card-tags'>
                {Array.isArray(config.tags) && config.tags.slice(0, 3).map((t: string, i: number) => (
                  <Text key={i} className='tag'>{t}</Text>
                ))}
              </View>
              
              <View className='card-footer'>
                <Text className='card-price'>
                  <Text className='price-symbol'>¥</Text>
                  {config.totalPrice ? Math.floor(config.totalPrice).toLocaleString() : '---'}
                </Text>
                <View className='apply-btn'>载入装机</View>
              </View>
            </View>
          ))
        ) : (
          <View className='empty-state'>
            <Text className='empty-text'>暂无保存的方案</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
