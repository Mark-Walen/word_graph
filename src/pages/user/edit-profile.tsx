import { View, Image, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useLoad } from "@tarojs/taro";
import { ArrowRight } from "@taroify/icons";
import QRCodeIcon from '@/assets/icon/qr-code.svg'
import CameraIcon from '@/assets/icon/camera.svg'
import './user-profile-popup.scss'

const getUserAvatar = () => {
  return 'https://img.alicdn.com/imgextra/i1/O1CN01EI93PS1xWbnJ87dXX_!!6000000006451-2-tps-150-150.png'
}

export default function EditProfile() {
  useLoad(() => {
    Taro.setNavigationBarTitle({
      title: '账号资料'
    })
  })
  return (
    <View className="edit-profile">
      <View className="section avatar">
        <View className="section-item">
        <View className="avatar-wrap large">
            <Image
              src={getUserAvatar()}
              className='avatar-img'
            />
            <View className="camera-icon-wrapper">
              <Image src={CameraIcon} className="camera-icon icon-img"></Image>
            </View>
          </View>
        </View>
      </View>

      <View className="section">
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">昵称</View>
          </View>
          <View className="section-item-detail">
            <Text>John Doe</Text>
            <ArrowRight size={24} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">性别</View>
          </View>
          <View className="section-item-detail">
            <Text>保密</Text>
            <ArrowRight size={24} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">出生年月</View>
          </View>
          <View className="section-item-detail">
            <Text>2025-10-22</Text>
            <ArrowRight size={24} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">个性签名</View>
          </View>
          <View className="section-item-detail">
            <Text>这个人很懒，什么都没写</Text>
            <ArrowRight size={24} />
          </View>
        </View>
      </View>

      <View className="section">
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">UID</View>
          </View>
          <View className="section-item-detail">
            <Text>00012345</Text>
            <ArrowRight size={24} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">二维码名片</View>
          </View>
          <View className="section-item-detail">
            <Image src={QRCodeIcon} className="icon-img qr-code"></Image>
            <ArrowRight size={24} />
          </View>
        </View>
      </View>
    </View>
  )
}
