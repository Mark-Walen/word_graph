import { View, Image, Text, ShareElement, PageContainer } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import collectorSVG from '@/assets/icon/collector.svg'
import statisticSVG from '@/assets/icon/statistics.svg'
import { Search, User } from '@taroify/icons'
import { UserProfilePopup } from '@/pages/user'
import './index.scss'
import '@taroify/core/popup/index.scss'
import NavigationBar from '@/components/navigation-bar'
import SearchPage from '../search'
import { Popup } from '@taroify/core'

const getUserAvatar = () => {
  return 'https://img.alicdn.com/imgextra/i1/O1CN01EI93PS1xWbnJ87dXX_!!6000000006451-2-tps-150-150.png'
}

export default function Index () {
  const [bottomInset, setBottomInset] = useState(0)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [showSearchPage, setShowSearchPage] = useState(false)
  const isH5 = process.env.TARO_ENV === 'h5' || Taro.getEnv?.() === 'WEB'

  useEffect(() => {
    const systemInfo = Taro.getSystemInfoSync()
    const safeInset = isH5 ? 0 : Math.max(systemInfo.screenHeight - (systemInfo.safeArea?.bottom ?? systemInfo.screenHeight), 24)
    setBottomInset(safeInset)
  })

  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className='index page-bg-image'>
      <NavigationBar>
        <View className="left">
            {isH5 ? (
              <View className="avatar-wrap">
                <Image
                    src={getUserAvatar()}
                    className='avatar-img'
                    onClick={() => setShowUserProfile(true)}
                  />
              </View>
            ) : (
              <ShareElement
                mapkey='user-avatar'
                transform
                duration={500}
                transitionOnGesture
                rectTweenType='materialRectArc'
                shuttleOnPush="to"
                shuttleOnPop="from"
                easingFunction='cubic-bezier(0.25, 0.8, 0.25, 1)'
              >
                <View className="avatar-wrap">
                  <Image
                    src={getUserAvatar()}
                    className='avatar-img'
                    onClick={() => setShowUserProfile(true)}
                  />
                </View>
              </ShareElement>
            )}
          </View>
      </NavigationBar>

      <View className="search-box-wrapper" onClick={()=> {setShowSearchPage(true)}}>
        <View className='search-box-icon-wrapper'>
          <Search className='search-box-icon' size={32}/>
        </View>
        <View className='ai-search-box fury-glass'>输入单词或关系查询...</View>
      </View>

      <View className="content-wrapper">
        <View className="content">
          <View className="study-area">
            <View className="learn study-area__box fury-glass" onClick={() => {
              Taro.navigateTo({
                url: '/pages/learn/index'
              })
            }}>
              <Text className="text">今日学习</Text>
              <Text className="number">4000</Text>
            </View>
            <View className="review study-area__box fury-glass">
              <Text className="text">今日复习</Text>
              <Text className="number">800</Text>
            </View>
          </View>
        </View>

        <View className="tabbar" style={{ paddingBottom: `${bottomInset}px`, backgroundColor: '#fff' }}>
          <Image src={collectorSVG} className="collector" style={{width: '32px', height: '32px'}}></Image>
          <Image src={statisticSVG} className="statistic" style={{width: '32px', height: '32px'}}></Image>
        </View>
      </View>

      {isH5 ? (
        <Popup
          open={showUserProfile}
          placement='left'
        >
          <UserProfilePopup onClose={() => setShowUserProfile(false)}/>
        </Popup>
      ): (
        <PageContainer
          show={showUserProfile}
          overlay={false}
          duration={300}
          position='right'
          closeOnSlideDown
          onAfterLeave={() => setShowUserProfile(false)}
          style={{ position: 'fixed', zIndex: 1000 }}
        >
          <UserProfilePopup onClose={() => setShowUserProfile(false)}/>
        </PageContainer>
      )}

      <SearchPage show={showSearchPage} onClose={() => setShowSearchPage(false)}/>
    </View>
  )
}
