import { ApolloError } from '@apollo/client/core'

export function extractGraphQLErrorMessage(error: unknown): string {
  if (error instanceof ApolloError) {
    if (error.graphQLErrors?.length) {
      return error.graphQLErrors.map((e) => e.message).join(' ')
    }

    if (error.networkError && 'message' in error.networkError) {
      return String(error.networkError.message)
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}
