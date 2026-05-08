import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { gamesList, cpuList, gpuList, gamesFpsData, Resolution } from '../../data/gameFpsData'
import './index.scss'

export default function FpsCompare() {
  const [activeMode, setActiveMode] = useState<'config' | 'cpu' | 'gpu'>('config')
  const [selectedGame, setSelectedGame] = useState<string>(gamesList[0])
  const [selectedRes, setSelectedRes] = useState<Resolution>('1080p')

  // 初始化选择的硬件
  const initialCpus = Object.keys(gamesFpsData[selectedGame]?.cpu || {}).sort()
  const initialGpus = Object.keys(gamesFpsData[selectedGame]?.gpu || {}).sort()
  
  const [selectedCpu, setSelectedCpu] = useState<string>(initialCpus[0] || cpuList[0])
  const [selectedGpu, setSelectedGpu] = useState<string>(initialGpus[0] || gpuList[0])
  const [selectedCpu2, setSelectedCpu2] = useState<string>(initialCpus.length > 1 ? initialCpus[1] : (initialCpus[0] || cpuList[0]))
  const [selectedGpu2, setSelectedGpu2] = useState<string>(initialGpus.length > 1 ? initialGpus[1] : (initialGpus[0] || gpuList[0]))

  // 动态可用列表
  const availableCpus = useMemo(() => {
    if (!selectedGame) return cpuList
    const cpuData = gamesFpsData[selectedGame]?.cpu || {}
    return Object.keys(cpuData).sort((a, b) => {
      const fpsA = cpuData[a]?.[selectedRes]?.avg || 0
      const fpsB = cpuData[b]?.[selectedRes]?.avg || 0
      return fpsB - fpsA
    })
  }, [selectedGame, selectedRes])

  const availableGpus = useMemo(() => {
    if (!selectedGame) return gpuList
    const gpuData = gamesFpsData[selectedGame]?.gpu || {}
    return Object.keys(gpuData).sort((a, b) => {
      const fpsA = gpuData[a]?.[selectedRes]?.avg || 0
      const fpsB = gpuData[b]?.[selectedRes]?.avg || 0
      return fpsB - fpsA
    })
  }, [selectedGame, selectedRes])

  // 处理游戏切换，智能更新关联的硬件选择
  const handleSelectGame = (game: string) => {
    setSelectedGame(game)
    const cpus = Object.keys(gamesFpsData[game]?.cpu || {}).sort((a, b) => (gamesFpsData[game]?.cpu[b]?.[selectedRes]?.avg || 0) - (gamesFpsData[game]?.cpu[a]?.[selectedRes]?.avg || 0))
    const gpus = Object.keys(gamesFpsData[game]?.gpu || {}).sort((a, b) => (gamesFpsData[game]?.gpu[b]?.[selectedRes]?.avg || 0) - (gamesFpsData[game]?.gpu[a]?.[selectedRes]?.avg || 0))
    
    if (cpus.length > 0) {
      if (!cpus.includes(selectedCpu)) setSelectedCpu(cpus[0])
      if (!cpus.includes(selectedCpu2)) setSelectedCpu2(cpus.length > 1 ? cpus[1] : cpus[0])
    }
    if (gpus.length > 0) {
      if (!gpus.includes(selectedGpu)) setSelectedGpu(gpus[0])
      if (!gpus.includes(selectedGpu2)) setSelectedGpu2(gpus.length > 1 ? gpus[1] : gpus[0])
    }
  }

  // 整机模式数据
  const configStats = useMemo(() => {
    if (!selectedGame) return null
    const cData = gamesFpsData[selectedGame]?.cpu[selectedCpu]?.[selectedRes]
    const gData = gamesFpsData[selectedGame]?.gpu[selectedGpu]?.[selectedRes]
    if (!cData || !gData) return null

    return {
      cAvg: cData.avg,
      gAvg: gData.avg,
      avg: Math.min(cData.avg, gData.avg),
      low: Math.min(cData.low, gData.low),
      isCpuBottleneck: cData.avg < gData.avg,
      diff: Math.abs(cData.avg - gData.avg)
    }
  }, [selectedGame, selectedCpu, selectedGpu, selectedRes])

  // 跨游戏对比数据计算
  const getMultiGameComparison = (type: 'cpu' | 'gpu', item1: string, item2: string) => {
    const rows: { game: string; item1Avg: number; item1Low: number; item2Avg: number; item2Low: number }[] = []

    for (const game of gamesList) {
      const gameData = gamesFpsData[game]
      if (!gameData) continue
      const data1 = gameData[type][item1]?.[selectedRes]
      const data2 = gameData[type][item2]?.[selectedRes]
      if (data1 && data2) {
        rows.push({ game, item1Avg: data1.avg, item1Low: data1.low, item2Avg: data2.avg, item2Low: data2.low })
      }
    }

    if (rows.length === 0) return null

    const item1Wins = rows.filter(r => r.item1Avg > r.item2Avg).length
    const item2Wins = rows.filter(r => r.item2Avg > r.item1Avg).length
    const ties = rows.length - item1Wins - item2Wins

    return { rows, item1Wins, item2Wins, ties }
  }

  const comparisonData = useMemo(() => {
    if (activeMode === 'config') return null
    return activeMode === 'cpu' 
      ? getMultiGameComparison('cpu', selectedCpu, selectedCpu2)
      : getMultiGameComparison('gpu', selectedGpu, selectedGpu2)
  }, [activeMode, selectedCpu, selectedCpu2, selectedGpu, selectedGpu2, selectedRes])

  // 辅助渲染方法
  const renderPickerField = (label: string, range: string[], value: string, onChange: (val: string) => void) => (
    <Picker mode='selector' range={range} value={range.indexOf(value)} onChange={(e) => onChange(range[e.detail.value])}>
      <View className='picker-field'>
        <Text className='pf-label'>{label}</Text>
        <Text className='pf-value'>{value} ▾</Text>
      </View>
    </Picker>
  )

  const renderMultiGameTable = (type: 'cpu' | 'gpu', itemA: string, itemB: string, data: any) => {
    if (!data) return <View className='empty-state'>暂无对比数据</View>
    
    // 取当前游戏的数据渲染 Hero 区域
    const currentGameData = gamesFpsData[selectedGame]
    const dataA = currentGameData?.[type][itemA]?.[selectedRes]
    const dataB = currentGameData?.[type][itemB]?.[selectedRes]
    const avgA = dataA?.avg || 0
    const avgB = dataB?.avg || 0
    const winner = avgA > avgB ? 'A' : avgB > avgA ? 'B' : 'TIE'
    const maxAvg = Math.max(avgA, avgB, 1)

    return (
      <View className='compare-section'>
        {/* === Hero 对比卡片 (当前游戏) === */}
        <View className='hero-card'>
          <View className='game-title-header'>
            <Text>在【{selectedGame}】中的表现</Text>
          </View>
          <View className='hero-vs-row'>
            <View className={`hero-item ${winner === 'A' ? 'win' : ''}`}>
              {winner === 'A' && <Text className='hero-badge'>WINNER</Text>}
              <Text className='hero-name'>{itemA}</Text>
              <Text className='hero-score'>{avgA} <Text className='unit'>FPS</Text></Text>
            </View>
            <View className='hero-vs-badge'>VS</View>
            <View className={`hero-item ${winner === 'B' ? 'win' : ''}`}>
              {winner === 'B' && <Text className='hero-badge'>WINNER</Text>}
              <Text className='hero-name'>{itemB}</Text>
              <Text className='hero-score'>{avgB} <Text className='unit'>FPS</Text></Text>
            </View>
          </View>
          
          {/* 进度条对比 */}
          <View className='bar-compare-area'>
            <View className='bar-group'>
              <View className='bar-label-row'>
                <Text>A: {itemA}</Text>
                <Text className='val'>{avgA}</Text>
              </View>
              <View className='bar-track'>
                <View className='bar-fill fill-a' style={{ width: `${Math.min(100, (avgA / maxAvg) * 100)}%` }}></View>
              </View>
            </View>
            <View className='bar-group'>
              <View className='bar-label-row'>
                <Text>B: {itemB}</Text>
                <Text className='val'>{avgB}</Text>
              </View>
              <View className='bar-track'>
                <View className='bar-fill fill-b' style={{ width: `${Math.min(100, (avgB / maxAvg) * 100)}%` }}></View>
              </View>
            </View>
          </View>
        </View>

        {/* === 全游戏横评表格 === */}
        <View className='table-card'>
          <View className='tc-header'>
            <Text className='tc-title'>全游戏横评对比 (22款)</Text>
            <View className='tc-summary-pills'>
              <Text className='pill pill-a'>A胜 {data.item1Wins}</Text>
              {data.ties > 0 && <Text className='pill pill-tie'>平 {data.ties}</Text>}
              <Text className='pill pill-b'>B胜 {data.item2Wins}</Text>
            </View>
          </View>
          
          <ScrollView scrollX className='table-scroll'>
            <View className='table-container'>
              <View className='table-header-row'>
                <View className='th-col th-game'>游戏</View>
                <View className='th-col text-right'>A 平均</View>
                <View className='th-col text-right'>A 1%Low</View>
                <View className='th-col text-right'>B 平均</View>
                <View className='th-col text-right'>B 1%Low</View>
              </View>
              {data.rows.map((r: any, idx: number) => {
                const aWinAvg = r.item1Avg > r.item2Avg
                const bWinAvg = r.item2Avg > r.item1Avg
                return (
                  <View key={r.game} className={`table-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                    <View className='td-col td-game'>{r.game}</View>
                    <View className={`td-col text-right font-mono ${aWinAvg ? 'win-text-a' : ''}`}>{r.item1Avg}</View>
                    <View className='td-col text-right font-mono text-muted'>{r.item1Low}</View>
                    <View className={`td-col text-right font-mono ${bWinAvg ? 'win-text-b' : ''}`}>{r.item2Avg}</View>
                    <View className='td-col text-right font-mono text-muted'>{r.item2Low}</View>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='fps-page' scrollY>
      
      {/* 头部标题区 */}
      <View className='page-header'>
        <Text className='ph-title'>性能对比中心</Text>
        <Text className='ph-subtitle'>精准预测真实游戏表现，轻松找出瓶颈</Text>
      </View>

      {/* 控制面板 */}
      <View className='control-panel'>
        {/* 模式切换 */}
        <View className='mode-tabs'>
          <View className={`mode-tab ${activeMode === 'config' ? 'active' : ''}`} onClick={() => setActiveMode('config')}>整机诊断</View>
          <View className={`mode-tab ${activeMode === 'cpu' ? 'active' : ''}`} onClick={() => setActiveMode('cpu')}>CPU对比</View>
          <View className={`mode-tab ${activeMode === 'gpu' ? 'active' : ''}`} onClick={() => setActiveMode('gpu')}>GPU对比</View>
        </View>

        {/* 游戏与分辨率选择 */}
        {renderPickerField('测试游戏', gamesList, selectedGame, handleSelectGame)}
        
        <View className='res-tabs'>
          {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
            <View key={res} className={`res-tab ${selectedRes === res ? 'active' : ''}`} onClick={() => setSelectedRes(res)}>{res}</View>
          ))}
        </View>
        <View className='divider' />

        {/* 硬件选择器 */}
        {activeMode === 'config' ? (
          <View className='selectors-row'>
            <View className='half-col'>{renderPickerField('处理器(CPU)', availableCpus, selectedCpu, setSelectedCpu)}</View>
            <View className='half-col'>{renderPickerField('显卡(GPU)', availableGpus, selectedGpu, setSelectedGpu)}</View>
          </View>
        ) : activeMode === 'cpu' ? (
          <View className='selectors-row'>
            <View className='half-col'>{renderPickerField('CPU A', availableCpus, selectedCpu, setSelectedCpu)}</View>
            <View className='half-col'>{renderPickerField('CPU B', availableCpus, selectedCpu2, setSelectedCpu2)}</View>
          </View>
        ) : (
          <View className='selectors-row'>
            <View className='half-col'>{renderPickerField('GPU A', availableGpus, selectedGpu, setSelectedGpu)}</View>
            <View className='half-col'>{renderPickerField('GPU B', availableGpus, selectedGpu2, setSelectedGpu2)}</View>
          </View>
        )}
      </View>

      {/* 数据展示区 */}
      <View className='data-display-area'>
        {activeMode === 'config' ? (
          /* ================== 整机诊断模式 ================== */
          configStats ? (
            <View className='config-mode-card'>
              <View className='score-header'>
                <View className='sh-left'>
                  <Text className='sh-label'>综合平均帧率</Text>
                  <Text className='sh-score'>{configStats.avg}<Text className='unit'>FPS</Text></Text>
                </View>
                <View className='sh-right'>
                  <Text className='sh-label'>1% Low最低帧</Text>
                  <Text className='sh-score-small'>{configStats.low}<Text className='unit'>FPS</Text></Text>
                </View>
              </View>
              
              <View className='bottleneck-area'>
                <Text className='ba-title'>性能瓶颈分析</Text>
                
                {/* CPU Bar */}
                <View className='ba-bar-wrap'>
                  <View className='ba-info'>
                    <Text className='ba-name'>CPU 算力极限: {selectedCpu}</Text>
                    <Text className='ba-val'>{configStats.cAvg}</Text>
                  </View>
                  <View className='ba-track'>
                    <View className={`ba-fill ${configStats.isCpuBottleneck ? 'danger' : 'safe'}`} style={{ width: `${Math.min(100, (configStats.cAvg / Math.max(configStats.cAvg, configStats.gAvg)) * 100)}%` }}></View>
                  </View>
                  {configStats.isCpuBottleneck && <Text className='ba-warning-tag'>BOTTLENECK</Text>}
                </View>

                {/* GPU Bar */}
                <View className='ba-bar-wrap'>
                  <View className='ba-info'>
                    <Text className='ba-name'>GPU 算力极限: {selectedGpu}</Text>
                    <Text className='ba-val'>{configStats.gAvg}</Text>
                  </View>
                  <View className='ba-track'>
                    <View className={`ba-fill ${!configStats.isCpuBottleneck ? 'danger' : 'safe'}`} style={{ width: `${Math.min(100, (configStats.gAvg / Math.max(configStats.cAvg, configStats.gAvg)) * 100)}%` }}></View>
                  </View>
                  {!configStats.isCpuBottleneck && <Text className='ba-warning-tag'>BOTTLENECK</Text>}
                </View>

                <View className='ba-conclusion'>
                  {configStats.diff < 10 ? (
                    <Text className='text-safe'>最佳均衡状态。CPU与GPU负载均等，算力分配合理。</Text>
                  ) : configStats.isCpuBottleneck ? (
                    <Text className='text-danger'>WARN: CPU 算力已达极限，显卡仍有冗余。建议提升分辨率榨干GPU，或升级CPU。</Text>
                  ) : (
                    <Text className='text-danger'>WARN: GPU 满载导致帧率受限，CPU算力过剩。建议降低画质/开启DLSS，或升级显卡。</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View className='empty-state'>暂无该组合数据</View>
          )
        ) : activeMode === 'cpu' ? (
          /* ================== CPU 对比模式 ================== */
          renderMultiGameTable('cpu', selectedCpu, selectedCpu2, comparisonData)
        ) : (
          /* ================== GPU 对比模式 ================== */
          renderMultiGameTable('gpu', selectedGpu, selectedGpu2, comparisonData)
        )}
      </View>
      
      <View style={{ height: '60px' }}></View>
    </ScrollView>
  )
}
