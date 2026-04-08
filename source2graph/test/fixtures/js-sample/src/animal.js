export class Animal {
  constructor(name, sound) {
    this.name = name
    this.sound = sound
  }

  speak() {
    return `${this.name} says ${this.sound}`
  }

  toString() {
    return `Animal(${this.name})`
  }
}

export class Dog extends Animal {
  constructor(name) {
    super(name, 'woof')
    this.tricks = []
  }

  learn(trick) {
    this.tricks.push(trick)
  }

  perform() {
    return this.tricks.map((t) => `${this.name} performs ${t}`)
  }
}
