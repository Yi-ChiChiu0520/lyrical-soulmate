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

public class WordcloudStepDefs {
    private final WebDriver driver;
    private final Connection connection;

    public WordcloudStepDefs(Connection connection) {
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

    @When("I add {string} into the Word Cloud")
    public void insertSongIntoWordCloud(String songInfo) throws InterruptedException {
        Thread.sleep(1000);
        driver.get("http://localhost:8080/dashboard");

        String[] parts = songInfo.split(" by ", 2);
        String artistName = parts.length == 2 ? parts[1] : null;
        assertNotNull(artistName, "Failed to extract artist name from: " + songInfo);

        performSongSearch("10", artistName);

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        } catch (TimeoutException e) {
            fail("Results list did not load after searching for artist: " + artistName, e);
        }

        selectSong(songInfo);

        // 🔁 Wait for checkbox selection to finalize (optional)
        Thread.sleep(500);

        // ✅ Wait until "Add to Word Cloud" button is clickable and enabled
        WebElement addButton = wait.until(ExpectedConditions.elementToBeClickable(By.id("add-to-wordcloud")));
        assertTrue(addButton.isDisplayed() && addButton.isEnabled(), "Add to Word Cloud button is not ready.");

        addButton.click();

        // ⏳ Wait a moment for the cloud to regenerate
        Thread.sleep(1000);
        verifyWordCloudIsAdded();
    }

    @When("I perform a search for {string} tracks by {string}")
    public void performSongSearch(String limit, String artistName) throws InterruptedException {
        Thread.sleep(1000);
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        WebElement searchField = wait.until(driver -> {
            WebElement element = driver.findElement(By.id("song-title"));
            return element.isDisplayed() ? element : null;
        });

        assertNotNull(searchField);
        searchField.clear();
        searchField.sendKeys(artistName);

        WebElement limitField = driver.findElement(By.id("song-limit"));
        limitField.clear();
        limitField.sendKeys(limit);

        driver.findElement(By.id("search-button")).click();
    }

