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
        <v-table height="600px">
            <thead>
            <tr>
                <th class="text-left">
                Bom Version
                </th>
                <th class="text-left">
                Group
                </th>
                <th class="text-left">
                Name
                </th>
                <th class="text-left">
                Version
                </th>
                <th class="text-left">
                Actions
                </th>
            </tr>
            </thead>
            <tbody>
            <tr
                v-for="b in boms"
                :key="b.uuid"
            >
                <td class="text-left">{{ b.bomVersion }}</td>
                <td class="text-left">{{ b.group }}</td>
                <td class="text-left">{{ b.name }}</td>
                <td class="text-left">{{ b.version }}</td>
                <td class="text-left">
                    <v-icon>mdi-eye-outline</v-icon>
                    <v-icon>mdi-download-outline</v-icon>
                </td>
            </tr>
            </tbody>
        </v-table>
        <div>end of doc</div>
    </div>
</template>

<script lang="ts">
// import { ref } from 'vue'
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

        const headers = [
            {text: 'Bom Version', value: 'bomversion'}, 
            {text: 'Group', value: 'group'},
            {text: 'Name', value: 'name'}, 
            {text: 'Component Version', value: 'version'},
            {text: 'Actions', value: 'actions'}
        ]

        const bomsTest = [
            {
                bomversion: '1',
                group: '2',
                name: '3',
                version: '4',
                actions: '5'
            }
        ]

        return {
            boms,
            bomsTest,
            vTitle,
            headers
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

async function searchBom(bomSearch: BomSearch) {
    const response = await graphqlClient.query({
        query: gql`
            query findBom ($bomSearch: BomSearch) {
                findBom(bomSearch: $bomSearch) {
                    uuid
                    meta
                    version
                    bomVersion
                    group
                    name
                }
            }`,
        variables: bomSearch
    })
    return response.data.findBom
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
