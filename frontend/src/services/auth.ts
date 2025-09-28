import { api } from "./api"

export interface LoginResponse {
  access_token: string
  token_type: string
}

export const login = async (username: string, password: string) => {
  const response = await api.post<LoginResponse>("/login/access-token", {
    username,
    password,
  })
  return response.data
}

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post("/users/", {
    username,
    email,
    password,
  })
  return response.data
}