    @When("I choose {string} from the search results")
    public void selectSong(String songName) throws InterruptedException {
        Thread.sleep(1000);
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsSection = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));

        WebElement checkbox = null;
        WebElement songElement = null;
        List<WebElement> items = resultsSection.findElements(By.tagName("li"));
        assertFalse(items.isEmpty(), "No songs found in the results.");

        for (WebElement item : items) {
            try {
                songElement = item.findElement(By.id("song-name"));
                String normalized = songElement.getText().replace('\u00A0', ' ').replace("🎵", "").trim().toLowerCase();
                if (normalized.contains(songName.toLowerCase())) {
                    checkbox = item.findElement(By.tagName("input"));
                    break;
                }
            } catch (NoSuchElementException e) {
                System.err.println("Skipping an item due to missing elements.");
            }
        }

        assertNotNull(checkbox, "Checkbox for song not found: " + songName);
        assertNotNull(songElement, "Song name element not found for: " + songName);

        // Scroll and wait for checkbox to be clickable
        new Actions(driver).moveToElement(checkbox).perform();
        wait.until(ExpectedConditions.elementToBeClickable(checkbox)).click();

        // Double-check and retry click if needed
        if (!checkbox.isSelected()) {
            System.out.println("Checkbox not selected on first click, retrying...");
            checkbox.click();
        }

        assertTrue(checkbox.isSelected(), "Checkbox for song was not selected properly.");
    }

    public void verifyWordCloudIsAdded() throws InterruptedException {
        Thread.sleep(2000);
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(30));
        By wordCloudContainerSelector = By.id("word-cloud");
        By wordCloudChildSelector = By.cssSelector("#word-cloud > div");

        try {
            WebElement wordCloudContainer = wait.until(ExpectedConditions.visibilityOfElementLocated(wordCloudContainerSelector));
            assertTrue(wordCloudContainer.isDisplayed(), "Word cloud container (#word-cloud) is not visible.");
            System.out.println("Word cloud container (#word-cloud) is visible.");

            WebElement wordCloudPanelElement = wait.until(ExpectedConditions.visibilityOfElementLocated(wordCloudChildSelector));
            assertTrue(wordCloudPanelElement.isDisplayed(), "Word cloud content element (#word-cloud > div) is not visible.");
            System.out.println("Word cloud child element (#word-cloud > div) is visible.");

            By panelContentSelector = By.cssSelector("#word-cloud span");
            wait.until(ExpectedConditions.numberOfElementsToBeMoreThan(panelContentSelector, 0));
            System.out.println("Word cloud content (span elements) is visible.");

        } catch (TimeoutException e) {
            System.err.println("Page source on timeout looking for word cloud: " + driver.getPageSource());
            fail("Word cloud container (#word-cloud) or its direct child/content did not appear within the timeout period.", e);
        }
    }

    @Then("{string} should be visible inside the Word Cloud")
    public void verifyWordVisibleInWordCloud(String word) throws InterruptedException {
        Thread.sleep(5000);
        WebElement cloud = new WebDriverWait(driver, Duration.ofSeconds(100))
                .until(ExpectedConditions.visibilityOfElementLocated(By.id("word-cloud")));
        assertTrue(cloud.getText().contains(word), "Word Cloud does not show the word: " + word);
    }

    @And("I remove {string} from the Word Cloud")
    public void removeSongFromWordCloud(String songInfo) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

        try {
            // Break down the song info into parts we might need to match
            String[] parts = songInfo.split(" by ");
            String songName = parts[0].trim();
            String artistName = parts.length > 1 ? parts[1].trim() : "";

            boolean removed = wait.until(driver -> {
                // Get fresh reference to word cloud each time
                WebElement wordCloud = driver.findElement(By.id("word-cloud"));
                List<WebElement> listItems = wordCloud.findElements(By.tagName("li"));

                for (WebElement item : listItems) {
                    try {
                        WebElement span = item.findElement(By.tagName("span"));
                        String spanText = span.getText()
                                .replace('\u00A0', ' ')
                                .trim();

                        // Check for either full match or partial matches
                        boolean matchesFull = spanText.equalsIgnoreCase(songInfo);
                        boolean matchesSong = spanText.toLowerCase().contains(songName.toLowerCase());
                        boolean matchesArtist = artistName.isEmpty() ||
                                spanText.toLowerCase().contains(artistName.toLowerCase());

                        if (matchesFull || (matchesSong && matchesArtist)) {
                            WebElement removeButton = item.findElement(By.xpath(".//button[contains(text(), 'Remove')]"));
                            new Actions(driver).moveToElement(removeButton).perform();
                            removeButton.click();

                            // Wait briefly for removal to take effect
                            try {
                                Thread.sleep(500);
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                            }

                            return true;
                        }
                    } catch (NoSuchElementException e) {
                        continue; // Skip items that don't match our expected structure
                    } catch (StaleElementReferenceException e) {
                        return false; // Will retry
                    }
                }
                return false;
            });

            assertTrue(removed, "Could not find and remove song: " + songInfo);

        } catch (TimeoutException e) {
            // Debug output before failing
            System.out.println("Final Word Cloud content: " +
                    driver.findElement(By.id("word-cloud")).getText());
            throw new AssertionError("Timeout while trying to remove song: " + songInfo, e);
        }
    }

    @Then("{string} should be not visible inside the Word Cloud")
    public void verifyWordNotVisibleInWordCloud(String word) throws InterruptedException {
        Thread.sleep(1500); // Increased initial wait
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15)); // Increased timeout

        try {
            boolean isGone = wait.until(driver -> {
                try {
                    WebElement cloud = driver.findElement(By.id("word-cloud"));
                    System.out.println("Current Word Cloud content: " + cloud.getText()); // Debug output

                    List<WebElement> spans = cloud.findElements(By.tagName("span"));
                    if (spans.isEmpty()) {
                        return true; // No words at all means our word is gone
                    }

                    for (WebElement span : spans) {
                        String spanText = span.getText()
                                .replace('\u00A0', ' ')
                                .trim()
                                .toLowerCase();
                        System.out.println("Checking span: " + spanText); // Debug
                        if (spanText.contains(word.toLowerCase())) {
                            return false; // Word still found
                        }
                    }
                    return true; // Word not found in any span
                } catch (StaleElementReferenceException e) {
                    // Element was refreshed, try again
                    return false;
                } catch (NoSuchElementException e) {
                    // Word cloud container not found - consider word gone
                    return true;
                }
            });

            assertTrue(isGone, "Word Cloud still contains the word: " + word);
        } catch (TimeoutException e) {
            System.out.println("Final Word Cloud state: " + driver.findElement(By.id("word-cloud")).getText());
            throw new AssertionError("Timeout waiting for word '" + word + "' to disappear from Word Cloud", e);
        }
    }

    @Then("The word cloud should be not visible")
    public void verifyWordCloudIsNotVisible() throws InterruptedException {
        Thread.sleep(1000);  // Allow any animation/rendering to complete
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        boolean isEmpty = wait.until(driver -> {
            try {
                WebElement cloud = driver.findElement(By.id("word-cloud"));
                List<WebElement> spans = cloud.findElements(By.tagName("span"));
                return spans.isEmpty(); // If there are no words, treat as not visible
            } catch (NoSuchElementException e) {
                return true; // Word cloud container was removed
            }
        });

        assertTrue(isEmpty, "Expected the word cloud to be empty or removed, but it still contains content.");
    }

    @When("The Word Cloud is empty")
    public void clearWordCloud() throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

        // Navigate to dashboard
        driver.get("http://localhost:8080/dashboard");
        wait.until(ExpectedConditions.urlContains("dashboard"));

        try {
            // Optional: add test content if needed
            ensureWordCloudHasContent();

            // Loop until no more remove buttons are found
            boolean changesMade;
            do {
                changesMade = false;

                // Refresh the word cloud section
                WebElement wordCloud = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("word-cloud")));
                List<WebElement> removeButtons = wordCloud.findElements(By.xpath(".//button[contains(text(),'Remove')]"));

                for (WebElement removeButton : removeButtons) {
                    if (removeButton.isDisplayed()) {
                        new Actions(driver).moveToElement(removeButton).perform();
                        removeButton.click();
                        wait.until(ExpectedConditions.stalenessOf(removeButton));
                        Thread.sleep(1500);  // Short pause before next check
                        changesMade = true;
                        break; // Restart loop since DOM has changed
                    }
                }

            } while (changesMade);

            // Final check: no spans left
            wait.until(driver -> {
                try {
                    List<WebElement> spans = driver.findElement(By.id("word-cloud"))
                            .findElements(By.tagName("span"));
                    return spans.isEmpty();
                } catch (NoSuchElementException e) {
                    return true;
                }
            });

        } catch (TimeoutException e) {
            System.out.println("Word Cloud was already empty or not found.");
        }
    }

    private void ensureWordCloudHasContent() throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

        // Check if word cloud is empty
        try {
            WebElement wordCloud = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("word-cloud")));
            if (wordCloud.findElements(By.tagName("span")).isEmpty()) {
                // Add a test song if empty
                System.out.println("Adding test song to ensure word cloud is populated");
                addTestSongToWordCloud();

                // Wait for song to appear
                wait.until(driver -> {
                    return !driver.findElement(By.id("word-cloud"))
                            .findElements(By.tagName("span")).isEmpty();
                });
            }
        } catch (NoSuchElementException e) {
            System.out.println("Word Cloud container not found");
        }
    }

    private void addTestSongToWordCloud() throws InterruptedException {
        // Implement your song addition logic here
        // For example:
        driver.findElement(By.id("song-title")).sendKeys("Drake");
        driver.findElement(By.id("song-limit")).sendKeys("1");
        driver.findElement(By.id("search-button")).click();

        // Wait for results and select first song
        WebElement firstSong = new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.elementToBeClickable(
                        By.cssSelector("#results-list li:first-child input")));
        firstSong.click();

        // Add to word cloud
        driver.findElement(By.id("add-to-wordcloud")).click();
        Thread.sleep(1000); // Wait for word cloud to update
    }

    @Then("The word cloud should be generated over one second")
    public void verifyWordCloudGenerationTime() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(3));

        long startTime = System.currentTimeMillis();

        try {
            // Wait until word cloud has at least one span (i.e., it's rendered)
            wait.until(driver -> {
                WebElement wordCloud = driver.findElement(By.id("word-cloud"));
                return !wordCloud.findElements(By.tagName("span")).isEmpty();
            });

            long endTime = System.currentTimeMillis();
            long generationTime = endTime - startTime;

            System.out.println("✅ Word cloud generated in " + generationTime + "ms");

            // Check if generation time is over 1 second (1000 ms)
            assertTrue(generationTime >= 1000,
                    "Expected generation time > 1000ms, but it was only " + generationTime + "ms");

        } catch (TimeoutException e) {
            long timeoutTime = System.currentTimeMillis() - startTime;
            fail("❌ Word cloud failed to generate within 3 seconds. Waited: " + timeoutTime + "ms");
        }
    }

    @When("I click on the word {string} in word cloud")
    public void clickOnWord(String word) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        List<WebElement> spans = wait.until(driver -> {
            List<WebElement> elements = driver.findElements(By.cssSelector("div span"));
            return elements.isEmpty() ? null : elements;
        });

        boolean clicked = false;
        for (WebElement span : spans) {
            String text = span.getText().trim().toLowerCase();
            if (text.equals(word.toLowerCase())) {
                new Actions(driver).moveToElement(span).perform();
                span.click();
                clicked = true;
                break;
            }
        }

        assertTrue(clicked, "Could not find or click on word: " + word);
        Thread.sleep(1000);  // Allow any resulting action to complete
    }


    @Then("it should show {string}")
    public void verifyDisplayedSong(String expectedSong) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Use XPath with normalize-space and translate to handle invisible spacing and casing
        String normalizedXpath = "//span[contains(translate(normalize-space(.), '\u00A0', ' '), \"" + expectedSong + "\")]";

        WebElement songDisplay = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath(normalizedXpath)));

        assertTrue(songDisplay.isDisplayed(), "Expected song '" + expectedSong + "' is not displayed");
        System.out.println("✅ Verified displayed song: " + songDisplay.getText());
    }

    @And("The Word Cloud is loaded")
    public void waitForWordCloudToLoad() throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(20));

        System.out.println("⏳ Waiting for Word Cloud to load...");

        boolean loaded = wait.until(driver -> {
            try {
                WebElement wordCloud = driver.findElement(By.id("word-cloud"));
                List<WebElement> spans = wordCloud.findElements(By.tagName("span"));
                System.out.println("📦 Span count: " + spans.size());
                return spans.size() > 0;
            } catch (NoSuchElementException | StaleElementReferenceException e) {
                return false;
            }
        });

        if (!loaded) {
            throw new TimeoutException("❌ Word Cloud did not finish loading within 20 seconds.");
        }

        Thread.sleep(500); // short buffer to ensure complete render
        System.out.println("✅ Word Cloud is fully loaded.");
    }

    @Then("it should show the tabular view")
    public void verifyTabularViewIsVisible() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement table = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//table")
        ));

        assertTrue(table.isDisplayed(), "❌ Tabular view (table) is not visible.");
        System.out.println("✅ Tabular view (table) is now visible.");
    }

    @And("I click the switch to tabular view button")
    public void clickSwitchToTabularViewButton() throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Locate the toggle button using partial match on the label
        WebElement toggleButton = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//button[contains(normalize-space(.), 'Switch to')]")
        ));

        new Actions(driver).moveToElement(toggleButton).perform();
        toggleButton.click();

        // Optional wait for UI transition (tabular view to render)
        Thread.sleep(2000);
        System.out.println("✅ Clicked 'Switch to Tabular View' button");
    }
}

