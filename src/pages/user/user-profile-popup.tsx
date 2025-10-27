import { View, Text, Image, ShareElement } from '@tarojs/components'
import { ArrowLeft, ArrowRight, Star } from '@taroify/icons'
import NavigationBar from '@/components/navigation-bar'
import { useState } from 'react'
import LockKeyIcon from '@/assets/icon/lock-key.svg'
import UserCircleOutlined from '@/assets/icon/user-circle.svg'
import GraduationCapIcon from '@/assets/icon/graduation-cap.svg'
import PencilSimpleLineIcon from '@/assets/icon/pencil-simple-line.svg'
import './user-profile-popup.scss'
import Taro from '@tarojs/taro'

// Enums matching the Python model
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

enum AuthProvider {
  EMAIL = 'email',
  WECHAT = 'wechat',
  QQ = 'qq',
  PHONE = 'phone'
}

// User interface matching the Python User model
interface User {
  id?: number
  username: string
  email: string
  phone?: string
  qq?: string
  wechat?: string
  wechat_unionid?: string
  qq_openid?: string
  hashed_password?: string
  display_name?: string
  avatar?: string
  status: UserStatus
  is_premium: boolean
  is_admin: boolean
  auth_provider: AuthProvider
  email_verified: boolean
  phone_verified: boolean
  created_at: Date
  updated_at?: Date
  last_login?: Date
}

interface Props {
  show?: boolean
  onClose?: () => void
}

const getUserAvatar = () => {
  return 'https://img.alicdn.com/imgextra/i1/O1CN01EI93PS1xWbnJ87dXX_!!6000000006451-2-tps-150-150.png'
}

export default function UserProfilePage({ show, onClose }: Props) {
  // Mock user data - replace with real data from API/store
  const [user] = useState<User>({
    id: 1,
    username: 'johndoe',
    email: 'john.doe@example.com',
    phone: '+86 138 0013 8000',
    qq: '123456789',
    wechat: 'john_doe_wx',
    display_name: 'John Doe',
    avatar: getUserAvatar(),
    status: UserStatus.ACTIVE,
    is_premium: true,
    is_admin: false,
    auth_provider: AuthProvider.EMAIL,
    email_verified: true,
    phone_verified: true,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-20'),
    last_login: new Date('2024-01-20')
  })

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusText = (status: UserStatus) => {
    const statusMap = {
      [UserStatus.ACTIVE]: '活跃',
      [UserStatus.INACTIVE]: '非活跃',
      [UserStatus.SUSPENDED]: '已暂停',
      [UserStatus.DELETED]: '已删除'
    }
    return statusMap[status] || '未知'
  }

  const getAuthProviderText = (provider: AuthProvider) => {
    const providerMap = {
      [AuthProvider.EMAIL]: '邮箱',
      [AuthProvider.WECHAT]: '微信',
      [AuthProvider.QQ]: 'QQ',
      [AuthProvider.PHONE]: '手机'
    }
    return providerMap[provider] || '未知'
  }

  return (
    <View className='profile-page'>
        <NavigationBar>
          <ArrowLeft size={24} onClick={onClose}/>
        </NavigationBar>
        <View className='content'>
          <View className="user-info-section">
            {/* Shared Avatar: use framer-motion on H5, ShareElement on miniapp */}
            {process.env.TARO_ENV === 'h5' ? (
              <View className="avatar-wrap large">
                <Image
                    src={user.avatar || getUserAvatar()}
                    className='avatar-img'
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
                <View className="avatar-wrap large">
                  <Image
                    src={user.avatar || getUserAvatar()}
                    className='avatar-img'
                  />
                </View>
              </ShareElement>
            )}

            <View className='user-info'>
              <View className="base-info">
                <View className='name'>{user.display_name || user.username}</View>
                <Image className='icon-img pencil-simple-line' src={PencilSimpleLineIcon} onClick={()=> {
                  Taro.navigateTo({
                    url: '/pages/user/edit-profile'
                  })
                }}/>
              </View>

              {user.is_premium && (
                <View className='premium-badge'>
                  <Star className='starred' size={16} />
                  <Text>高级会员</Text>
                </View>
              )}

              <View className='coins'>
                <Text className='title'>学币:  </Text>
                <Text className='number'>0</Text>
              </View>
            </View>
          </View>

          <View className="section">
            <View className="section-item">
              <View className="section-item-desc">
                <Image src={GraduationCapIcon} className="icon-img lock-key-icon" />
                <View className="title">学习设置</View>
              </View>
              <ArrowRight size={16} />
            </View>
          </View>

          <View className="section">
            <View className="section-item" onClick={() => {
              Taro.navigateTo({
                url: '/pages/user/account-safe'
              })
            }}>
              <View className="section-item-desc">
                <Image src={UserCircleOutlined} className="icon-img user-circle-icon" />
                <View className="title">账号与安全</View>
              </View>
              <ArrowRight size={16} />
            </View>
            <View className="section-item">
              <View className="section-item-desc">
                <Image src={LockKeyIcon} className="icon-img lock-key-icon" />
                <View className="title">隐私设置</View>
              </View>
              <ArrowRight size={16} />
            </View>
          </View>

          <View className="section account-action">
            <View className="section-item">
              <View className='button switch-acount'>切换账号</View>
            </View>
            <View className="section-item">
              <View className='button logout'>退出登录</View>
            </View>
          </View>
        </View>
      </View>
  )
}
