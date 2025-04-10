package edu.usc.csci310.project.services;

import edu.usc.csci310.project.model.WordCloudSong;
import edu.usc.csci310.project.repository.WordCloudRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class WordCloudService {

    private final WordCloudRepository wordCloudRepository;

    @Autowired
    public WordCloudService(WordCloudRepository wordCloudRepository) {
        this.wordCloudRepository = wordCloudRepository;
    }

    public boolean addSongsToWordCloud(List<WordCloudSong> songs) {
        return wordCloudRepository.addSongsToWordCloud(songs);
    }

    public List<WordCloudSong> getUserWordCloud(String username) {
        return wordCloudRepository.getUserWordCloud(username);
    }

    public boolean removeFromWordCloud(String username, String songId) {
        return wordCloudRepository.removeFromWordCloud(username, songId);
    }

    public boolean clearUserWordCloud(String username) {
        return wordCloudRepository.clearUserWordCloud(username);
    }


}
