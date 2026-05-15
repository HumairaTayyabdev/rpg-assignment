export interface AuthUser {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface AuthPayload {
  token: string
  user: AuthUser
}

export interface SignUpResponse {
  signUp: AuthPayload
}

export interface LogInResponse {
  logIn: AuthPayload
}

export interface MeResponse {
  me: AuthUser | null
}

export interface SignUpVariables {
  input: {
    name: string
    email: string
    password: string
  }
}

export interface LogInVariables {
  input: {
    email: string
    password: string
  }
}
