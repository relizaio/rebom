<template>
  <div>
    Hello page {{ vTitle }}
  </div>
</template>

<script>
import { ref } from 'vue'
import { computed } from 'vue'

export default {
  name: 'Home',
  props: {
    msg: String
  },
  setup(props) {
    const vTitle = computed(() => '-' + props.msg + '-')

    const items = ref(['This', 'is'])
    const itemsQuantity = computed(() => items.value.length)

    return {
      vTitle,
      items,
      itemsQuantity
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
