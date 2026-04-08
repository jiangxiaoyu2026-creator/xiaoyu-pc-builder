import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useShareAppMessage, usePullDownRefresh } from '@tarojs/taro'
import { getConfigs, getArticles, getProducts } from '../../services/api'
import './index.scss'

export default function IndexPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [hotProducts, setHotProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useShareAppMessage(() => ({
    title: '小鱼装机 — 年轻人的第一台极客主机',
    path: '/pages/index/index'
  }))

  usePullDownRefresh(() => {
    loadData().then(() => Taro.stopPullDownRefresh())
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [configRes, articleRes, gpuRes] = await Promise.all([
        getConfigs({ page: 1, page_size: 6, sort_by: 'recommend' }).catch(() => ({ items: [], total: 0 })),
        getArticles({ page: 1, page_size: 5 }).catch(() => ({ items: [], total: 0 })),
        getProducts({ category: 'gpu', is_recommended: true, page: 1, page_size: 8 }).catch(() => ({ items: [], total: 0 })),
      ])
      setConfigs(configRes?.items || [])
      setArticles(articleRes?.items || [])
      setHotProducts(gpuRes?.items || [])
    } catch (e) {
      console.error('Data load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (url: string) => Taro.switchTab({ url })

  // 从配置单提取关键配件信息
  const getConfigSummary = (config: any) => {
    const title = config.title || '未命名配置'
    const tags = Array.isArray(config.tags) ? config.tags : []
    return { title, tags }
  }

  return (
    <View className='page-container'>
      {/* 底部动态模糊光斑增强通透毛玻璃质感 */}
      <View className='bg-blobs'>
        <View className='blob blob-1'></View>
        <View className='blob blob-2'></View>
        <View className='blob blob-3'></View>
      </View>

      <View className='content-wrapper'>
        {/* 顶部品牌区 */}
        <View className='header-glass'>
          <Text className='brand-title'>小鱼装机</Text>
          <Text className='brand-slogan'>为你打造绝佳性能体验</Text>
        </View>
        
        {/* Banner 轮播区 */}
        <View className='banner-section'>
          <Swiper 
            className='banner-swiper'
            circular
            autoplay
            interval={4000}
            indicatorDots={false}
          >
            <SwiperItem>
              <View className='banner-card glow-blue' onClick={() => switchTab('/pages/builder/index')}>
                <View className='banner-info'>
                  <Text className='banner-tag'>AI 驱动</Text>
                  <Text className='banner-h1'>智能装机 3.0</Text>
                  <Text className='banner-p'>只需一句话，量身定制</Text>
                </View>
                <Image className='banner-img' src='https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=400&blend=000000&blend-alpha=10&blend-mode=overlay' mode='aspectFill'/>
              </View>
            </SwiperItem>
            <SwiperItem>
              <View className='banner-card glow-purple' onClick={() => switchTab('/pages/recycle/index')}>
                <View className='banner-info'>
                  <Text className='banner-tag'>环保回收</Text>
                  <Text className='banner-h1'>硬件高价回收</Text>
                  <Text className='banner-p'>全网透明报价，极速打款</Text>
                </View>
                <Image className='banner-img' src='https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=400&blend=000000&blend-alpha=10&blend-mode=overlay' mode='aspectFill'/>
              </View>
            </SwiperItem>
          </Swiper>
        </View>

        {/* 导航金刚区：不再使用便宜的 Emoji，改用纯净 Glass 拟物图标 */}
        <View className='nav-glass-container'>
          <View className='nav-item' onClick={() => switchTab('/pages/builder/index')}>
            <View className='nav-icon-wrap'>
               <View className='icon-img icon-pc'></View>
            </View>
            <Text className='nav-label'>自选装机</Text>
          </View>
          <View className='nav-item' onClick={() => switchTab('/pages/recycle/index')}>
            <View className='nav-icon-wrap'>
               <View className='icon-img icon-recycle'></View>
            </View>
            <Text className='nav-label'>闲置回收</Text>
          </View>
          <View className='nav-item' onClick={() => switchTab('/pages/builder/index')}>
            <View className='nav-icon-wrap'>
               <View className='icon-img icon-ai'></View>
            </View>
            <Text className='nav-label'>AI助手</Text>
          </View>
          <View className='nav-item' onClick={() => switchTab('/pages/user/index')}>
            <View className='nav-icon-wrap'>
               <View className='icon-img icon-trophy'></View>
            </View>
            <Text className='nav-label'>人气榜单</Text>
          </View>
        </View>

        {/* 热门配置方案：轻薄毛玻璃卡片 */}
        <View className='glass-section'>
          <View className='section-title'>
            <Text className='sh-title'>设计推荐</Text>
            <Text className='sh-more' onClick={() => switchTab('/pages/builder/index')}>全部 ▷</Text>
          </View>

          {loading ? (
            <View className='loading-container'><Text className='loading-text'>加载中...</Text></View>
          ) : configs.length > 0 ? (
            <ScrollView scrollX className='config-scroll' showScrollbar={false}>
              <View className='config-list'>
                {configs.map((config, idx) => {
                  const { title, tags } = getConfigSummary(config)
                  return (
                    <View key={config.id || idx} className='glass-card'>
                      <View className='cfg-header'>
                        <Text className='cfg-tag'>{tags[0] || '装机方案'}</Text>
                        {config.isRecommended && <Text className='cfg-platform'>官方优选</Text>}
                      </View>
                      <Text className='cfg-title'>{title}</Text>
                      <View className='cfg-author'>
                        <View className='icon-img icon-user' style={{ width: '20px', height: '20px' }}></View>
                        <Text>{config.userName || '匿名极客'}</Text>
                      </View>
                      
                      <View className='cfg-footer'>
                        <Text className='cfg-price'><Text className='cfg-price-prefix'>¥</Text>{config.totalPrice ? Math.floor(config.totalPrice).toLocaleString() : '---'}</Text>
                        <View className='cfg-btn'>获取方案</View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          ) : (
            <View className='empty-state'>
              <Text className='empty-text'>近期暂无推荐</Text>
            </View>
          )}
        </View>

        {/* 热门显卡推荐 */}
        {hotProducts.length > 0 && (
          <View className='glass-section' style={{ marginTop: '16px' }}>
            <View className='section-title'>
              <Text className='sh-title'>发烧优选</Text>
            </View>
            <ScrollView scrollX className='config-scroll' showScrollbar={false}>
              <View className='config-list'>
                {hotProducts.map((p, idx) => (
                  <View key={p.id || idx} className='gpu-card'>
                    {p.image ? (
                      <Image 
                        className='gpu-img' 
                        src={p.image.startsWith('/') ? `https://www.diyxx.com${p.image}` : p.image} 
                        mode='aspectFill'
                      />
                    ) : (
                      <View className='gpu-img'></View>
                    )}
                    <View className='gpu-info'>
                      <Text className='gpu-brand'>{p.brand}</Text>
                      <Text className='gpu-model'>{p.model}</Text>
                      <View className='gpu-bottom'>
                        <Text className='gpu-price'>¥{p.price?.toLocaleString() || '---'}</Text>
                        {p.isDiscount && <Text className='gpu-discount'>特惠</Text>}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 硬件圈资讯 */}
        <View className='glass-section' style={{ marginTop: '16px' }}>
          <View className='section-title'>
            <Text className='sh-title'>前沿资讯</Text>
          </View>

          {loading ? (
             <View className='loading-container'><Text className='loading-text'>加载中...</Text></View>
          ) : articles.length > 0 ? (
            <View className='article-list'>
              {articles.map((article, idx) => (
                <View key={article.id || idx} className='article-card'>
                  <View className='article-content'>
                    <Text className='article-title'>{article.title}</Text>
                    <View className='article-meta'>
                      {article.isPinned && <Text className='badge-pin'>置顶</Text>}
                      <Text className='article-time'>{article.createdAt?.substring(0,10) || ''}</Text>
                    </View>
                  </View>
                  {article.coverImage && (
                    <Image className='article-img' src={article.coverImage} mode='aspectFill'/>
                  )}
                </View>
              ))}
            </View>
          ) : (
             <View className='empty-state'>
               <Text className='empty-text'>资讯功能维护中</Text>
             </View>
          )}
        </View>

      </View>
    </View>
  )
}
