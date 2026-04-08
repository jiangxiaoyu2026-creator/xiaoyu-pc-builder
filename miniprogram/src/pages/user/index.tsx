import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function UserPage() {
  const handleNav = (url: string) => {
    Taro.navigateTo({ url })
  }

  const handleContact = () => {
    Taro.makePhoneCall({
      phoneNumber: '15165066053',
      fail: () => Taro.showToast({ title: '已取消', icon: 'none' })
    })
  }

  return (
    <View className='page-container'>
      <View className='bg-blobs'>
        <View className='blob blob-1'></View>
        <View className='blob blob-2'></View>
      </View>

      <View className='content-wrapper'>
        <View className='user-glass-header'>
          <View className='user-avatar-wrap'>
             <Text className='avatar-placeholder'>👤</Text>
          </View>
          <View className='user-info'>
            <Text className='user-name'>极客玩家</Text>
            <Text className='user-badge'>微信授权用户</Text>
          </View>
        </View>

        <View className='stats-glass-row'>
          <View className='stat-card' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none'})}>
            <Text className='stat-value'>0</Text>
            <Text className='stat-label'>我的方案</Text>
          </View>
          <View className='stat-card' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none'})}>
            <Text className='stat-value'>0</Text>
            <Text className='stat-label'>收藏夹</Text>
          </View>
          <View className='stat-card' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none'})}>
            <Text className='stat-value'>0</Text>
            <Text className='stat-label'>浏览足迹</Text>
          </View>
        </View>

        <View className='menu-glass-group'>
          <View className='menu-item' onClick={() => handleNav('/pages/builder/index')}>
            <View className='menu-item-left'>
              <View className='menu-icon'>🛠️</View>
              <Text className='menu-text'>装机订单</Text>
            </View>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => Taro.switchTab({ url: '/pages/recycle/index' })}>
            <View className='menu-item-left'>
              <View className='menu-icon'>♻️</View>
              <Text className='menu-text'>回收进度</Text>
            </View>
            <Text className='menu-arrow'>›</Text>
          </View>
          
          <Button className='menu-item' openType='contact'>
            <View className='menu-item-left'>
              <View className='menu-icon'>💬</View>
              <Text className='menu-text'>在线客服</Text>
            </View>
            <Text className='menu-arrow'>›</Text>
          </Button>

          <View className='menu-item' onClick={handleContact}>
            <View className='menu-item-left'>
              <View className='menu-icon'>📞</View>
              <Text className='menu-text'>电话咨询 (15165066053)</Text>
            </View>
            <Text className='menu-arrow'>›</Text>
          </View>
        </View>

        <Text className='footer-text'>小鱼装机 v1.0.0 · 探索极客内核</Text>
      </View>
    </View>
  )
}
