import gql from 'graphql-tag'

// The GraphQL schema
const typeDefs = gql`
  type Query {
    hello: String
    dbtest: String
    allBoms: [Bom]
    findBom(bomSearch: BomSearch): [Bom]
    bomById(id: ID): Object
    mergeBoms(ids: [ID]!, rebomOptions: RebomOptions!): Object
  }

  type Mutation {
    addBom(bomInput: BomInput!): Bom
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
    rebomOptions: RebomOptions
  }

  input RebomOptions {
    name: String!
    group: String!
    version: String!
    bomSource: String
    tldOnly: Boolean
    releaseId: ID
  }

  input RootComponentOverrideInput {
    name: String!
    group: String!
    version: String!
    bomSource: String!
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

  input BomMerge {
    ids: ID,
    version: String,
    name: String,
    group: String
  }

  scalar Object
  scalar DateTime
`;

export default typeDefs;