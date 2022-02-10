import { ApolloServer, gql } from 'apollo-server-express'
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core'
import express from 'express'
import http from 'http'
const utils = require('./utils')

type BomRecord = {
  uuid: string,
  created_date: Date,
  last_updated_date: Date,
  meta: string,
  bom: any,
  tags: Object,
  organization: string,
  public: boolean
}

type BomDto = {
  uuid: string,
  createdDate: Date,
  lastUpdatedDate: Date,
  meta: string,
  bom: Object,
  tags: Object,
  organization: string,
  public: boolean,
  bomVersion: string,
  group: string,
  name: string,
  version: string
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
    componentName: string,
    singleQuery: string,
    page: number,
    offset: number
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
    createdDate: DateTime
    lastUpdatedDate: DateTime
    meta: String
    bom: Object
    tags: Object
    organization: ID
    public: Boolean
    bomVersion: String
    group: String
    name: String
    version: String
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
    componentName: String,
    singleQuery: String,
    page: Int,
    offset: Int
  }

  scalar Object
  scalar DateTime
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    allBoms: async () : Promise<BomDto[]> => {
      let queryRes = await utils.runQuery('select * from rebom.boms', []) 
      let boms = queryRes.rows as BomRecord[]
      return boms.map(b => bomRecordToDto(b))
    },
    findBom: async (parent: any, bomSearch : BomSearch) : Promise<BomDto[]> => {
      return findBom(bomSearch)
    },
    bomById: async (parent: any, id: any): Promise<Object> => {
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
            componentName: '',
            singleQuery: '',
            page: 0,
            offset: 0
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
              componentName: bomInput.bomInput.bom.metadata.component.name as string,
              singleQuery: '',
              page: 0,
              offset: 0
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

async function findBom (bomSearch: BomSearch): Promise<BomDto[]> {
  let searchObject = {
    queryText: `select * from rebom.boms where 1 = 1`,
    queryParams: [],
    paramId: 1
  }

  let bomDtos: BomDto[] = []

  if (bomSearch.bomSearch.singleQuery) {
    bomDtos = await findBomViaSingleQuery(bomSearch.bomSearch.singleQuery)
  } else {
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
    let bomRecords = queryRes.rows as BomRecord[]
    bomDtos = bomRecords.map(b => bomRecordToDto(b))
  }
  return bomDtos
}

async function findBomViaSingleQuery(singleQuery: string): Promise<BomDto[]> {
  let proceed: boolean = false
  // 1. search by uuid
  let queryRes = await utils.runQuery(`select * from rebom.boms where bom->>'serialNumber' = $1`, [singleQuery])
  proceed = (queryRes.rows.length < 1)

  if (proceed) {
    queryRes = await utils.runQuery(`select * from rebom.boms where bom->>'serialNumber' = $1`, ['urn:uuid:' + singleQuery])
    proceed = (queryRes.rows.length < 1)
  }

  // 2. search by name
  if (proceed) {
    queryRes = await utils.runQuery(`select * from rebom.boms where bom->'metadata'->'component'->>'name' like $1`, ['%' + singleQuery + '%'])
    proceed = (queryRes.rows.length < 1)
  }

  // 3. search by group
  if (proceed) {
    queryRes = await utils.runQuery(`select * from rebom.boms where bom->'metadata'->'component'->>'group' like $1`, ['%' + singleQuery + '%'])
    proceed = (queryRes.rows.length < 1)
  }

  // 3. search by version
  if (proceed) {
    queryRes = await utils.runQuery(`select * from rebom.boms where bom->'metadata'->'component'->>'version' = $1`, [singleQuery])
    proceed = (queryRes.rows.length < 1)
  }

  let bomRecords = queryRes.rows as BomRecord[]
  return bomRecords.map(b => bomRecordToDto(b))
}

function updateSearchObj(searchObject: SearchObject, queryPath: string, addParam: string) {
  searchObject.queryText += `AND ${queryPath} = $${searchObject.paramId}`
  searchObject.queryParams.push(addParam)
  ++searchObject.paramId
}

function bomRecordToDto(bomRecord: BomRecord) : BomDto {
  let version = ''
  let group = ''
  let name = ''
  let bomVersion = ''
  if (bomRecord.bom) bomVersion = bomRecord.bom.version
  if (bomRecord.bom && bomRecord.bom.metadata && bomRecord.bom.metadata.component) {
    version = bomRecord.bom.metadata.component.version
    name = bomRecord.bom.metadata.component.name
    group = bomRecord.bom.metadata.component.group
  }
  let bomDto : BomDto = {
    uuid: bomRecord.uuid,
    createdDate: bomRecord.created_date,
    lastUpdatedDate: bomRecord.last_updated_date,
    meta: bomRecord.meta,
    bom: bomRecord.bom,
    tags: bomRecord.tags,
    organization: bomRecord.organization,
    public: bomRecord.public,
    bomVersion: bomVersion,
    group: group,
    name: name,
    version: version
  }
  return bomDto
}

async function startApolloServer(typeDefs: any, resolvers: any) {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  server.applyMiddleware({ app });

  app.get('/restapi/bomById/:uuid', async (req, res) => {
      let bomId = req.params.uuid
      try {
          let retObj = {}
          let byIdRows = await utils.runQuery(`select * from rebom.boms where uuid = $1`, [bomId])
          if (byIdRows && byIdRows.rows && byIdRows.rows[0]) {
              retObj = byIdRows.rows[0].bom
          }
          if (req.query.download) {
            res.type('application/octet-stream')
          }
          res.send(retObj)
      } catch (error) {
          console.error('Errored bom for id = ' + bomId)
          res.statusCode = 404
          res.send('Bom not found')
      }
  })

  await new Promise<void>(resolve => httpServer.listen({ port: 4000 }, resolve));
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

startApolloServer(typeDefs, resolvers)