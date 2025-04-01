package edu.usc.csci310.project.services;

import edu.usc.csci310.project.model.WordCloudSong;
import edu.usc.csci310.project.repository.WordCloudRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WordCloudServiceTest {

    private WordCloudRepository wordCloudRepository;
    private WordCloudService wordCloudService;

    @BeforeEach
    void setUp() {
        wordCloudRepository = mock(WordCloudRepository.class);
        wordCloudService = new WordCloudService(wordCloudRepository);
    }

    @Test
    void testAddSongsToWordCloud() {
        List<WordCloudSong> songs = List.of(
                new WordCloudSong("user1", "123", "Song 1", "url1", "img1", "2023-01-01", "Artist 1", "lyrics 1"),
                new WordCloudSong("user1", "456", "Song 2", "url2", "img2", "2023-01-02", "Artist 2", "lyrics 2")
        );

        when(wordCloudRepository.addSongsToWordCloud(songs)).thenReturn(true);

        boolean result = wordCloudService.addSongsToWordCloud(songs);
        assertTrue(result);
        verify(wordCloudRepository).addSongsToWordCloud(songs);
    }

    @Test
    void testGetUserWordCloud() {
        List<WordCloudSong> mockSongs = List.of(
                new WordCloudSong("user1", "123", "Song A", "urlA", "imgA", "2023-02-01", "Artist A", "lyrics A")
        );

        when(wordCloudRepository.getUserWordCloud("user1")).thenReturn(mockSongs);

        List<WordCloudSong> result = wordCloudService.getUserWordCloud("user1");
        assertEquals(1, result.size());
        assertEquals("Song A", result.get(0).getTitle());
        verify(wordCloudRepository).getUserWordCloud("user1");
    }

    @Test
    void testRemoveFromWordCloud() {
        when(wordCloudRepository.removeFromWordCloud("user1", "123")).thenReturn(true);

        boolean result = wordCloudService.removeFromWordCloud("user1", "123");
        assertTrue(result);
        verify(wordCloudRepository).removeFromWordCloud("user1", "123");
    }

    @Test
    void testClearUserWordCloud() {
        when(wordCloudRepository.clearUserWordCloud("user1")).thenReturn(true);

        boolean result = wordCloudService.clearUserWordCloud("user1");
        assertTrue(result);
        verify(wordCloudRepository).clearUserWordCloud("user1");
    }
}
