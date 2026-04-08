import { User } from './user.js'
import type { Repository } from './types.js'

export class UserService {
  constructor(private readonly repo: Repository<User>) {}

  getUser(id: string): User | undefined {
    return this.repo.findById(id)
  }

  createUser(id: string, name: string, email: string): User {
    const user = new User(id, name, email)
    return this.repo.save(user)
  }
}

export function validateEmail(email: string): boolean {
  return email.includes('@') && email.includes('.')
}
