package edu.usc.csci310.project.model;

public class WordCloudSong {
    private String username;
    private String songId;
    private String title;
    private String url;
    private String imageUrl;
    private String releaseDate;
    private String artistName;
    private String lyrics;

    public WordCloudSong() {}

    public WordCloudSong(String username, String songId, String title, String url, String imageUrl,
                         String releaseDate, String artistName, String lyrics) {
        this.username = username;
        this.songId = songId;
        this.title = title;
        this.url = url;
        this.imageUrl = imageUrl;
        this.releaseDate = releaseDate;
        this.artistName = artistName;
        this.lyrics = lyrics;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getSongId() {
        return songId;
    }

    public void setSongId(String songId) {
        this.songId = songId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(String releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getArtistName() {
        return artistName;
    }

    public void setArtistName(String artistName) {
        this.artistName = artistName;
    }

    public String getLyrics() {
        return lyrics;
    }

    public void setLyrics(String lyrics) {
        this.lyrics = lyrics;
    }
}
