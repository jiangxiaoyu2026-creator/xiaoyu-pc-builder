import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { PixelIcons } from '../../utils/pixelIcons'
import './index.scss'
import { wxLogin } from '../../services/api'

export default function UserPage() {
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    const storedUser = Taro.getStorageSync('xiaoyu_user')
    if (storedUser) {
      setUserInfo(storedUser)
    }
  }, [])

  const handleLogin = async () => {
    Taro.showLoading({ title: '微信授权登录中...', mask: true })
    try {
      const loginRes = await Taro.login()
      if (loginRes.code) {
        // 调用我们刚才写的后端接口
        const res: any = await wxLogin({ code: loginRes.code })
        if (res && res.access_token) {
          const user = res.user
          // 适配前端的状态字段
          const formattedUser = {
            nickName: user.username,
            avatarUrl: '', // 微信不再直接返回头像，默认置空即可
            role: user.role || 'user',
            vipExpireAt: user.vipExpireAt ? new Date(user.vipExpireAt).toLocaleDateString() : '---'
          }
          setUserInfo(formattedUser)
          Taro.setStorageSync('xiaoyu_user', formattedUser)
          Taro.setStorageSync('xiaoyu_token', res.access_token)
          Taro.showToast({ title: '登录成功', icon: 'success' })
        } else {
          throw new Error('未获取到授权令牌')
        }
      } else {
        throw new Error('微信登录失败')
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '登录异常', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确认退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          setUserInfo(null)
          Taro.removeStorageSync('xiaoyu_user')
          Taro.removeStorageSync('xiaoyu_token')
        }
      }
    })
  }

  const handleNav = (url: string) => {
    if (!userInfo && url.includes('configs')) {
      return Taro.showToast({ title: '请先登录', icon: 'none' })
    }
    if (url.includes('builder') || url.includes('recycle')) {
       Taro.switchTab({ url })
    } else {
       Taro.navigateTo({ url })
    }
  }

  const handleContact = () => {
    Taro.makePhoneCall({
      phoneNumber: '15165066053',
      fail: () => Taro.showToast({ title: '已取消', icon: 'none' })
    })
  }

  return (
    <View className='page-container'>
      
      {/* 顶部 Hero：身份卡片 */}
      <View className='user-hero' onClick={() => { if (!userInfo) handleLogin() }}>
        <View className='user-avatar-wrap'>
            {userInfo?.avatarUrl ? (
              <Image src={userInfo.avatarUrl} className='user-avatar' mode='aspectFill' />
            ) : (
              <Image src={PixelIcons.avatar.gray} className='avatar-placeholder-img' />
            )}
        </View>
        <View className='user-info'>
          <Text className='user-name'>{userInfo ? userInfo.nickName : '登录小鱼装机'}</Text>
          <View>
             {userInfo ? (
                <Text className={`user-badge ${userInfo.role === 'streamer' ? 'vip-streamer' : ''}`}>
                   {userInfo.role === 'streamer' ? 'Pro Max 会员' : '认证用户'}
                </Text>
             ) : (
                <Text className='user-badge'>解锁云端配置存档</Text>
             )}
          </View>
        </View>
      </View>

      {/* 核心资产：Apple Wallet 风格的入口 */}
      <View className='assets-section'>
        <View className='assets-card' onClick={() => handleNav('/pages/user/configs/index')}>
          <View className='assets-content'>
            <Text className='assets-title'>我的方案库</Text>
            <Text className='assets-desc'>随时查看或应用历史配置草稿</Text>
          </View>
          <Image src={PixelIcons.box.primary} className='assets-icon-img' />
        </View>
      </View>

      {/* 工具分组 (Apple Settings Group) */}
      <View className='menu-group'>
        <View className='menu-item' onClick={() => handleNav('/pages/builder/index')}>
          <View className='menu-item-left'>
            <Image src={PixelIcons.tool.white} className='menu-icon-img' />
            <Text className='menu-text'>继续装机</Text>
          </View>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => handleNav('/pages/recycle/index')}>
          <View className='menu-item-left'>
            <Image src={PixelIcons.recycle.white} className='menu-icon-img' />
            <Text className='menu-text'>二手商城</Text>
          </View>
          <Text className='menu-arrow'>›</Text>
        </View>
      </View>

      {/* 支持分组 */}
      <View className='menu-group'>
        <Button className='menu-item' openType='contact'>
          <View className='menu-item-left'>
            <Image src={PixelIcons.chat.white} className='menu-icon-img' />
            <Text className='menu-text'>在线客服</Text>
          </View>
          <Text className='menu-arrow'>›</Text>
        </Button>
        <View className='menu-item' onClick={handleContact}>
          <View className='menu-item-left'>
            <Image src={PixelIcons.phone.white} className='menu-icon-img' />
            <Text className='menu-text'>电话咨询</Text>
          </View>
          <Text className='menu-arrow'>›</Text>
        </View>
      </View>

      {userInfo && (
        <View className='logout-btn' onClick={handleLogout}>
          退出登录
        </View>
      )}

      <Text className='footer-text'>小鱼装机 v1.0.0</Text>

    </View>
  )
}
