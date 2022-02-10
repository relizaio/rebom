<template>
    <div>
        <h1>Rebom - Catalog of Software Bills of Materials</h1>
        <div>
            <v-text-field
                label="Search Query"
                hide-details="auto"
                v-model="searchQuery"
            >
                <template v-slot:append>
                    <v-btn 
                        variant="contained-text"
                        size="x-large"
                        @click="userSearch">
                        Find
                    </v-btn>
                </template>
            </v-text-field>
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
                    <a :href="'/restapi/bomById/' + b.uuid" target="_blank" rel="noopener noreferrer" title="Open Bom in New Tab">
                        <v-icon>mdi-eye-outline</v-icon>
                    </a>
                    <a :href="'/restapi/bomById/' + b.uuid + '?download=true'" target="_blank" rel="noopener noreferrer" title="Download Bom">
                        <v-icon>mdi-download-outline</v-icon>
                    </a>
                </td>
            </tr>
            </tbody>
        </v-table>
        <div>end of doc</div>
    </div>
</template>

<script lang="ts">
// import { ref } from 'vue'
// import { computed } from 'vue'
import gql from 'graphql-tag'
import graphqlClient from '../utils/graphql'

// import { useModelWrapper } from '../utils/utils'
import { ref } from 'vue';

export default {
    name: 'Home',
    props: { 
        queryValue: String
    },
    async setup(/*props : any, { emit } : any*/) {
        let bomSearchObj : BomSearch = {
            bomSearch: {
                serialNumber: '',
                version: '',
                componentVersion: '',
                componentGroup: '',
                componentName: '',
                singleQuery: ''
            }
        }
        let boms = ref(await searchBom(bomSearchObj))

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

        const searchQuery = ref('')
        async function userSearch () {
            console.log(searchQuery)
            bomSearchObj = {
                bomSearch: {
                    serialNumber: '',
                    version: '',
                    componentVersion: '',
                    componentGroup: '',
                    componentName: '',
                    singleQuery: searchQuery.value
                }
            }
            boms.value = await searchBom(bomSearchObj)
            console.log(boms)
        }

        return {
            boms,
            bomsTest,
            headers,
            userSearch,
            searchQuery
        }
    }
}

type BomSearch = {
  bomSearch: {
    serialNumber: string,
    version: string,
    componentVersion: string,
    componentGroup: string,
    componentName: string,
    singleQuery: string
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
        variables: bomSearch,
        fetchPolicy: 'no-cache'
    })
    return response.data.findBom
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
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
  text-decoration: none;
}
</style>
