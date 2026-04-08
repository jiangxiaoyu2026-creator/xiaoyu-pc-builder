export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/builder/index',
    'pages/recycle/index',
    'pages/user/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '小鱼装机',
    navigationBarTextStyle: 'black',
    backgroundColor: '#ffffff'
  },
  tabBar: {
    color: '#AEAEC0',
    selectedColor: '#1d1d1f',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
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
