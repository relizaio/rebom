<template>
    <div>
        Hello page {{ vTitle }}
        Fetched hello: {{ hello }}
        <div>
            <v-text-field
            label="Main input"
            hide-details="auto"
            ></v-text-field>
            <v-text-field label="Another input"></v-text-field>
        </div>
    </div>
</template>

<script lang="ts">
import { ref } from 'vue'
import { computed } from 'vue'
import gql from 'graphql-tag'
import graphqlClient from '../utils/graphql'

export default {
    name: 'Home',
    props: {
        msg: String
    },
    async setup(props: any) {
        const vTitle = computed(() => '-' + props.msg + '-')
        const hello = await fetchHello()
        let bomSearchObj : BomSearch = {
            bomSearch: {
                serialNumber: '',
                version: '',
                componentVersion: '',
                componentGroup: '',
                componentName: ''
            }
        }
        const boms = await searchBom(bomSearchObj)

        const items = ref(['This', 'is'])

        return {
            boms,
            vTitle,
            items,
            hello
        }
    }
}

type BomSearch = {
  bomSearch: {
    serialNumber: string,
    version: string,
    componentVersion: string,
    componentGroup: string,
    componentName: string
  }
}

async function fetchHello() {
    const response = await graphqlClient.query({
        query: gql`
            query {
                hello
            }`
    })
    console.log(response.data)
    return response.data.hello
}

async function searchBom(bomSearch: BomSearch) {
    const response = await graphqlClient.query({
        query: gql`
            query findBom ($bomSearch: BomSearch) {
                findBom(bomSearch: $bomSearch) {
                    uuid
                    meta
                }
            }`,
        variables: bomSearch
    })
    console.log(response.data)
    return response.data.bomSearch
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
