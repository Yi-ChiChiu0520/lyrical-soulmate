package edu.usc.csci310.project;

import io.cucumber.datatable.DataTable;
import io.cucumber.java.AfterAll;
import io.cucumber.java.Before;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.*;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.sql.Connection;
import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.*;

public class SoulmateStepDefs {
    private final WebDriver driver;
    private final Connection connection;

    public SoulmateStepDefs(Connection connection) {
        driver = DriverManager.getDriver();
        this.connection = connection;
    }

    @AfterAll
    public static void afterAll() {
        DriverManager.closeDriver();
    }

    @Before
    public void before() {
        DriverManager.resetUserDatabase(connection);
    }

    @Given("I am signed in as {string}")
    public void signedInAsUser(String username) {
        WebDriver driver = DriverManager.getDriver();
        driver.get("https://localhost:8080/");

        String password = "Valid1Pass";

        // Step 1: Switch to signup form
        WebElement switchSignup = new WebDriverWait(driver, Duration.ofSeconds(3))
                .until(ExpectedConditions.elementToBeClickable(By.id("switchSignup")));
        switchSignup.click();

        // Step 2: Fill signup form
        new WebDriverWait(driver, Duration.ofSeconds(3))
                .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[placeholder='Username']")))
                .sendKeys(username);
        driver.findElement(By.cssSelector("input[placeholder='Password']")).sendKeys(password);
        driver.findElement(By.cssSelector("input[placeholder='Confirm Password']")).sendKeys(password);

        // Step 3: Click "Create Account"
        WebElement signupButton = driver.findElement(By.id("signupButton"));
        signupButton.click();

        // Step 4: Confirm account creation
        WebElement confirmSignup = new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.elementToBeClickable(By.id("confirmSignup")));
        confirmSignup.click();

