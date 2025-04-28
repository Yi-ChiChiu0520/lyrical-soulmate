package edu.usc.csci310.project.services;

import edu.usc.csci310.project.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean isFavoritesPrivate(String username) {
        return userRepository.isFavoritesPrivate(username);
    }

    public void setFavoritesPrivacy(String username, boolean isPrivate) {
        userRepository.updateFavoritesPrivacy(username, isPrivate);
    }
}
