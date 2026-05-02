export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/word-detail/index',
    'pages/user/account-safe',
    'pages/user/edit-profile',

    'pages/learn/index',
    'pages/relation/index',
    'pages/relation/relation-path'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WordGraph',
    navigationBarTextStyle: 'black'
  }
})
