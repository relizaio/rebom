const { ApolloServer, gql } = require('apollo-server')
const utils = require('./utils')

type GqlUrl = {
    url: string
}

// The GraphQL schema
const typeDefs = gql`
  type Query {
    "A simple type for getting started!"
    hello: String,
    dbtest: String
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    dbtest: () => {
      utils.runQuery('select * from pg_catalog.pg_roles', [])
      return 'done'
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