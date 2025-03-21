import gql from 'graphql-tag';

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
    mergeAndStoreBoms(ids: [ID]!, rebomOptions: RebomOptions!): Bom
  }

  type Bom {
    uuid: ID!
    createdDate: DateTime
    lastUpdatedDate: DateTime
    meta: Object
    bom: Object
    tags: Object
    organization: ID
    public: Boolean
    bomVersion: String
    group: String
    name: String
    version: String
    duplicate: Boolean
  }

  input BomInput {
    meta: String
    bom: Object
    tags: Object
    rebomOptions: RebomOptions
  }

  input RebomOptions {
    # rebomOverride: RebomOverride
    # mergeOptions: RebomMergeOptions
    # releaseId: ID
    name: String
    group: String
    version: String
    hash: String
    belongsTo: String
    tldOnly: Boolean
    structure: String
    notes: String
  }

  input RebomOverride {
    name: String!
    group: String!
    version: String!
    belongsTo: String
    hash: String
  }
  input RebomMergeOptions {
    belongsTo: String
    tldOnly: Boolean!
    structure: String!
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