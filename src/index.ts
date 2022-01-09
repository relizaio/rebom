const { ApolloServer, gql } = require('apollo-server');

type GqlUrl = {
    url: string
}

// The GraphQL schema
const typeDefs = gql`
  type Query {
    "A simple type for getting started!"
    hello: String
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(( gqlUrl: GqlUrl ) => {
  console.log(`🚀 Server ready at ${gqlUrl.url}`);
});