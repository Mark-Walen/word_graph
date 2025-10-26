import { View, Text } from "@tarojs/components";
import './user-profile-popup.scss'
import Taro, { useLoad } from "@tarojs/taro";
import { ArrowRight } from "@taroify/icons";

interface AccountAndSafePageProps {
  show?: boolean
  onClose?: () => void
}

export default function AccountAndSafePage({show, onClose}: AccountAndSafePageProps){

  useLoad(() => {
    Taro.setNavigationBarTitle({
      title: "账号与安全"
    })
  })

  return (
    <View className="account-and-safe">
      <View className="section">
        <View className="section-item" onClick={() => {
          Taro.navigateTo({
            url: '/pages/user/edit-profile'
          })
        }}>
          <View className="section-item-desc">
            <View className="title">账号信息</View>
          </View>
          <View className="section-item-detail">
            <ArrowRight size={24} />
          </View>
        </View>

        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">手机号</View>
          </View>
          <View className="section-item-detail">
            <Text>+86130****1234</Text>
            <ArrowRight size={24} />
          </View>
        </View>

        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">邮箱</View>
          </View>
          <View className="section-item-detail">
            <Text>john_doe@wg.com</Text>
            <ArrowRight size={24} />
          </View>
        </View>
      </View>

      <View className="section">
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">微信账号</View>
          </View>
          <View className="section-item-detail">
            <Text>未绑定</Text>
            <ArrowRight size={24} />
          </View>
        </View>

        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">微博账号</View>
          </View>
          <View className="section-item-detail">
            <Text>未绑定</Text>
            <ArrowRight size={24} />
          </View>
        </View>

        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">QQ账号</View>
          </View>
          <View className="section-item-detail">
            <Text>未绑定</Text>
            <ArrowRight size={24} />
          </View>
        </View>

        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">微信账号</View>
          </View>
          <View className="section-item-detail">
            <Text>未绑定</Text>
            <ArrowRight size={24} />
          </View>
        </View>
      </View>

      <View className="section">
        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">登录设备管理</View>
          </View>
          <View className="section-item-detail">
            <ArrowRight size={24} />
          </View>
        </View>

        <View className="section-item">
          <View className="section-item-desc">
            <View className="title">账号授权管理</View>
          </View>
          <View className="section-item-detail">
            <ArrowRight size={24} />
          </View>
        </View>
      </View>

      <View className="section">
        <View className="section-item">
        <View className="section-item-desc">
            <View className="title">注销账号</View>
          </View>
          <View className="section-item-detail">
            <ArrowRight size={24} />
          </View>
        </View>
      </View>
    </View>
  )
}
