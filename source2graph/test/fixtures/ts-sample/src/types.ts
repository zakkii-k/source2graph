export interface Repository<T> {
  findById(id: string): T | undefined
  save(entity: T): T
  delete(id: string): void
}

export interface Entity {
  id: string
  createdAt: Date
}
