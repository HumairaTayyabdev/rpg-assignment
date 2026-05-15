import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { getAuthToken } from '@/utils/auth-storage'

function graphqlWsUri(): string {
  const explicit = import.meta.env.VITE_GRAPHQL_WS_URL ?? 'ws://localhost:3200/graphql-ws'
  if (typeof explicit === 'string' && explicit.length > 0) {
    return explicit
  }

  const http = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3200/graphql'
  try {
    const u = new URL(http)
    u.pathname = '/graphql-ws'
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    const ws = http.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://')
    return ws.replace(/\/graphql\/?(\?|$)/, '/graphql-ws$1')
  }
}

export function createApolloClient(): ApolloClient {
  const httpLink = createHttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3200/graphql',
  })

  const authLink = setContext((_, { headers }) => {
    const token = getAuthToken()
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  })

  const wsLink = new GraphQLWsLink(
    createClient({
      url: graphqlWsUri(),
      connectionParams: () => {
        const token = getAuthToken()
        return token ? { authorization: `Bearer ${token}` } : {}
      },
    }),
  )

  const link = split(
    ({ query }) => {
      const definition = getMainDefinition(query)
      return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
    },
    wsLink,
    authLink.concat(httpLink),
  )

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
  })
}
