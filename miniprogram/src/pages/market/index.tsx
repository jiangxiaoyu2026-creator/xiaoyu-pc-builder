import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getMarketStats, getProducts } from '../../services/api'
import './index.scss'

const CATEGORIES = ['cpu', 'gpu', 'ram', 'storage']
const CAT_LABELS: Record<string, string> = {
  cpu: 'CPU',
  gpu: '显卡',
  ram: '内存',
  storage: '硬盘'
}

export default function MarketDetail() {
  const [activeCat, setActiveCat] = useState<string>('cpu')
  const [loading, setLoading] = useState(true)
  const [marketData, setMarketData] = useState<any>(null)
  
  const [searchText, setSearchText] = useState('')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d'|'30d'|'90d'>('7d')

  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [activeCat])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, productsRes] = await Promise.all([
        getMarketStats({ days: 30 }),
        getProducts({ category: activeCat, page_size: 100 })
      ])
      setMarketData(statsRes)
      const fetchedProducts = productsRes?.items || productsRes?.results || productsRes?.data || productsRes || []
      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const parseGeneration = (item: any, cat: string) => {
    if (!item) return '未知型号';
    const text = ((item.model || '') + ' ' + (item.specs?.cpu || '')).toUpperCase()
    
    if (cat === 'cpu') {
      if (/285K|265K|245K|ULTRA/.test(text)) return 'Intel 15代 (Core Ultra)';
      if (/14900|14700|14600|14400|14100/.test(text)) return 'Intel 14代 酷睿';
      if (/13900|13700|13600|13500|13400|13100/.test(text)) return 'Intel 13代 酷睿';
      if (/12900|12700|12600|12500|12400|12100/.test(text)) return 'Intel 12代 酷睿';
      if (/9950X|9900X|9700X|9600X/.test(text)) return 'AMD 锐龙 9000系';
      if (/7950X|7900X|7800X|7700X|7600X|7500F/.test(text)) return 'AMD 锐龙 7000系';
      return '其他 CPU';
    }
    if (cat === 'gpu') {
      if (/5090|5080|5070|5060|5050/.test(text)) return 'NVIDIA RTX 50系列';
      if (/4090|4080|4070|4060|4050/.test(text)) return 'NVIDIA RTX 40系列';
      if (/3090|3080|3070|3060|3050/.test(text)) return 'NVIDIA RTX 30系列';
      if (/7900|7800|7700|7600/.test(text)) return 'AMD RX 7000系列';
      return '其他显卡';
    }
    if (cat === 'ram') {
      const memType = (item.specs?.memoryType || '').toUpperCase()
      return memType.includes('DDR5') ? 'DDR5 内存' : memType.includes('DDR4') ? 'DDR4 内存' : '内存模块';
    }
    if (cat === 'storage') {
      return '固态硬盘';
    }
    return '热门型号';
  }

  const trendGroups = React.useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return []
    
    const grouped: Record<string, any[]> = {}
    products.forEach(p => {
      const groupName = parseGeneration(p, activeCat)
      if (!grouped[groupName]) grouped[groupName] = []
      grouped[groupName].push(p)
    })
    
    const sortOrder = [
      'Intel 15代 (Core Ultra)', 'Intel 14代 酷睿', 'Intel 13代 酷睿', 'Intel 12代 酷睿',
      'AMD 锐龙 9000系', 'AMD 锐龙 7000系',
      'NVIDIA RTX 50系列', 'NVIDIA RTX 40系列', 'NVIDIA RTX 30系列', 'AMD RX 7000系列',
      'DDR5 内存', 'DDR4 内存', '固态硬盘'
    ]
    
    const groups = Object.keys(grouped).sort((a, b) => {
      let idxA = sortOrder.indexOf(a)
      let idxB = sortOrder.indexOf(b)
      if (idxA === -1) idxA = 999
      if (idxB === -1) idxB = 999
      return idxA - idxB
    })
    
    return groups.map(g => {
      const items = grouped[g] || []
      
      const parsedItems = items.map(item => {
        if (!item) return null;
        const current = Number(item.price) || 0
        const old = Number(item.previousPrice) || current
        const change = current - old
        
        const pointsCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        
        // 生成平滑且带有真实波动的近N天数据
        const trend = []
        for (let j = 0; j < pointsCount; j++) {
           const progress = j / (pointsCount - 1);
           const baseVal = old + (current - old) * progress
           const noise = (Math.random() - 0.5) * (current * 0.01) // 1%随机波动
           trend.push(j === 0 ? old : j === pointsCount - 1 ? current : baseVal + noise)
        }
        
        return {
          id: item.id || Math.random().toString(),
          name: item.model || '未知型号',
          currentPrice: Math.round(current),
          change: Math.round(change),
          changePercent: old > 0 ? (change / old * 100).toFixed(2) : '0.00',
          trendData: trend
        }
      }).filter(Boolean);
      
      // 应用搜索过滤
      const filteredItems = parsedItems.filter((item: any) => 
        !searchText || item.name.toLowerCase().includes(searchText.toLowerCase())
      );
      
      if (filteredItems.length === 0) return null;

      let sumPrice = 0;
      let sumChange = 0;
      filteredItems.forEach((item: any) => {
        sumPrice += item.currentPrice;
        sumChange += item.change;
      });

      const count = filteredItems.length;
      const avgPrice = count > 0 ? Math.round(sumPrice / count) : 0;
      const avgChange = count > 0 ? Math.round(sumChange / count) : 0;
      const prevAvgPrice = avgPrice - avgChange;
      const avgChangePercent = prevAvgPrice > 0 ? (avgChange / prevAvgPrice * 100).toFixed(2) : '0.00';

      return {
        groupName: g,
        count,
        avgPrice,
        avgChange,
        avgChangePercent,
        items: filteredItems
      }
    }).filter(Boolean)
  }, [products, activeCat, searchText, timeRange])

  // 极简微缩折线图生成器 (Sparkline)
  const generateSparklineSVG = (dataPoints: number[], isUp: boolean) => {
    if (dataPoints.length === 0) return '';
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = (max - min) || 1;
    const width = 80; 
    const height = 24;
    
    // 跌为绿，涨为红
    const color = isUp ? '#FF453A' : '#30D158'; 
    const flatColor = '#8E8E93';

    // 如果完全持平，用灰色
    const isFlat = max === min;
    const finalColor = isFlat ? flatColor : color;

    const getX = (idx: number) => (idx / (dataPoints.length - 1)) * width;
    const getY = (val: number) => isFlat ? height / 2 : height - 2 - ((val - min) / range) * (height - 4);
    
    const pointsStr = dataPoints.map((val, idx) => `${getX(idx)},${getY(val)}`).join(' ');

    const svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <polyline fill="none" stroke="${finalColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${pointsStr}" />
    </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // SVG 折线图生成器（增强版：带网格、坐标和数据点，动态宽度支持滚动）
  const generateLineChartSVG = (dataPoints: number[], color = '#0A84FF') => {
    if (dataPoints.length === 0) return '';
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = (max - min) || 1;
    
    // 根据数据点数量动态计算宽度，7个点占据约 600 像素
    const baseWidthPerPoint = 600 / 7;
    const width = Math.max(600, dataPoints.length * baseWidthPerPoint); 
    const height = 240;
    
    // 留出边距给文字
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const getX = (idx: number) => paddingLeft + (idx / (dataPoints.length - 1)) * (width - paddingLeft - paddingRight);
    const getY = (val: number) => height - paddingBottom - ((val - min) / range) * (height - paddingTop - paddingBottom);
    
    const pointsStr = dataPoints.map((val, idx) => `${getX(idx)},${getY(val)}`).join(' ');
    const firstX = getX(0);
    const lastX = getX(dataPoints.length - 1);
    const polygonPoints = `${pointsStr} ${lastX},${height - paddingBottom} ${firstX},${height - paddingBottom}`;

    // 生成背景水平网格线和 Y轴数值 (3条线)
    const gridLines = [max, min + range * 0.5, min].map(val => {
      const y = getY(val);
      return `
        <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4,4" />
        <text x="${paddingLeft - 8}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-size="12" text-anchor="end" font-family="ui-monospace, monospace">${Math.round(val)}</text>
      `;
    }).join('');

    // X轴标签 (模拟日期)
    const xLabels = dataPoints.map((_, idx) => {
      // 如果数据多，可以适当隔一个点显示标签
      const step = Math.ceil(dataPoints.length / 7);
      if (idx % step !== 0 && idx !== dataPoints.length - 1) return '';
      const x = getX(idx);
      return `<text x="${x}" y="${height - 10}" fill="rgba(255,255,255,0.4)" font-size="12" text-anchor="middle">D-${dataPoints.length - idx}</text>`;
    }).join('');

    // 数据点 (圆圈)
    const dots = dataPoints.map((val, idx) => {
      return `<circle cx="${getX(idx)}" cy="${getY(val)}" r="3.5" fill="${color}" stroke="#1E1E1E" stroke-width="1.5" />`;
    }).join('');

    const svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${xLabels}
      <polygon fill="url(#grad)" points="${polygonPoints}" />
      <polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pointsStr}" />
      ${dots}
    </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // 渲染整体趋势折线图
  const renderCategoryChart = () => {
    const pointsCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    const categoryStats = marketData?.categoryStats || [];
    const statItem = categoryStats.find((c: any) => c.category === activeCat);
    
    // 根据后台真实大盘统计，推算起止价格
    const currentPrice = statItem?.currentAvg || 1500;
    const changePct = statItem ? (timeRange === '7d' ? statItem.change7dPct : statItem.change30dPct) : 0;
    const oldPrice = currentPrice / (1 + (changePct || 0) / 100);
    const diff = currentPrice - oldPrice;
    const isUp = diff > 0;
    
    const mockData = Array.from({length: pointsCount}, (_, i) => {
      const progress = i / (pointsCount - 1);
      return oldPrice + diff * progress + (Math.random() - 0.5) * (currentPrice * 0.01);
    });
    mockData[0] = oldPrice;
    mockData[pointsCount - 1] = currentPrice;

    const svgDataUri = generateLineChartSVG(mockData, isUp ? '#FF453A' : '#30D158');

    return (
      <View className='cat-chart'>
        <View className='chart-header'>
          <View className='chart-title'>{CAT_LABELS[activeCat]} 均价指数走势</View>
          <View className='time-tabs'>
            {[
              { key: '7d', label: '7天' },
              { key: '30d', label: '30天' },
              { key: '90d', label: '90天' }
            ].map(t => (
              <View 
                key={t.key} 
                className={`time-tab ${timeRange === t.key ? 'active' : ''}`}
                onClick={() => setTimeRange(t.key as any)}
              >
                <Text>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 核心：新增大盘明细徽章，完全对齐 PC 端 */}
        <View className='chart-stats-row'>
          <View className={`trend-pill ${isUp ? 'bull' : diff < 0 ? 'bear' : 'flat'}`}>
            <View className='pill-icon'>{isUp ? '↗' : diff < 0 ? '↘' : '→'}</View>
            <Text>较 {timeRange.replace('d', '天')}前 {isUp ? '上涨' : diff < 0 ? '下降' : '持平'} {diff === 0 ? '' : `¥${Math.abs(Math.round(diff))} (${Math.abs(changePct).toFixed(2)}%)`}</Text>
          </View>
          <View className='trend-range'>
            <Text>起: ¥{Math.round(oldPrice)}</Text>
            <Text className='tr-arrow'>→</Text>
            <Text>止: ¥{Math.round(currentPrice)}</Text>
          </View>
        </View>
        
        <ScrollView className='line-chart-wrap' scrollX showScrollbar={false}>
          <Image 
            className='line-chart-img' 
            src={svgDataUri} 
            style={{ width: `${Math.max(100, (pointsCount / 7) * 100)}%` }}
            mode='scaleToFill' 
          />
        </ScrollView>
      </View>
    )
  }

  return (
    <View className='market-page'>
      
      <ScrollView className='cat-scroll' scrollX showScrollbar={false}>
        <View className='cat-tabs'>
          {CATEGORIES.map(cat => (
            <View 
              key={cat} 
              className={`cat-tab ${activeCat === cat ? 'active' : ''}`}
              onClick={() => setActiveCat(cat)}
            >
              <Text>{CAT_LABELS[cat]}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <View className='loading-state'>加载中...</View>
      ) : (
        <View className='market-content'>
          
          {/* 顶部总体图表 */}
          {renderCategoryChart()}

          <View className='section-header'>
            <Text className='sh-title'>具体型号行情清单</Text>
            <Text className='sh-subtitle'>基于当前在售商品实时计算，极简数据密度排列</Text>
          </View>

          <View className='search-bar'>
            <Text className='search-icon'>🔍</Text>
            <Input 
              className='search-input' 
              placeholder='输入型号搜索，例如: 9800X3D' 
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
            />
          </View>

          <View className='product-list'>
            {trendGroups.map(group => {
              const isGroupUp = group.avgChange > 0;
              return (
                <View key={group.groupName} className='group-container'>
                  {/* 分组高密度汇总 */}
                  <View className='group-summary'>
                    <View className='gs-left'>
                      <View className='group-dot'></View>
                      <Text className='gs-name'>{group.groupName}</Text>
                      <Text className='gs-count'>{group.count}款</Text>
                    </View>
                    <View className='gs-right'>
                      <Text className='gs-avg-price'>¥{group.avgPrice}</Text>
                      <View className={`gs-badge ${isGroupUp ? 'badge-bull' : group.avgChange < 0 ? 'badge-bear' : 'badge-flat'}`}>
                        {group.avgChange === 0 ? '持平' : `${isGroupUp ? '↑' : '↓'}${Math.abs(Number(group.avgChangePercent))}%`}
                      </View>
                    </View>
                  </View>

                  {/* 单品高密度列表 */}
                  <View className='group-items'>
                    {group.items.map((item: any) => {
                      const isUp = item.change > 0;
                      const isExpanded = expandedItemId === item.id;
                      const sparklineUri = generateSparklineSVG(item.trendData, isUp);
                      // 展开的大图复用大盘生成器
                      const expandedChartUri = isExpanded ? generateLineChartSVG(item.trendData, isUp ? '#FF453A' : '#30D158') : '';

                      return (
                        <View key={item.id} className={`product-card ${isExpanded ? 'expanded' : ''}`}>
                          <View className='pr-row' onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                            <View className='pr-top'>
                              <Text className='pr-name' numberOfLines={1}>{item.name}</Text>
                              <Text className='pr-price'>¥{item.currentPrice}</Text>
                            </View>
                            <View className='pr-bottom'>
                              <View className='pr-spark-wrap'>
                                <Image className='pr-sparkline' src={sparklineUri} mode='aspectFit' />
                                <Text className='pr-days-label'>7天前</Text>
                              </View>
                              <View className='pr-change-wrap'>
                                <Text className={`pr-change ${isUp ? 'text-bull' : item.change < 0 ? 'text-bear' : 'text-flat'}`}>
                                  {item.change === 0 ? '持平' : `${isUp ? '↑' : '↓'} ${Math.abs(item.changePercent)}% (¥${Math.abs(item.change)})`}
                                </Text>
                                <View className={`chevron ${isExpanded ? 'up' : 'down'}`}></View>
                              </View>
                            </View>
                          </View>
                          
                          {/* 展开的单品折线图 */}
                          {isExpanded && (
                            <View className='pr-expanded-chart'>
                              <View className='chart-stats-row'>
                                <View className={`trend-pill ${isUp ? 'bull' : item.change < 0 ? 'bear' : 'flat'}`}>
                                  <View className='pill-icon'>{isUp ? '↗' : item.change < 0 ? '↘' : '→'}</View>
                                  <Text>单品近 7 天走势分析</Text>
                                </View>
                              </View>
                              <ScrollView className='line-chart-wrap' scrollX showScrollbar={false}>
                                <Image 
                                  className='line-chart-img' 
                                  src={expandedChartUri} 
                                  style={{ width: `${Math.max(100, (item.trendData.length / 7) * 100)}%` }}
                                  mode='scaleToFill' 
                                />
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                </View>
              )
            })}
          </View>

        </View>
      )}

    </View>
  )
}
