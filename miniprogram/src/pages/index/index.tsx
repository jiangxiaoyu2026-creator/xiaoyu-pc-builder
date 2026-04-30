import { useState, useEffect, useMemo } from 'react'
import { View, Text, Image, ScrollView, Swiper, SwiperItem, Picker, Input } from '@tarojs/components'
import Taro, { useShareAppMessage, usePullDownRefresh } from '@tarojs/taro'
import { getConfigs, getMarketStats, getProductsBatch } from '../../services/api'
import { gamesList, cpuList, gpuList, gamesFpsData, Resolution } from '../../data/gameFpsData'
import './index.scss'

export default function IndexPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [communityConfigs, setCommunityConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [communityLoading, setCommunityLoading] = useState(false)
  const [configTab, setConfigTab] = useState<'featured' | 'community'>('featured')

  // Detail Modal State
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

  // Market Data State
  const [marketData, setMarketData] = useState<any>(null)
  const [marketLoading, setMarketLoading] = useState(true)

  // FPS Data State
  const initialGame = gamesList[0]
  const initialCpu = Object.keys(gamesFpsData[initialGame]?.cpu || {})[0] || cpuList[0]
  const initialGpu = Object.keys(gamesFpsData[initialGame]?.gpu || {})[0] || gpuList[0]

  const [selectedGame, setSelectedGame] = useState<string>(initialGame)
  const [selectedRes, setSelectedRes] = useState<Resolution>('1080p')
  const [selectedCpu, setSelectedCpu] = useState<string>(initialCpu)
  const [selectedGpu, setSelectedGpu] = useState<string>(initialGpu)

  useShareAppMessage(() => ({
    title: '小鱼装机 — 你的专业电脑配置管家',
    path: '/pages/index/index'
  }))

  usePullDownRefresh(() => {
    loadAllData().then(() => Taro.stopPullDownRefresh())
  })

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    setMarketLoading(true)
    try {
      const [configRes, marketRes] = await Promise.all([
        getConfigs({ page: 1, page_size: 10, is_recommended: true }).catch(() => ({ items: [], total: 0 })),
        getMarketStats({ days: 30 }).catch(() => null)
      ])
      setConfigs(configRes?.items || [])
      setMarketData(marketRes)
    } catch (e) {
      console.error('Data load error:', e)
    } finally {
      setLoading(false)
      setMarketLoading(false)
    }
  }

  // --- FPS 计算逻辑 ---
  const handleSelectGame = (game: string) => {
    setSelectedGame(game)
    const gameData = gamesFpsData[game]
    if (gameData) {
      const cpus = Object.keys(gameData.cpu)
      const gpus = Object.keys(gameData.gpu)
      if (cpus.length > 0 && !cpus.includes(selectedCpu)) setSelectedCpu(cpus[0])
      if (gpus.length > 0 && !gpus.includes(selectedGpu)) setSelectedGpu(gpus[0])
    }
  }

  const fpsStats = useMemo(() => {
    if (!selectedGame) return null
    const gameData = gamesFpsData[selectedGame]
    if (!gameData) return null

    const cData = gameData.cpu[selectedCpu]?.[selectedRes]
    const gData = gameData.gpu[selectedGpu]?.[selectedRes]

    if (!cData || !gData) return null

    return {
      cAvg: cData.avg,
      gAvg: gData.avg,
      avg: Math.min(cData.avg, gData.avg),
      low: Math.min(cData.low || 0, gData.low || 0),
      isCpuBottleneck: cData.avg < gData.avg,
    }
  }, [selectedGame, selectedCpu, selectedGpu, selectedRes])


  const switchTab = (url: string) => Taro.switchTab({ url })

  const getConfigSummary = (config: any) => {
    const title = config.title || '未命名配置'
    const tags = Array.isArray(config.tags) ? config.tags : []
    
    // 基于 config.id 生成稳定的伪随机数
    let hash = 0
    const str = String(config.id || title)
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    const pseudoRandom = Math.abs(hash) / 2147483647
    
    const likes = Math.floor(pseudoRandom * 500) + 50
    const comments = Math.floor((pseudoRandom * pseudoRandom) * 100) + 10
    const highlightIndex = tags.length > 0 ? Math.floor(pseudoRandom * Math.min(3, tags.length)) : -1
    
    return { title, tags, likes, comments, highlightIndex }
  }

  const openDetail = async (config: any) => {
    Taro.showLoading({ title: '加载中...' })
    setDetailConfig(config)
    setDetailItems([])
    setDetailLoading(true)
    setLiked(false)
    setLikesCount(config.likes || Math.floor(Math.random() * 200) + 20)
    // Load comments from local storage
    try {
      const stored = Taro.getStorageSync(`comments_${config.id}`) || []
      setComments(Array.isArray(stored) ? stored : [])
    } catch (e) { setComments([]) }
    // Load hardware details
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

  const toggleLike = () => {
    setLiked(prev => {
      const next = !prev
      setLikesCount(c => c + (next ? 1 : -1))
      Taro.showToast({ title: next ? '已点赞 ❤️' : '取消点赞', icon: 'none', duration: 800 })
      return next
    })
  }

  const quickReply = (text: string) => {
    setCommentInput(text)
  }

  const applyConfig = (config: any) => {
    const app = Taro.getApp()
    if (app) {
      app.globalData = app.globalData || {}
      app.globalData.loadConfig = config
    }
    closeDetail()
    Taro.switchTab({ url: '/pages/builder/index' })
  }

  const submitComment = () => {
    if (!commentInput.trim() || !detailConfig) return
    setSubmittingComment(true)
    const newComment = {
      id: Date.now().toString(),
      userName: '游客',
      content: commentInput.trim(),
      createdAt: new Date().toLocaleString('zh-CN'),
    }
    const updated = [newComment, ...comments]
    setComments(updated)
    setCommentInput('')
    try {
      Taro.setStorageSync(`comments_${detailConfig.id}`, updated)
    } catch (e) {}
    setSubmittingComment(false)
  }

  return (
    <View className='page-container'>
      <View className='content-wrapper'>
        
        {/* ================= 头部品牌与快捷入口 ================= */}
        <View className='header-glass'>
          <Text className='brand-title'>装机广场</Text>
          <Text className='brand-slogan'>为你打造绝佳性能体验</Text>
        </View>
        
        {/* ================= 数据中心：行情与FPS (垂直堆叠，放大展示) ================= */}
        <View className='data-hub-section'>
          {/* 行情分析大卡片 */}
          <View className='data-card data-market' onClick={() => Taro.navigateTo({ url: '/pages/market/index' })}>
            <View className='data-header'>
              <Text className='data-title'>全网行情分析</Text>
              <View className='data-link-pill'>
                <Text>查看大盘</Text>
                <View className='link-chevron-new'></View>
              </View>
            </View>
            {marketLoading ? (
              <Text className='loading-text'>数据加载中...</Text>
            ) : marketData ? (
              <View className='market-content'>
                
                {/* 温度计大盘 */}
                <View className='temp-bar-wrap'>
                  <View className='temp-labels'>
                    <Text className='text-bear'>冰点区</Text>
                    <Text className='text-temp'>{marketData.temperature}°C</Text>
                    <Text className='text-bull'>狂热区</Text>
                  </View>
                  <View className='temp-bar-bg'>
                    <View className='temp-bar-fill' style={{ width: `${marketData.temperature}%` }}></View>
                  </View>
                </View>

                {/* 滚动行情速览 (自动轮播) */}
                <Swiper 
                  className='market-swiper' 
                  autoplay 
                  circular 
                  interval={3500} 
                  displayMultipleItems={2}
                >
                  {(marketData.mixedTrends || [
                    { isCategory: true, name: 'CPU 大盘', trend: 'up', change: '+1.5%', points: [20, 30, 25, 40, 50, 45, 60] },
                    { isCategory: false, type: 'GPU', name: 'RTX 4060 Ti', trend: 'down', price: '¥2,899', change: '-1.2%' },
                    { isCategory: true, name: '内存 大盘', trend: 'down', change: '-3.2%', points: [80, 75, 70, 60, 65, 50, 45] },
                    { isCategory: false, type: 'CPU', name: 'i5-13400F', trend: 'up', price: '¥1,099', change: '+2.5%' },
                    { isCategory: true, name: '固态 大盘', trend: 'up', change: '+2.1%', points: [10, 15, 30, 25, 40, 55, 65] },
                    { isCategory: false, type: 'RAM', name: '16G D5-6000', trend: 'up', price: '¥399', change: '+1.5%' },
                  ]).map((item: any, idx: number) => (
                    <SwiperItem key={idx}>
                      <View className='market-trend-card'>
                        {item.isCategory ? (
                          <>
                            <View className='mt-header'>
                              <Text className='mt-type category-type'>7天趋势</Text>
                              <Text className={`mt-change ${item.trend === 'up' ? 'text-bull' : 'text-bear'}`}>{item.change}</Text>
                            </View>
                            <Text className='mt-name'>{item.name}</Text>
                            <View className='mt-mini-chart'>
                              {item.points.map((p: number, i: number) => (
                                <View key={i} className={`mini-bar ${item.trend === 'up' ? 'bull-bg' : 'bear-bg'}`} style={{ height: `${p}%` }}></View>
                              ))}
                            </View>
                          </>
                        ) : (
                          <>
                            <View className='mt-header'>
                              <Text className='mt-type'>{item.type}</Text>
                              <Text className={`mt-change ${item.trend === 'up' ? 'text-bull' : 'text-bear'}`}>{item.change}</Text>
                            </View>
                            <Text className='mt-name'>{item.name}</Text>
                            <Text className='mt-price'>{item.price}</Text>
                          </>
                        )}
                      </View>
                    </SwiperItem>
                  ))}
                </Swiper>

              </View>
            ) : (
              <Text className='loading-text'>暂无数据</Text>
            )}
          </View>

          {/* 游戏帧数大卡片 */}
          <View className='data-card data-fps'>
            <View className='data-header'>
              <Text className='data-title'>游戏帧数预测</Text>
            </View>
            <View className='fps-content'>
              
              <View className='fps-res-tabs'>
                {['1080p', '1440p', '4K'].map((res) => (
                  <View 
                    key={res} 
                    className={`res-tab ${selectedRes === res ? 'active' : ''}`}
                    onClick={() => setSelectedRes(res as Resolution)}
                  >
                    {res}
                  </View>
                ))}
              </View>

              <View className='fps-selectors'>
                <Picker mode='selector' range={gamesList} onChange={(e) => handleSelectGame(gamesList[e.detail.value])}>
                  <View className='fps-picker-game'>
                    <Text className='picker-label'>测试游戏</Text>
                    <Text className='picker-val'>{selectedGame} ▾</Text>
                  </View>
                </Picker>
                <View className='fps-hw-row'>
                   <Picker className='hw-picker-wrap' mode='selector' range={cpuList} onChange={(e) => setSelectedCpu(cpuList[e.detail.value])}>
                     <View className='fps-picker-hw'>
                       <Text className='hw-label'>CPU</Text>
                       <Text className='hw-val' numberOfLines={1}>{selectedCpu}</Text>
                     </View>
                   </Picker>
                   <Picker className='hw-picker-wrap' mode='selector' range={gpuList} onChange={(e) => setSelectedGpu(gpuList[e.detail.value])}>
                     <View className='fps-picker-hw'>
                       <Text className='hw-label'>GPU</Text>
                       <Text className='hw-val' numberOfLines={1}>{selectedGpu}</Text>
                     </View>
                   </Picker>
                </View>
              </View>
              <View className='fps-result-large'>
                {fpsStats ? (
                  <>
                    {/* 两列并排帧率 */}
                    <View className='fps-dual-row'>
                      <View className='fps-dual-col'>
                        <Text className='fps-dual-label'>平均帧率</Text>
                        <View className='fps-dual-val-row'>
                          <Text className='fps-val-huge'>{fpsStats.avg}</Text>
                          <Text className='fps-unit-inline'>FPS</Text>
                        </View>
                      </View>
                      <View className='fps-dual-divider' />
                      <View className='fps-dual-col'>
                        <Text className='fps-dual-label'>1% Low</Text>
                        <View className='fps-dual-val-row'>
                          <Text className='fps-val-low'>{fpsStats.low}</Text>
                          <Text className='fps-unit-inline'>FPS</Text>
                        </View>
                      </View>
                    </View>
                    {fpsStats.isCpuBottleneck && <Text className='fps-tag warn'>当前分辨率下 CPU 可能遭遇瓶颈</Text>}
                  </>
                ) : (
                  <Text className='loading-text'>暂无该组合数据</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ================= 配置单广场（带选项卡） ================= */}
        <View className='glass-section'>
          {/* 标题 + 选项卡 */}
          <View className='section-header-row'>
            <Text className='sh-title'>配置广场</Text>
          </View>
          <View className='config-tabs'>
            <View
              className={`config-tab ${configTab === 'featured' ? 'active' : ''}`}
              onClick={() => setConfigTab('featured')}
            >
              <View className='tab-icon-wrap'>
                <View className='icon-svg icon-star' />
                <Text>精选配置</Text>
              </View>
            </View>
            <View
              className={`config-tab ${configTab === 'community' ? 'active' : ''}`}
              onClick={() => {
                setConfigTab('community')
                if (communityConfigs.length === 0 && !communityLoading) {
                  setCommunityLoading(true)
                  getConfigs({ page: 1, page_size: 20, is_recommended: false })
                    .then(res => setCommunityConfigs(res?.items || []))
                    .catch(() => {})
                    .finally(() => setCommunityLoading(false))
                }
              }}
            >
              <View className='tab-icon-wrap'>
                <View className='icon-svg icon-globe' />
                <Text>网友分享</Text>
              </View>
            </View>
          </View>

          {/* 列表内容 */}
          {(() => {
            const list = configTab === 'featured' ? configs : communityConfigs
            const isLoadingTab = configTab === 'featured' ? loading : communityLoading
            if (isLoadingTab) return <View className='loading-container'><Text className='loading-text'>加载中...</Text></View>
            if (list.length === 0) return (
              <View className='empty-state'>
                <Text className='empty-text'>{configTab === 'featured' ? '近期暂无精选配置' : '暂无网友分享'}</Text>
              </View>
            )
            return (
              <View className='config-grid'>
                {list.map((config: any, idx: number) => {
                  const { title, tags, likes, comments, highlightIndex } = getConfigSummary(config)
                  return (
                    <View
                      key={config.id || idx}
                      className='config-card'
                      onClick={(e) => { e.stopPropagation(); openDetail(config) }}
                    >
                      <View className='card-header'>
                        <View className='card-author'>
                          <View className='author-avatar' />
                          <Text className='author-name'>{config.userName || '匿名极客'}</Text>
                        </View>
                        {config.isRecommended && <Text className='card-badge'>官方推荐</Text>}
                      </View>
                      <Text className='card-title'>{title}</Text>
                      <View className='card-tags'>
                        {tags.slice(0, 3).map((t: string, i: number) => (
                          <Text key={i} className={`tag ${i === highlightIndex ? 'tag-highlight' : ''}`}>{t}</Text>
                        ))}
                      </View>
                      <View className='card-footer'>
                        <Text className='card-price'><Text className='price-symbol'>¥</Text>{config.totalPrice ? Math.floor(config.totalPrice).toLocaleString() : '---'}</Text>
                        <View className='card-actions'>
                          <View className='action-item'>
                            <View className='icon-img icon-like' />
                            <Text>{likes}</Text>
                          </View>
                          <View className='action-item'>
                            <View className='icon-img icon-comment' />
                            <Text>{comments}</Text>
                          </View>
                        </View>
                      </View>
                      <View className='load-overlay'>
                        <Text className='load-text'>查看详情 →</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )
          })()}



        </View>
      </View>

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
                      <Text key={i} className={`tag ${i === getConfigSummary(detailConfig).highlightIndex ? 'tag-highlight' : ''}`}>{t}</Text>
                    ))}
                  </View>
                </View>
              </View>

              {/* 晒单图片区 */}
              {Array.isArray(detailConfig.showcaseImages) && detailConfig.showcaseImages.length > 0 && (
                <View className='detail-section showcase-section'>
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
              {/* 点赞区 */}
              <View className={`toolbar-like-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
                <Text className='toolbar-like-icon'>{liked ? '❤️' : '🤍'}</Text>
                <Text className='toolbar-like-count'>{likesCount}</Text>
              </View>
              {/* 分隔线 */}
              <View className='toolbar-divider' />
              {/* 应用按鈕 */}
              <View className='toolbar-apply-btn' onClick={() => applyConfig(detailConfig)}>
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
              {/* 产品图片 */}
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

              {/* 基本信息 */}
              <View className='product-popup-info'>
                <Text className='product-popup-cat-tag'>{selectedProduct.category?.toUpperCase()}</Text>
                <Text className='product-popup-name'>{selectedProduct.brand} {selectedProduct.model}</Text>
                <Text className='product-popup-price'>¥{selectedProduct.price}</Text>
              </View>

              {/* 参数规格 */}
              {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 && (
                <View className='product-popup-specs'>
                  <Text className='product-popup-specs-title'>📋 产品规格</Text>
                  {Object.entries(selectedProduct.specs)
                    .filter(([, v]) => v !== null && v !== undefined && v !== '')
                    .map(([k, v]: [string, any], i: number) => (
                      <View key={i} className={`spec-row ${i % 2 === 0 ? 'spec-row-even' : ''}`}>
                        <Text className='spec-key'>{k}</Text>
                        <Text className='spec-val'>{String(v)}</Text>
                      </View>
                    ))}
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
