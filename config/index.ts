import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import os from 'os'
import path from 'path'
import devConfig from './dev'
import prodConfig from './prod'

function getLanIp(): string {
  const interfaces = os.networkInterfaces()
  const candidates: Array<{ ip: string; score: number }> = []

  for (const nets of Object.values(interfaces)) {
    if (!nets) continue
    for (const net of nets) {
      if (!net || net.family !== 'IPv4' || net.internal || !net.address) continue
      const ip = net.address
      let score = 0
      if (ip.startsWith('192.168.')) score = 3
      else if (ip.startsWith('10.')) score = 2
      else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) score = 1
      candidates.push({ ip, score })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]?.ip || '127.0.0.1'
}

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge, _opts) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'word-graph',
    date: '2025-10-1',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      430: 1.744,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      "@tarojs/plugin-generator",
      "@tarojs/plugin-html",
    ],
    defineConstants: {
      'process.env.TARO_APP_API_BASE_URL': JSON.stringify(
        process.env.TARO_APP_API_BASE_URL || `http://${getLanIp()}:25051`,
      ),
    },
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    alias: {
      "@": path.resolve(__dirname, '..', 'src'),
    },
    framework: 'react',
    compiler: 'vite',
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
    sass: {
      data: '$hd: 1;'
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',

      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      esnextModules: ["@taroify"],
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }

  process.env.BROWSERSLIST_ENV = process.env.NODE_ENV

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
