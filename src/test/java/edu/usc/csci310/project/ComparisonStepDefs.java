package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import io.cucumber.java.Before;
import org.openqa.selenium.interactions.Actions;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;
import org.openqa.selenium.TimeoutException;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import java.util.HashMap;

public class ComparisonStepDefs {
    private final WebDriver driver;
    private final Connection connection;
    private String currentUser;
    private final UserRepository userRepository;

    public ComparisonStepDefs(Connection connection) {
        this.driver = DriverManager.getDriver();
        this.connection = connection;
        this.userRepository = new UserRepository(connection);
    }

    // --- Helper Methods ---

    private void ensureUserExists(String username) {
        if (userRepository.getHashedUsernameFromRaw(username).isEmpty()) {
            DriverManager.createUserWithUsername(connection, username);
        } else {
            System.out.println("User '" + username + "' already exists, skipping creation.");
        }
    }

    // --- Lifecycle Hooks ---

    @Before
    public void beforeScenario() {
        try {
            driver.manage().deleteAllCookies();
            ((JavascriptExecutor) driver).executeScript("window.localStorage.clear();");
            System.out.println("Browser cookies and localStorage cleared.");
        } catch (Exception e) {
            System.err.println("Warning: Could not clear browser state: " + e.getMessage());
        }
        DriverManager.resetUserDatabase(connection);
        System.out.println("Database reset before scenario execution.");
    }

    // --- Setup and Authentication Steps ---

    @Given("I am authenticated as {string}")
    public void iAmAuthenticatedAs(String username) {
        this.currentUser = username;
        ensureUserExists(username);

        driver.get("https://localhost:8080/login");
        WebElement usernameField = new WebDriverWait(driver, Duration.ofSeconds(5))
            .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[placeholder='Username']")));
        WebElement passwordField = driver.findElement(By.cssSelector("input[placeholder='Password']"));
        WebElement loginButton = driver.findElement(By.id("loginButton"));

        usernameField.sendKeys(username);
        passwordField.sendKeys("Valid1Pass");
        loginButton.click();

        new WebDriverWait(driver, Duration.ofSeconds(5))
            .until(ExpectedConditions.urlContains("dashboard"));
    }

    // --- Data Setup ---

