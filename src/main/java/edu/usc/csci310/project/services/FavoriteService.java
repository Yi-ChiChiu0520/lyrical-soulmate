package edu.usc.csci310.project.services;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.repository.FavoriteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;

    @Autowired
    public FavoriteService(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    /**
     * Adds a song to the user's favorites.
     */
    public boolean addFavorite(String username, String songId, String title, String url, String imageUrl, String releaseDate, String artistName, String lyrics) {
        return favoriteRepository.addFavorite(username, songId, title, url, imageUrl, releaseDate, artistName, lyrics);
    }

    /**
     * Retrieves all favorite songs for a user.
     */
    public List<FavoriteSong> getFavorites(String username) {
        return favoriteRepository.getFavorites(username);
    }

    /**
     * Removes a song from a user's favorites.
     */
    public boolean removeFavorite(String username, String songId) {
        return favoriteRepository.removeFavorite(username, songId);
    }

    public boolean swapRanks(String username, int rank1, int rank2) {
        return favoriteRepository.swapRanks(username, rank1, rank2);
    }
}
