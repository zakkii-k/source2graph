package com.example.service;

import com.example.model.User;
import com.example.repository.UserRepository;
import java.util.List;
import java.util.Optional;

public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> findUser(Long id) {
        return userRepository.findById(id);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User createUser(String name, String email) {
        User user = new User(null, name, email);
        return userRepository.save(user);
    }

    public boolean validateUser(User user) {
        if (user.getName() == null || user.getName().isBlank()) {
            return false;
        }
        if (user.getEmail() == null || !user.getEmail().contains("@")) {
            return false;
        }
        return true;
    }
}
