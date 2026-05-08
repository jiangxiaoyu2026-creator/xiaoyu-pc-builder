export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/market/index',
    'pages/builder/index',
    'pages/recycle/index',
    'pages/fps/index',
    'pages/user/index',
    'pages/user/configs/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0B0B10',
    navigationBarTitleText: '小鱼装机',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0B0B10'
  },
  tabBar: {
    color: '#8E8E93',
    selectedColor: '#0A84FF',
    backgroundColor: '#000000',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '广场',
        iconPath: 'assets/tabs/home.png',
        selectedIconPath: 'assets/tabs/home-active.png'
      },
      {
        pagePath: 'pages/builder/index',
        text: '装机',
        iconPath: 'assets/tabs/builder.png',
        selectedIconPath: 'assets/tabs/builder-active.png'
      },
      {
        pagePath: 'pages/recycle/index',
        text: '二手',
        iconPath: 'assets/tabs/recycle.png',
        selectedIconPath: 'assets/tabs/recycle-active.png'
      },
      {
        pagePath: 'pages/user/index',
        text: '我的',
        iconPath: 'assets/tabs/user.png',
        selectedIconPath: 'assets/tabs/user-active.png'
      }
    ]
  }
})
