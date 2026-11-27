export type UserType = 'customer' | 'admin'

export type CreateUserPayload = {
  email: string
  name: string
  password: string
  user_type: UserType
  address?: string | null
}

export type UserRecord = Omit<CreateUserPayload, 'password'> & {
  _id: string
  createdAt: string
  updatedAt: string
}