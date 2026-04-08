package com.example.service

import com.example.model.User
import com.example.repository.UserRepository
import scala.collection.mutable.ListBuffer

class UserService(val repo: UserRepository) {
  private val cache: ListBuffer[User] = ListBuffer.empty

  def findById(id: Long): Option[User] = {
    repo.findById(id)
  }

  def createUser(name: String, email: String): User = {
    val user = User(0L, name, email)
    repo.save(user)
  }
}

object UserService {
  def apply(repo: UserRepository): UserService = new UserService(repo)
}
