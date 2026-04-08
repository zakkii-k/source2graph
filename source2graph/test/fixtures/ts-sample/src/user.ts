import type { Entity } from './types.js'

export class User implements Entity {
  id: string
  name: string
  email: string
  createdAt: Date

  constructor(id: string, name: string, email: string) {
    this.id = id
    this.name = name
    this.email = email
    this.createdAt = new Date()
  }

  getDisplayName(): string {
    return `${this.name} <${this.email}>`
  }
}

export class AdminUser extends User {
  role: string

  constructor(id: string, name: string, email: string) {
    super(id, name, email)
    this.role = 'admin'
  }

  hasPermission(action: string): boolean {
    return this.role === 'admin'
  }
}