        // Step 5: Wait to return to login page
        new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.textToBePresentInElementLocated(By.tagName("body"), "Don't have an account?"));

        // Step 6: Click login (credentials are auto-filled)
        WebElement loginButton = new WebDriverWait(driver, Duration.ofSeconds(3))
                .until(ExpectedConditions.elementToBeClickable(By.id("loginButton")));
        loginButton.click();

        // Step 7: Wait until dashboard is loaded or welcome message appears
        new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.or(
                        ExpectedConditions.urlContains("/dashboard"),
                        ExpectedConditions.textToBePresentInElementLocated(By.tagName("body"), "Welcome")
                ));
    }

    @And("I navigate to the soulmates page")
    public void iNavigateToTheSoulmatesPage() {
        driver.get("https://localhost:8080/match");
    }

    @Then("I should see a celebratory overlay")
    public void iShouldSeeCelebratoryOverlay() {
        WebDriver driver = DriverManager.getDriver();
        WebElement overlay = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='celebration-overlay']")));

        assertTrue(overlay.isDisplayed(), "Celebratory overlay should be visible");
        assertTrue(overlay.getText().contains("You're each other's lyrical soulmate!"), "Overlay text should match expected message");
    }

    @Then("I should see a sinister overlay")
    public void iShouldSeeSinisterOverlay() {
        WebDriver driver = DriverManager.getDriver();
        WebElement overlay = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='sinister-overlay']")));

        assertTrue(overlay.isDisplayed(), "Sinister overlay should be visible");
        assertTrue(overlay.getText().contains("You're each other's lyrical enemy"), "Overlay text should match expected enemy message");
    }

    @And("I login as {string}")
    public void iLoginAs(String username) {
        WebDriver driver = DriverManager.getDriver();
        driver.get("https://localhost:8080/");

        String password = "Valid1Pass";

        // Wait for username input to appear
        WebElement usernameField = new WebDriverWait(driver, Duration.ofSeconds(3))
                .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[placeholder='Username']")));
        usernameField.sendKeys(username);

        // Enter password
        WebElement passwordField = driver.findElement(By.cssSelector("input[placeholder='Password']"));
        passwordField.sendKeys(password);

        // Click login button
        WebElement loginButton = driver.findElement(By.id("loginButton"));
        loginButton.click();

        // Wait for dashboard or welcome message
        new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.or(
                        ExpectedConditions.urlContains("/dashboard"),
                        ExpectedConditions.textToBePresentInElementLocated(By.tagName("body"), "Welcome")
                ));
    }

    @Then("I should not see a celebratory overlay")
    public void iShouldNotSeeACelebratoryOverlay() {
        // Wait just a moment for page to settle
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            // Ignore
        }
        
        // Directly check if overlay exists and is visible
        List<WebElement> overlays = driver.findElements(By.cssSelector("[data-testid='celebration-overlay']"));
        boolean isOverlayVisible = !overlays.isEmpty() && overlays.stream().anyMatch(WebElement::isDisplayed);
        
        assertFalse(isOverlayVisible, "Celebratory overlay should not be visible");
    }

    @And("I should see {string} as their soulmate")
    public void iShouldSeeAsTheirSoulmate(String expectedUsername) {
        WebDriver driver = DriverManager.getDriver();

        WebElement soulmateHeader = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h2[contains(text(),'Your Lyrical Soulmate:')]")));

        String actualText = soulmateHeader.getText();
        assertTrue(actualText.contains(expectedUsername),
                "Expected to see '" + expectedUsername + "' as the soulmate, but saw: '" + actualText + "'");
    }

    @And("I should see {string} as their enemy")
    public void iShouldSeeAsTheirEnemy(String expectedUsername) {
        WebDriver driver = DriverManager.getDriver();

        WebElement enemyHeader = new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.visibilityOfElementLocated(
                        By.xpath("//h2[contains(text(),'Your Lyrical Enemy:')]")
                ));

        String actualText = enemyHeader.getText();
        assertTrue(actualText.contains(expectedUsername),
                "Expected to see '" + expectedUsername + "' as the enemy, but saw: '" + actualText + "'");
    }

    @Then("I should not see a sinister overlay")
    public void iShouldNotSeeASinisterOverlay() {
        WebDriver driver = DriverManager.getDriver();

        // Wait a moment in case the overlay might appear
        try {
            Thread.sleep(1000); // optional buffer
        } catch (InterruptedException ignored) {}

        List<WebElement> elements = driver.findElements(By.cssSelector("[data-testid='sinister-overlay']"));

        boolean isOverlayVisible = elements.stream().anyMatch(WebElement::isDisplayed);

        assertFalse(isOverlayVisible, "Expected no sinister overlay, but one was visible.");
    }

    @And("I have added {string} to my favorites")
    public void iHaveAddedToMyFavorites(String songName) {
        try {
            // Get the current user
            String currentUser = driver.findElement(By.xpath("//h2[contains(text(), 'Welcome')]"))
                                  .getText()
                                  .replace("Welcome, ", "")
                                  .replace("!", "");
            
            // First, clear any existing favorites for this user to ensure clean state
            JavascriptExecutor js = (JavascriptExecutor) driver;
            String clearScript = 
                "const xhr = new XMLHttpRequest();" +
                "xhr.open('DELETE', 'https://localhost:8080/api/favorites/clear/" + currentUser + "', false);" +
                "xhr.send();" +
                "return xhr.status;";
            js.executeScript(clearScript);
            
            // Extract song title and artist
            String[] parts = songName.split(" by ", 2);
            if (parts.length != 2) {
                fail("Song name must be in format 'Title by Artist', got: " + songName);
            }
            String songTitle = parts[0];
            String artistName = parts[1];
            
            // Create consistent song IDs for predictable test results
            // This is key - identical songs should have identical IDs
            String songId = "test-song-" + songTitle.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            
            // Generate consistent lyrics that will create predictable matching patterns
            // Add a special pattern to lyrics based on the specific test scenario
            String lyrics;
            
            // Special customized lyrics to ensure specific matching patterns
            if (currentUser.equals("user1") && songTitle.contains("Rap God")) {
                // User1 with Rap God should match with both user2 and user3 (who also have Rap God)
                lyrics = "user1 user2 match pattern rap god lyrics test case one";
            } else if (currentUser.equals("user2") && songTitle.contains("Rap God")) {
                // User2 with Rap God should match with user1 and user3
                lyrics = "user1 user2 match pattern rap god lyrics test case one";
            } else if (currentUser.equals("user3") && songTitle.contains("Rap God")) {
                // User3 with Rap God should prefer matching with user2 over user1
                lyrics = "user2 user2 user2 user1 match pattern rap god lyrics test case one";
            } else if (songTitle.contains("Lose Yourself")) {
                // For "Lose Yourself", create lyrics that provide secondary matching
                lyrics = "secondary match pattern lose yourself eminem lyrics test case different";
            } else if (songTitle.contains("One Dance")) {
                // One Dance should be dissimilar
                lyrics = "totally different lyrics pattern drake one dance";
            } else if (songTitle.contains("God's Plan")) {
                // God's Plan should be dissimilar
                lyrics = "completely unique lyrics pattern drake gods plan";
            } else {
                // Default lyrics
                lyrics = "generic lyrics for " + songTitle + " by " + artistName;
            }
            
            // Create the favorite song object
            String favoriteSong = "{"
                + "\"username\":\"" + currentUser + "\","
                + "\"songId\":\"" + songId + "\","
                + "\"title\":\"" + songTitle + "\","
                + "\"url\":\"https://example.com/songs/" + songId + "\","
                + "\"imageUrl\":\"https://example.com/images/" + songId + ".jpg\","
                + "\"releaseDate\":\"2023\","
                + "\"artistName\":\"" + artistName + "\","
                + "\"lyrics\":\"" + lyrics + "\""
                + "}";
            
            // Add the song via direct API call
            String addScript = 
                "const xhr = new XMLHttpRequest();" +
                "xhr.open('POST', 'https://localhost:8080/api/favorites/add', false);" +
                "xhr.setRequestHeader('Content-Type', 'application/json');" +
                "xhr.send('" + favoriteSong.replace("'", "\\'") + "');" +
                "return xhr.status;";
            
            Object result = js.executeScript(addScript);
            System.out.println("Added song via API for " + currentUser + ": " + songTitle + " - Status: " + result);
            
            // Ensure backend processing completes
            Thread.sleep(500);
        } catch (Exception e) {
            e.printStackTrace();
            fail("Failed to add song to favorites: " + e.getMessage());
        }
    }
}


