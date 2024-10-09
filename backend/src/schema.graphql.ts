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
    mergeAndStoreBoms(ids: [ID]!, rebomOptions: RebomOptions!): Bom
  }

  type Mutation {
    addBom(bomInput: BomInput!): Bom
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
    rebomType: String
    tldOnly: Boolean
    structure: String
    notes: String
  }

  input RebomOverride {
    name: String!
    group: String!
    version: String!
    rebomType: String
    hash: String
  }
  input RebomMergeOptions {
    rebomType: String
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