    @Given("for comparison, I have added {string} to my favorites")
    public void forComparisonIHaveAddedToMyFavorites(String songTitle) {
        if (this.currentUser == null) {
            throw new IllegalStateException("Current user not set. Ensure 'I am authenticated as' step runs first.");
        }

        String[] parts = songTitle.split(" by ", 2);
        String title = parts[0];
        String artistName = parts.length == 2 ? parts[1] : "Unknown Artist";
        String songId = "mock-song-" + title.toLowerCase().replace(" ", "-");

        String sql = "INSERT OR IGNORE INTO favorites (username, song_id, title, url, image_url, release_date, artist_name, lyrics, rank) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, this.currentUser);
            stmt.setString(2, songId);
            stmt.setString(3, songTitle);
            stmt.setString(4, "http://example.com/" + songId);
            stmt.setString(5, "http://example.com/image.jpg");
            stmt.setString(6, "2023-01-01");
            stmt.setString(7, artistName);
            stmt.setString(8, "Sample lyrics for testing");
            stmt.setInt(9, 0);

            stmt.executeUpdate();
            System.out.println("Database: Added favorite for " + this.currentUser + " - " + songTitle);
        } catch (SQLException e) {
            System.out.println("Database error when adding favorite: " + e.getMessage());
            if (!e.getMessage().contains("UNIQUE constraint failed")) {
                throw new RuntimeException("Failed to add song to favorites in database", e);
            }
        }
    }

    @Given("{string} has added {string} to their favorites")
    public void userHasAddedToFavorites(String username, String songTitle) {
        ensureUserExists(username);

        String[] parts = songTitle.split(" by ", 2);
        String title = parts[0];
        String artistName = parts.length == 2 ? parts[1] : "Unknown Artist";
        String songId = "mock-song-" + title.toLowerCase().replace(" ", "-");

        String sql = "INSERT OR IGNORE INTO favorites (username, song_id, title, url, image_url, release_date, artist_name, lyrics, rank) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.setString(2, songId);
            stmt.setString(3, songTitle);
            stmt.setString(4, "http://example.com/" + songId);
            stmt.setString(5, "http://example.com/image.jpg");
            stmt.setString(6, "2023-01-01");
            stmt.setString(7, artistName);
            stmt.setString(8, "Sample lyrics for testing");
            stmt.setInt(9, 0);

            stmt.executeUpdate();
            System.out.println("Database: Added favorite for " + username + " - " + songTitle);
        } catch (SQLException e) {
            System.out.println("Database error when adding favorite: " + e.getMessage());
            if (!e.getMessage().contains("UNIQUE constraint failed")) {
                throw new RuntimeException("Failed to add song to favorites in database", e);
            }
        }
    }

    @Given("{string} has no favorites")
    public void userHasNoFavorites(String username) {
        ensureUserExists(username);
        String sql = "DELETE FROM favorites WHERE username = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.executeUpdate();
            System.out.println("Database: Cleared favorites for " + username);
        } catch (SQLException e) {
            throw new RuntimeException("Failed to clear favorites for user " + username, e);
        }
    }

    @Given("{string} exists in the system")
    public void userExistsInSystem(String username) {
        ensureUserExists(username);
        System.out.println("Database: Ensured user exists - " + username);
    }

    @Given("{string} is private")
    public void userIsPrivate(String username) {
        ensureUserExists(username);
        
        try {
            // Set the user's favorites to private by updating the users table
            String sql = "UPDATE users SET favorites_private = 1 WHERE raw_username = ?";
            try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                stmt.setString(1, username);
                int rowsAffected = stmt.executeUpdate();
                if (rowsAffected > 0) {
                    System.out.println("Set user '" + username + "' favorites to private");
                } else {
                    System.err.println("Failed to set user '" + username + "' favorites to private");
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to set user's favorites to private: " + e.getMessage(), e);
        }
    }

    @Given("{string} doesn't exist")
    public void userDoesntExist(String username) {
        System.out.println("Testing with non-existent user: " + username);
        
        // Ensure the user really doesn't exist in the database (just to be safe)
        try {
            String sql = "DELETE FROM users WHERE raw_username = ?";
            try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                stmt.setString(1, username);
                int rowsAffected = stmt.executeUpdate();
                if (rowsAffected > 0) {
                    System.out.println("Deleted existing user '" + username + "' to ensure it doesn't exist");
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete user if it exists: " + e.getMessage(), e);
        }
    }

    // --- Page Interaction ---

    @And("I try to navigate to the friends comparison page")
    public void iTryToNavigateToTheFriendsComparisonPage() {
        driver.get("https://localhost:8080/friends");
    }

    @When("I navigate to the comparison page")
    public void iNavigateToComparisonPage() {
        driver.get("https://localhost:8080/compare");
        new WebDriverWait(driver, Duration.ofSeconds(5))
            .until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h1[text()='Compare Favorites']")));
    }

    @When("I try to navigate to the comparison page")
    public void iTryToNavigateToComparisonPage() {
        driver.get("https://localhost:8080/compare");
    }

    @When("I select {string} to compare with")
    public void iSelectUserToCompareWith(String username) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h1[text()='Compare Favorites']")));

        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.cssSelector("input[placeholder='Search by username']")
        ));
        searchInput.clear();
        searchInput.sendKeys(username);

        By suggestionSelector = By.xpath(String.format("//ul[contains(@class, 'absolute')]//li[contains(text(), '%s')]", username));
        WebElement userSuggestion = wait.until(ExpectedConditions.visibilityOfElementLocated(suggestionSelector));
        userSuggestion.click();

        WebElement addButton = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//button[text()='Add to Compare List']")
        ));
        addButton.click();
    }

    @When("I enter {string} in the comparison search field")
    public void iEnterInComparisonSearchField(String searchTerm) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.cssSelector("input[placeholder='Search by username']")
        ));
        searchInput.clear();
        searchInput.sendKeys(searchTerm);
    }

    @And("I navigate to the compare page")
    public void iNavigateToComparePage() {
        driver.get("https://localhost:8080/compare");
        new WebDriverWait(driver, Duration.ofSeconds(5))
            .until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h1[text()='Compare Favorites']")));
    }

    @When("I select {string} and {string} to compare with")
    public void iSelectUsersToCompareWith(String user1, String user2) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[placeholder='Search by username']")));
        
        // Select first user
        searchInput.clear();
        Thread.sleep(500); // Small delay to ensure clear operation
        searchInput.sendKeys(user1);
        Thread.sleep(2000); // Wait for suggestions to load
        try {
            List<WebElement> suggestions1 = wait.until(ExpectedConditions.visibilityOfAllElementsLocatedBy(By.cssSelector("ul.absolute li")));
            boolean foundUser1 = false;
            System.out.println("Suggestions for " + user1 + ":");
            for (WebElement suggestion : suggestions1) {
                String suggestionText = suggestion.getText();
                System.out.println("- " + suggestionText);
                if (suggestionText.contains(user1)) {
                    suggestion.click();
                    System.out.println("Successfully clicked suggestion for " + user1);
                    foundUser1 = true;
                    break;
                }
            }
            if (!foundUser1) {
                System.err.println("No matching suggestion found for " + user1 + ". Page source: " + driver.getPageSource());
                throw new NoSuchElementException("Suggestion for " + user1 + " not found in results.");
            }
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for suggestions for " + user1 + ". Page source: " + driver.getPageSource());
            throw e;
        }
        Thread.sleep(500); // Small delay after selection
        searchInput.clear();
        Thread.sleep(500); // Small delay to ensure clear operation

        // Select second user
        searchInput.sendKeys(user2);
        Thread.sleep(2000); // Wait for suggestions to load
        try {
            List<WebElement> suggestions2 = wait.until(ExpectedConditions.visibilityOfAllElementsLocatedBy(By.cssSelector("ul.absolute li")));
            boolean foundUser2 = false;
            System.out.println("Suggestions for " + user2 + ":");
            for (WebElement suggestion : suggestions2) {
                String suggestionText = suggestion.getText();
                System.out.println("- " + suggestionText);
                if (suggestionText.contains(user2)) {
                    suggestion.click();
                    System.out.println("Successfully clicked suggestion for " + user2);
                    foundUser2 = true;
                    break;
                }
            }
            if (!foundUser2) {
                System.err.println("No matching suggestion found for " + user2 + ". Page source: " + driver.getPageSource());
                throw new NoSuchElementException("Suggestion for " + user2 + " not found in results.");
            }
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for suggestions for " + user2 + ". Page source: " + driver.getPageSource());
            throw e;
        }
    }

    @And("I click {string}")
    public void iClickButton(String buttonText) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement button = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//button[text()='" + buttonText + "']")
        ));
        button.click();
    }

    @And("I click song {string}")
    public void iClickSong(String songTitle) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            String xpathExpression;
            if (songTitle.contains("'")) {
                String[] parts = songTitle.split("'", -1);
                StringBuilder concatExpr = new StringBuilder("concat(");
                for (int i = 0; i < parts.length; i++) {
                    if (!parts[i].isEmpty()) {
                        concatExpr.append("'").append(parts[i]).append("'");
                    }
                    if (i < parts.length - 1) {
                        concatExpr.append(", \"'\", ");
                    }
                }
                concatExpr.append(")");
                xpathExpression = "//li[contains(., " + concatExpr.toString() + ")]//div[contains(@class, 'cursor-pointer') and @role='button']";
            } else {
                xpathExpression = "//li[contains(.,'" + songTitle + "')]//div[contains(@class, 'cursor-pointer') and @role='button']";
            }

            System.out.println("Looking for song element with XPath: " + xpathExpression);
            WebElement songElement = wait.until(ExpectedConditions.elementToBeClickable(By.xpath(xpathExpression)));
            System.out.println("Found song element: " + songElement.getText());
            
            // First, check if the details section is already visible
            String songId = "mock-song-" + songTitle.split(" by ")[0].toLowerCase().replace(" ", "-");
            boolean detailsAlreadyExpanded = false;
            try {
                WebElement detailsSection = driver.findElement(By.xpath("//li[contains(.,'" + songTitle + "')]//div[contains(@class,'mt-2') and contains(@class,'text-sm')]"));
                if (detailsSection.isDisplayed()) {
                    detailsAlreadyExpanded = true;
                    System.out.println("Details section for '" + songTitle + "' is already expanded. Skipping click.");
                }
            } catch (Exception e) {
                // Details section not found, which is expected if not expanded
            }
            
            // Only click if the details are not already expanded
            if (!detailsAlreadyExpanded) {
                songElement.click();
                System.out.println("Clicked on song: " + songTitle);
                
                // Wait for the details section to appear
                wait.until(ExpectedConditions.visibilityOfElementLocated(
                    By.xpath("//li[contains(.,'" + songTitle + "')]//div[contains(@class,'mt-2') and contains(@class,'text-sm')]")
                ));
            }
            
            // Allow time for animation/UI update
            Thread.sleep(1000);
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for song element " + songTitle + ". Page source: " + driver.getPageSource());
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Then("I should see {string} ranked #{int}")
    public void iShouldSeeSongRanked(String songTitle, int rank) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            String xpathExpression;
            if (songTitle.contains("'")) {
                String[] parts = songTitle.split("'", -1);
                StringBuilder concatExpr = new StringBuilder("concat(");
                for (int i = 0; i < parts.length; i++) {
                    if (!parts[i].isEmpty()) {
                        concatExpr.append("'").append(parts[i]).append("'");
                    }
                    if (i < parts.length - 1) {
                        concatExpr.append(", \"'\", ");
                    }
                }
                concatExpr.append(")");
                xpathExpression = "//li//span[contains(text(), " + concatExpr.toString() + ")]";
            } else {
                xpathExpression = "//li//span[contains(text(), '" + songTitle + "')]";
            }
            WebElement songElement = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath(xpathExpression)));
            WebElement rankElement = songElement.findElement(By.xpath("../../div[2]"));
            String rankText = rankElement.getText();
            System.out.println("Found " + songTitle + " with rank: " + rankText);
            assertEquals("#" + rank, rankText, "Expected " + songTitle + " to be ranked #" + rank + ", but found " + rankText);
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for song element " + songTitle + ". Page source: " + driver.getPageSource());
            throw e;
        }
    }

    // --- Assertion Steps ---

    @Then("I should be redirected to the login page from comparison")
    public void iShouldBeRedirectedToTheLoginPageFromComparison() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        wait.until(ExpectedConditions.urlToBe("https://localhost:8080/"));
        assertEquals("https://localhost:8080/", driver.getCurrentUrl(), "User was not redirected to the login page.");
    }

    @Then("I should see {string} in the comparison results")
    public void verifyComparisonResults(String expectedText) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        boolean textFound = wait.until(driver -> {
            return driver.getPageSource().contains(expectedText);
        });
        assertTrue(textFound, "Expected text '" + expectedText + "' not found on page");
    }

    @Then("I should see {string} in the common songs list")
    public void verifyCommonSong(String songTitle) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        boolean textFound = wait.until(driver -> {
            return driver.getPageSource().contains(songTitle);
        });
        assertTrue(textFound, "Song '" + songTitle + "' not found on page");
    }

    @Then("I should see {int} users have {string} in the comparison results")
    public void verifyComparisonResultsWithUserCount(int userCount, String songTitle) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        boolean textFound = wait.until(driver -> {
            String pageSource = driver.getPageSource();
            if (!pageSource.contains(songTitle)) {
                return false;
            }
            String expectedCountText1 = userCount + " friend";
            String expectedCountText2 = userCount + " user";
            return pageSource.contains(expectedCountText1) || pageSource.contains(expectedCountText2);
        });
        assertTrue(textFound, "Expected to see '" + songTitle + "' with " + userCount + " user(s)/friend(s) in the comparison results, but it was not found on the page");
    }

    @Then("I should see {int} user has {string} in the comparison results")
    public void verifyComparisonResultsWithSingleUserCount(int userCount, String songTitle) {
        verifyComparisonResultsWithUserCount(userCount, songTitle);
    }

    @Then("I should see no common songs in the comparison results")
    public void verifyNoCommonSongs() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        boolean noSongsWithMultipleUsers = wait.until(driver -> {
            try {
                By headingSelector = By.xpath("//h2[text()='Favorite Songs by Everyone']");
                wait.until(ExpectedConditions.presenceOfElementLocated(headingSelector));

                By ulSelector = By.xpath("//h2[text()='Favorite Songs by Everyone']/following-sibling::ul");
                List<WebElement> ulElements = driver.findElements(ulSelector);

                if (ulElements.isEmpty()) {
                    System.out.println("No <ul> found after heading. Assuming no common songs.");
                    return true;
                }

                WebElement ulElement = ulElements.get(0);
                List<WebElement> songItems = ulElement.findElements(By.tagName("li"));

                if (songItems.isEmpty()) {
                    System.out.println("<ul> found but contains no <li> items. Assuming no common songs.");
                    return true;
                }

                for (WebElement item : songItems) {
                    String itemText = item.getText();
                    if (itemText.matches(".*([2-9]|[1-9][0-9]+) friend\\(s\\) have this song.*")) {
                       System.out.println("Found song with more than 1 user: " + itemText);
                       return false; // Found a common song
                    }
                }

                System.out.println("No song found with >1 user count.");
                return true; // No common songs found

            } catch (NoSuchElementException e) {
                System.out.println("Heading 'Favorite Songs by Everyone' not found. Assuming no common songs or page error.");
                return true;
            } catch (Exception e) {
                System.err.println("Unexpected exception during common song check: " + e.getMessage());
                return false;
            }
        });
        assertTrue(noSongsWithMultipleUsers, "Expected no common songs (no song favorited by >1 selected user), but found songs shared by multiple users.");
    }

    @Then("I should see suggestions containing {string}")
    public void iShouldSeeSuggestionsContaining(String username) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement suggestionsList = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.cssSelector("ul.absolute")
        ));
        List<WebElement> suggestions = suggestionsList.findElements(By.tagName("li"));
        
        boolean found = false;
        for (WebElement suggestion : suggestions) {
            if (suggestion.getText().contains(username)) {
                found = true;
                break;
            }
        }
        
        assertTrue(found, "Expected to see suggestion containing '" + username + "', but it was not found in the suggestions list");
    }

    @Then("I search for {string}")
    public void iSearchFor(String username) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[placeholder='Search by username']")));
        searchInput.clear();
        Thread.sleep(500); // Small delay to ensure clear operation
        searchInput.sendKeys(username);
        Thread.sleep(2000); // Wait for suggestions to load
        try {
            List<WebElement> suggestions = wait.until(ExpectedConditions.visibilityOfAllElementsLocatedBy(By.cssSelector("ul.absolute li")));
            boolean foundUser = false;
            System.out.println("Suggestions for " + username + ":");
            for (WebElement suggestion : suggestions) {
                String suggestionText = suggestion.getText();
                System.out.println("- " + suggestionText);
                if (suggestionText.contains(username)) {
                    suggestion.click();
                    System.out.println("Successfully clicked suggestion for " + username);
                    foundUser = true;
                    break;
                }
            }
            if (!foundUser) {
                System.err.println("No matching suggestion found for " + username + ". Page source: " + driver.getPageSource());
                throw new NoSuchElementException("Suggestion for " + username + " not found in results.");
            }
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for suggestions for " + username + ". Page source: " + driver.getPageSource());
            throw e;
        }
    }

    @Then("I should see both user's favorite lists")
    public void iShouldSeeBothUsersFavoriteLists() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        
        // Verify current user's favorites are visible
        assertTrue(wait.until((Function<WebDriver, Boolean>) d -> d.getPageSource().contains("Polly by Nirvana")), 
                   "Current user's favorite 'Polly by Nirvana' not found");
        assertTrue(wait.until((Function<WebDriver, Boolean>) d -> d.getPageSource().contains("God's Plan by Drake")), 
                   "Current user's favorite 'God's Plan by Drake' not found");
        assertTrue(wait.until((Function<WebDriver, Boolean>) d -> d.getPageSource().contains("Help by The Beatles")), 
                   "Current user's favorite 'Help by The Beatles' not found");
        
        // Verify other user's favorites are visible
        assertTrue(wait.until((Function<WebDriver, Boolean>) d -> d.getPageSource().contains("Need 2 by Pinegrove")), 
                   "Other user's favorite 'Need 2 by Pinegrove' not found");
    }

    @Then("I should see \"user6\" 's favorite list")
    public void iShouldSeeUser6FavoritesList() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        
        // Verify user6's favorites are visible
        boolean found = wait.until(driver -> {
            String pageSource = driver.getPageSource();
            return pageSource.contains("Eventually by Tame Impala");
        });
        assertTrue(found, "user6's favorite 'Eventually by Tame Impala' not found");
        
        String pageSource = driver.getPageSource();
        assertFalse(pageSource.contains("Polly by Nirvana"), 
                    "Unexpected song 'Polly by Nirvana' found in results");
        assertFalse(pageSource.contains("God's Plan by Drake"), 
                    "Unexpected song 'God's Plan by Drake' found in results");
        assertFalse(pageSource.contains("Help by The Beatles"), 
                    "Unexpected song 'Help by The Beatles' found in results");
        
        System.out.println("Current page source: " + pageSource);
    }

    @And("I hover over {string} on compare page")
    public void iHoverOver(String songTitle) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        // Find the song element by its title
        WebElement songElement = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//li[contains(.,'" + songTitle + "')]//span[contains(@class,'text-xs')]")
        ));
        
        // Hover over the element showing the favorited count
        Actions actions = new Actions(driver);
        actions.moveToElement(songElement).perform();
        
        try {
            Thread.sleep(1000); // Allow time for hover animation
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Then("I should see {string}, {string}, and {string}")
    public void iShouldSeeUsers(String user1, String user2, String user3) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        
        // Wait for the hover tooltip to appear
        WebElement tooltip = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//div[contains(@class,'absolute') and contains(@class,'bg-gray-800')]")
        ));
        
        // Get the tooltip text
        String tooltipText = tooltip.getText();
        
        // Verify all users are present
        assertTrue(tooltipText.contains(user1), "User '" + user1 + "' not found in tooltip");
        assertTrue(tooltipText.contains(user2), "User '" + user2 + "' not found in tooltip");
        assertTrue(tooltipText.contains(user3), "User '" + user3 + "' not found in tooltip");
    }

    @Then("In the details, I should see {string}, {string}, and {string}")
    public void inTheDetailsIShouldSeeUsers(String user1, String user2, String user3) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            // First check if details section is already visible
            WebElement detailsSection = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'mt-2') and contains(@class,'text-sm')]")
            ));
            
            System.out.println("Found details section: " + detailsSection.getText());
            String detailsText = detailsSection.getText();
            
            // Try to find the users section specifically
            try {
                WebElement usersSection = detailsSection.findElement(By.xpath(".//div[contains(text(), 'Favorited by')]"));
                System.out.println("Found users section: " + usersSection.getText());
                WebElement usersList = usersSection.findElement(By.xpath("./following-sibling::ul"));
                detailsText = usersList.getText();
                System.out.println("User list text: " + detailsText);
            } catch (Exception e) {
                System.out.println("Couldn't find specific users section, using all details text");
            }
            
            assertTrue(detailsText.contains(user1), "User '" + user1 + "' not found in details");
            assertTrue(detailsText.contains(user2), "User '" + user2 + "' not found in details");
            assertTrue(detailsText.contains(user3), "User '" + user3 + "' not found in details");
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for details section. Page source: " + driver.getPageSource());
            throw e;
        }
    }

    @Then("I should see a privacy error message")
    public void iShouldSeePrivacyErrorMessage() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        
        try {
            // Look for the error container 
            WebElement errorContainer = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class, 'text-red-400') and contains(@class, 'bg-red-900')]")
            ));
            
            // Get the error message text
            String errorText = errorContainer.getText();
            System.out.println("Found error message: " + errorText);
            
            // Verify it contains a privacy-related message
            assertTrue(errorText.contains("favorite list is private"), 
                      "Expected privacy error message, but found: " + errorText);
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for privacy error message. Page source: " + driver.getPageSource());
            throw e;
        }
    }

    @Then("I should see a doesn't exist error message")
    public void iShouldSeeDoesntExistErrorMessage() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        
        try {
            // Look for the error container (same as for privacy errors)
            WebElement errorContainer = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class, 'text-red-400') and contains(@class, 'bg-red-900')]")
            ));
            
            // Get the error message text
            String errorText = errorContainer.getText();
            System.out.println("Found error message: " + errorText);
            
            // Verify it contains a "does not exist" message
            assertTrue(errorText.contains("does not exist"), 
                      "Expected 'does not exist' error message, but found: " + errorText);
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for 'does not exist' error message. Page source: " + driver.getPageSource());
            throw e;
        }
    }

    @Then("I search for non-existent {string}")
    public void iSearchForNonExistentUser(String username) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.cssSelector("input[placeholder='Search by username']")
        ));
        
        // Clear and input the username
        searchInput.clear();
        searchInput.sendKeys(username);
        
        System.out.println("Entered non-existent username: " + username + " (no suggestions expected)");
        
        // Wait a bit to make sure no suggestions appear and for stability
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Then("I should see comparison song details including:")
    public void iShouldSeeComparisonSongDetailsIncluding(io.cucumber.datatable.DataTable dataTable) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        List<String> expectedDetailTypes = dataTable.asList();
        
        try {
            // Wait for details section to be visible
            WebElement detailsSection = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'mt-2') and contains(@class,'text-sm')]")
            ));
            
            // Get the full text of the details section
            String detailsText = detailsSection.getText();
            System.out.println("Found song details: " + detailsText);
            
            WebElement songElement = detailsSection.findElement(By.xpath("./ancestor::li"));
            String songElementText = songElement.getText();
            System.out.println("Song element text (includes title): " + songElementText);
            
            // Verify each expected detail type is present in the details
            Map<String, Boolean> detailsFound = new HashMap<>();
            
            // "Song name" - verify the song title is in the parent element
            detailsFound.put("Song name", songElementText.contains("Polly by Nirvana"));
            
            // Artist name - check for "Artist: " label
            detailsFound.put("Artist name", detailsText.contains("Artist:"));
            
            // Release date - check for "Release Date: " label
            detailsFound.put("Release date", detailsText.contains("Release Date:"));
            
            // Comparison results - check for "Favorited by" section
            detailsFound.put("Comparison results", detailsText.contains("Favorited by"));
            
            // Check each expected detail type from the data table
            for (String detailType : expectedDetailTypes) {
                if (!detailsFound.containsKey(detailType)) {
                    fail("Unknown detail type: " + detailType);
                }
                
                assertTrue(detailsFound.get(detailType), 
                          "Expected to find '" + detailType + "' in song details, but it was not present");
                System.out.println("✓ Found expected detail type: " + detailType);
            }
            
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for song details section. Page source: " + driver.getPageSource());
            throw e;
        } catch (Exception e) {
            System.err.println("Error checking song details: " + e.getMessage());
            System.err.println("Page source: " + driver.getPageSource());
            throw e;
        }
    }
}
