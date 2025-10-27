import { View, Image, Text } from "@tarojs/components";
import Taro, { useReady } from "@tarojs/taro";
import { useLoad } from "@tarojs/taro";
import { ArrowRight } from "@taroify/icons";
import QRCodeIcon from '@/assets/icon/qr-code.svg'
import CameraIcon from '@/assets/icon/camera.svg'
import './user-profile-popup.scss'
import { useState } from "react";

const getUserAvatar = () => {
  return 'https://img.alicdn.com/imgextra/i1/O1CN01EI93PS1xWbnJ87dXX_!!6000000006451-2-tps-150-150.png'
}

export default function EditProfile() {
  const [cameraPos, setCameraPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  useLoad(() => {
    Taro.setNavigationBarTitle({
      title: '账号资料'
    })
  })
  useReady(() => {
    const query = Taro.createSelectorQuery()
    const avatarRect = query.select('.avatar-img')
    avatarRect.fields({ size: true, rect: true }, (res) => {
      console.log('Avatar position and size:', res)
      setCameraPos({
        x: Math.ceil(res.left + res.width * Math.sqrt(2) / 2),
        y: Math.ceil(res.top + res.height * Math.sqrt(2) / 2)
      })
    }).exec()
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
            <View className="camera-icon-wrapper" style={{left: `${cameraPos.x}px`, top: `${cameraPos.y}px`}}>
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
            <ArrowRight size={16} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">性别</View>
          </View>
          <View className="section-item-detail">
            <Text>保密</Text>
            <ArrowRight size={16} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">出生年月</View>
          </View>
          <View className="section-item-detail">
            <Text>2025-10-22</Text>
            <ArrowRight size={16} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">个性签名</View>
          </View>
          <View className="section-item-detail">
            <Text>这个人很懒，什么都没写</Text>
            <ArrowRight size={16} />
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
            <ArrowRight size={16} />
          </View>
        </View>
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">二维码名片</View>
          </View>
          <View className="section-item-detail">
            <Image src={QRCodeIcon} className="icon-img qr-code"></Image>
            <ArrowRight size={16} />
          </View>
        </View>
      </View>
    </View>
  )
}
