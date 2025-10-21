import NavigationBar from "@/components/navigation-bar";
import { View, Input } from "@tarojs/components";
import { Popup } from '@taroify/core'
import { ArrowLeft } from "@taroify/icons";
import './search.scss'
import { Search } from "@taroify/icons";

interface SearchProps {
  show: boolean
  onClose?: () => void
}

export default function SearchPage({show, onClose}: SearchProps) {

  return (
    <Popup
      className="search-page"
      open={show}
      placement="bottom"
      onClose={onClose}
      style={{ height: '100%' }}
    >
      <NavigationBar>
        <Popup.Close placement="top-left">
          <ArrowLeft size={32}/>
        </Popup.Close>
      </NavigationBar>

      <View className="search-box-wrapper">
        <View className='search-box-icon-wrapper'>
          <Search className='search-box-icon' size={24}/>
        </View>
        <Input className='ai-search-box fury-glass' placeholder="输入单词或关系查询..."/>
      </View>
      
    </Popup>
  )
}
