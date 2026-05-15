import { gql } from '@apollo/client/core'

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      createdAt
    }
  }
`

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      token
      user {
        id
        name
        email
        createdAt
      }
    }
  }
`

export const LOG_IN_MUTATION = gql`
  mutation LogIn($input: LogInInput!) {
    logIn(input: $input) {
      token
      user {
        id
        name
        email
        createdAt
      }
    }
  }
`
