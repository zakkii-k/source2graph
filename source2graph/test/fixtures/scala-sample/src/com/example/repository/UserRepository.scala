package com.example.repository

import com.example.model.User

trait UserRepository {
  def findById(id: Long): Option[User]
  def save(user: User): User
  def delete(id: Long): Unit
}
