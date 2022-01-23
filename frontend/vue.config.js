module.exports = {
  pluginOptions: {
    vuetify: {
			// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
		}
  },
  devServer: {
    port: 3005,
    proxy: {
        '^/graphql': {
            target: 'http://localhost:4000',
            ws: true,
            changeOrigin: true
        }
    }
  }
}