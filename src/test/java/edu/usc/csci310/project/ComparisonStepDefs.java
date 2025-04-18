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

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.*;

// Contains step definitions for testing the user comparison features.
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

    // Ensures a user exists in the database, creating them only if necessary.
    private void ensureUserExists(String username) {
        if (userRepository.getHashedUsernameFromRaw(username).isEmpty()) {
            DriverManager.createUserWithUsername(connection, username);
        } else {
            System.out.println("User '" + username + "' already exists, skipping creation.");
        }
    }

    // --- Lifecycle Hooks ---

    // Resets browser and database state before each scenario.
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

        driver.get("http://localhost:8080/login");
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

    // --- Page Interaction ---

    @And("I try to navigate to the friends comparison page")
    public void iTryToNavigateToTheFriendsComparisonPage() {
        driver.get("http://localhost:8080/friends");
    }

    @When("I navigate to the comparison page")
    public void iNavigateToComparisonPage() {
        driver.get("http://localhost:8080/compare");
        new WebDriverWait(driver, Duration.ofSeconds(5))
            .until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h1[text()='Find Friends']")));
    }

    @When("I select {string} to compare with")
    public void iSelectUserToCompareWith(String username) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));

        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("compare-search-input")));
        searchInput.clear();
        searchInput.sendKeys(username);

        WebElement suggestionsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("compare-suggestions-list")));

        By suggestionCheckboxSelector = By.xpath("//ul[@id='compare-suggestions-list']//li[.//span[text()='" + username + "']]//input[@type='checkbox']");
        WebElement userCheckbox = wait.until(ExpectedConditions.elementToBeClickable(suggestionCheckboxSelector));

        if (!userCheckbox.isSelected()) {
            userCheckbox.click();
        }

        WebElement compareButton = wait.until(ExpectedConditions.elementToBeClickable(By.id("compare-add-button")));
        compareButton.click();
    }

    @When("I enter {string} in the comparison search field")
    public void iEnterInComparisonSearchField(String searchTerm) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement searchInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("compare-search-input")));
        searchInput.clear();
        searchInput.sendKeys(searchTerm);
    }

    // --- Assertion Steps ---

    @Then("I should be redirected to the login page from comparison")
    public void iShouldBeRedirectedToTheLoginPageFromComparison() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        wait.until(ExpectedConditions.urlToBe("http://localhost:8080/"));
        assertEquals("http://localhost:8080/", driver.getCurrentUrl(), "User was not redirected to the login page.");
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
        WebElement suggestionsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("compare-suggestions-list")));
        List<WebElement> suggestionItems = suggestionsList.findElements(By.xpath(".//li//span[text()='" + username + "']"));
        assertFalse(suggestionItems.isEmpty(), "Expected to see suggestion containing '" + username + "', but it was not found in the suggestions list");
    }
}
