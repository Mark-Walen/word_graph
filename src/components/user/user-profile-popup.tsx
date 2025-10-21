import { View, Image, PageContainer, ShareElement } from '@tarojs/components'
import { ArrowLeft } from '@taroify/icons'
import NavigationBar from '@/components/navigation-bar'
import './user-profile-popup.scss'

interface Props {
  show: boolean
  onClose: () => void
}

const getUserAvatar = () => {
  return 'https://img.alicdn.com/imgextra/i1/O1CN01EI93PS1xWbnJ87dXX_!!6000000006451-2-tps-150-150.png'
}

export default function UserProfilePage({ show, onClose }: Props) {
  return (
    <PageContainer
      show={show}
      overlay={false}
      duration={300}
      position='right'
      closeOnSlideDown
      onAfterLeave={onClose}
      style={{ position: 'fixed', zIndex: 1000 }}
    >
      <View className='profile-page'>
        <NavigationBar>
          <ArrowLeft size={24} onClick={onClose}/>
        </NavigationBar>
        <View className='content'>
          {/* Shared Avatar — same mapkey */}
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
            <View className="avatar-wrap large">
              <Image
                src={getUserAvatar()}
                className='avatar-img'
              />
            </View>
          </ShareElement>

          <View className='name'>John Doe</View>
          <View className='email'>john.doe@example.com</View>

          <View className='section'>
            <View className='section-title'>Account Settings</View>
            <View className='section-desc'>Manage your account preferences and settings</View>
          </View>
        </View>
      </View>
    </PageContainer>
  )
}
