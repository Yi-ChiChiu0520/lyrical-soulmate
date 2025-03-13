package edu.usc.csci310.project.model;

public class FavoriteSong {
    private String username;
    private String songId;
    private String title;
    private String url;
    private String imageUrl;
    private String releaseDate;
    private String artistName;
    private int rank;  // ✅ Add rank field

    // ✅ Constructor including rank
    public FavoriteSong(String username, String songId, String title, String url, String imageUrl, String releaseDate, String artistName, int rank) {
        this.username = username;
        this.songId = songId;
        this.title = title;
        this.url = url;
        this.imageUrl = imageUrl;
        this.releaseDate = releaseDate;
        this.artistName = artistName;
        this.rank = rank;  // ✅ Assign rank
    }

    // ✅ Getter and Setter for rank
    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public String getArtistName() { return artistName; }
    public void setArtistName(String artistName) { this.artistName = artistName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getSongId() { return songId; }
    public void setSongId(String songId) { this.songId = songId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getReleaseDate() { return releaseDate; }
    public void setReleaseDate(String releaseDate) { this.releaseDate = releaseDate; }
}
