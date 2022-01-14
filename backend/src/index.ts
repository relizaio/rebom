const { ApolloServer, gql } = require('apollo-server')
const utils = require('./utils')

type GqlUrl = {
    url: string
}

type Bom = {
  uuid: string,
  created_date: Date,
  last_updated_date: Date,
  meta: string,
  bom: Object,
  tags: Object
}

// The GraphQL schema
const typeDefs = gql`
  type Query {
    "A simple type for getting started!"
    hello: String,
    dbtest: String
    allBoms: [Bom]
  }

  type Bom {
    uuid: ID!
    created_date: DateTime
    last_updated_date: DateTime
    meta: String
    bom: Object
    tags: Object
  }

  scalar Object
  scalar DateTime
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    dbtest: () => {
      utils.runQuery('select * from pg_catalog.pg_roles', [])
      return 'done'
    },
    allBoms: async () => {
      let queryRes = await utils.runQuery('select * from rebom.boms', []) 
      let boms = queryRes.rows as Bom[]
      console.log(boms)
      return boms
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(( gqlUrl: GqlUrl ) => {
  console.log(`🚀 Server ready at ${gqlUrl.url}`);
});