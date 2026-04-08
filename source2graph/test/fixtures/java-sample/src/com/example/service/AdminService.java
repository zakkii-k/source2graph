package com.example.service;

import com.example.model.User;
import com.example.repository.UserRepository;
import java.util.List;

public class AdminService extends UserService {
    public AdminService(UserRepository userRepository) {
        super(userRepository);
    }

    public List<User> listAllUsers() {
        return getAllUsers();
    }

    public void deleteUser(Long id, UserRepository repo) {
        repo.deleteById(id);
    }
}
