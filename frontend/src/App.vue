<template>
  <v-app>
    <v-main>
      <Home msg="abc"/>
    </v-main>
  </v-app>
</template>

<script>
import Home from './components/Home.vue'

export default {
  name: 'App',

  components: {
    Home,
  },

  data: () => ({
    //
  }),
}
</script>
