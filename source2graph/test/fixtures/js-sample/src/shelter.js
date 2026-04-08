import { Animal, Dog } from './animal.js'

export class Shelter {
  constructor(name) {
    this.name = name
    this.animals = []
  }

  adopt(animal) {
    this.animals.push(animal)
  }

  findByName(name) {
    return this.animals.find((a) => a.name === name)
  }

  listAll() {
    return this.animals.map((a) => a.toString())
  }
}

export function createDog(name) {
  return new Dog(name)
}

export function createShelter(name) {
  return new Shelter(name)
}
