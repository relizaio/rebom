const { ApolloServer, gql } = require('apollo-server')
const utils = require('./utils')

type GqlUrl = {
    url: string
}

type BomRecord = {
  uuid: string,
  created_date: Date,
  last_updated_date: Date,
  meta: string,
  bom: Object,
  tags: Object,
  organization: string,
  public: boolean
}

type BomInput = {
  bomInput: {
    meta: string,
    bom: any,
    tags: Object
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

type SearchObject = {
  queryText: string,
  queryParams: string[],
  paramId: number
}

// The GraphQL schema
const typeDefs = gql`
  type Query {
    hello: String
    dbtest: String
    allBoms: [Bom]
    findBom(bomSearch: BomSearch): [Bom]
    bomById(id: ID): Object
  }

  type Mutation {
    addBom(bomInput: BomInput): Bom
  }

  type Bom {
    uuid: ID!
    created_date: DateTime
    last_updated_date: DateTime
    meta: String
    bom: Object
    tags: Object
    organization: ID
    public: Boolean
  }

  input BomInput {
    meta: String
    bom: Object
    tags: Object
  }

  input BomSearch {
    serialNumber: ID
    version: String
    componentVersion: String
    componentGroup: String
    componentName: String
  }

  scalar Object
  scalar DateTime
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    allBoms: async () => {
      let queryRes = await utils.runQuery('select * from rebom.boms', []) 
      let boms = queryRes.rows as BomRecord[]
      return boms
    },
    findBom: async (parent: any, bomSearch : BomSearch) => {
      return findBom(bomSearch)
    },
    bomById: async (parent: any, id: any): Promise<Object> => {
      console.log('id is = ' + id)
      console.log(id)
      let retObj = {}
      let byIdRows = await utils.runQuery(`select * from rebom.boms where uuid = $1`, [id.id])
      if (byIdRows && byIdRows.rows && byIdRows.rows[0]) {
        retObj = byIdRows.rows[0].bom
      }
      return retObj
    }
  },
  Mutation: {
    addBom: async (parent : any, bomInput : BomInput): Promise<BomRecord> => {
      // urn must be unique - if same urn is supplied, we update current record
      // similarly it works for version, component group, component name, component version
      // check if urn is set on bom
      let queryText = 'INSERT INTO rebom.boms (meta, bom, tags) VALUES ($1, $2, $3) RETURNING *'
      let queryParams = [bomInput.bomInput.meta, bomInput.bomInput.bom, bomInput.bomInput.tags]
      if (bomInput.bomInput.bom.serialNumber) {
        let bomSearch: BomSearch = {
          bomSearch: {
            serialNumber: bomInput.bomInput.bom.serialNumber as string,
            version: '',
            componentVersion: '',
            componentGroup: '',
            componentName: ''
          }
        }
        // if bom record found then update, otherwise insert
        let bomRecord = await findBom(bomSearch)

        // if not found, re-try search by version and component details
        if (!bomRecord || !bomRecord.length) {
          bomSearch = {
            bomSearch: {
              serialNumber: '',
              version: bomInput.bomInput.bom.version as string,
              componentVersion: bomInput.bomInput.bom.metadata.component.version as string,
              componentGroup: bomInput.bomInput.bom.metadata.component.group as string,
              componentName: bomInput.bomInput.bom.metadata.component.name as string
            }
          }
          bomRecord = await findBom(bomSearch)
        }

        if (bomRecord && bomRecord.length && bomRecord[0].uuid) {
          queryText = 'UPDATE rebom.boms SET meta = $1, bom = $2, tags = $3 WHERE uuid = $4 RETURNING *'
          queryParams = [bomInput.bomInput.meta, bomInput.bomInput.bom, bomInput.bomInput.tags, bomRecord[0].uuid]
        }
      }

      let queryRes = await utils.runQuery(queryText, queryParams)
      return queryRes.rows[0]
    }
  }
}

async function findBom (bomSearch: BomSearch): Promise<BomRecord[]> {
  let searchObject = {
    queryText: `select * from rebom.boms where 1 = 1`,
    queryParams: [],
    paramId: 1
  }

  if (bomSearch.bomSearch.serialNumber) {
    if (!bomSearch.bomSearch.serialNumber.startsWith('urn')) {
      bomSearch.bomSearch.serialNumber = 'urn:uuid:' + bomSearch.bomSearch.serialNumber
    }
    updateSearchObj(searchObject, `bom->>'serialNumber'`, bomSearch.bomSearch.serialNumber)
  }

  if (bomSearch.bomSearch.version) updateSearchObj(searchObject, `bom->>'version'`, bomSearch.bomSearch.version)

  if (bomSearch.bomSearch.componentVersion) updateSearchObj(searchObject, `bom->'metadata'->'component'->>'version'`, 
      bomSearch.bomSearch.componentVersion)
  
  if (bomSearch.bomSearch.componentGroup) updateSearchObj(searchObject, `bom->'metadata'->'component'->>'group'`, 
      bomSearch.bomSearch.componentGroup)
  
  if (bomSearch.bomSearch.componentName) updateSearchObj(searchObject, `bom->'metadata'->'component'->>'name'`, 
      bomSearch.bomSearch.componentName)

  let queryRes = await utils.runQuery(searchObject.queryText, searchObject.queryParams)
  return queryRes.rows
}

function updateSearchObj(searchObject: SearchObject, queryPath: string, addParam: string) {
  searchObject.queryText += `AND ${queryPath} = $${searchObject.paramId}`
  searchObject.queryParams.push(addParam)
  ++searchObject.paramId
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(( gqlUrl: GqlUrl ) => {
  console.log(`🚀 Server ready at ${gqlUrl.url}`)
})