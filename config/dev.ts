import type { UserConfigExport } from "@tarojs/cli"

export default {
  
  mini: {},
  h5: {
    devServer: {
      port: 10086,
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.API_SERVER_PORT || '25051'}`,
          changeOrigin: true,
        },
      },
    },
  }
} satisfies UserConfigExport<'vite'>
