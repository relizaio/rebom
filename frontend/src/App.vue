<template>
    <Suspense>
        <template #default>
            <Home msg="abc"/>
        </template>
        <template #fallback>
            <div>Loading...</div>
        </template>
    </Suspense>
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
