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
import java.util.*;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

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

        String[] parts = songInfo.split(" by ", 2);
        String artistName = parts.length == 2 ? parts[1] : null;
        assertNotNull(artistName, "Failed to extract artist name from: " + songInfo);

        performSongSearch("10", artistName);

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // ✅ Click the artist tile after the search
        String artistTileId = "artist-" + artistName;
        WebElement artistTile = wait.until(ExpectedConditions.elementToBeClickable(By.id(artistTileId)));
        assertTrue(artistTile.isDisplayed(), "Artist tile not found for: " + artistName);
        artistTile.click();

        // ✅ Wait for the results list to appear after artist click
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        } catch (TimeoutException e) {
            fail("Results list did not load after selecting artist: " + artistName, e);
        }

        selectSong(songInfo);

        // Optional: Wait a moment for checkbox selection to finalize
        Thread.sleep(500);

        // ✅ Click "Add Selected to Word Cloud"
        WebElement addButton = wait.until(ExpectedConditions.elementToBeClickable(By.id("add-to-wordcloud")));
        assertTrue(addButton.isDisplayed() && addButton.isEnabled(), "Add to Word Cloud button is not ready.");
        addButton.click();

        // Wait for cloud generation
        Thread.sleep(1000);

        verifyWordCloudIsAdded();
    }


    @When("I perform a search for {string} tracks by {string}")
    public void performSongSearch(String limit, String artistName) throws InterruptedException {
        Thread.sleep(1000);
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        WebElement searchField = wait.until(driver -> {
            WebElement element = driver.findElement(By.id("artist-title"));
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
        String[] songParts = songInfo.split(" by ");
        String songName = songParts[0].trim();
        String artistName = songParts.length > 1 ? songParts[1].trim() : "";

        try {
            boolean removed = wait.until(driver -> {
                // Find all song containers in the word cloud
                List<WebElement> songContainers = driver.findElements(
                        By.cssSelector("#word-cloud .divide-y > div.py-2")
                );

                for (WebElement container : songContainers) {
                    try {
                        // Get the song name element
                        WebElement songLabel = container.findElement(By.cssSelector(".flex-1.min-w-0"));
                        String labelText = songLabel.getText().replace("\u00A0", " ").trim();

                        // Check if this is the song we want to remove
                        if (labelText.contains(songName) &&
                                (artistName.isEmpty() || labelText.contains(artistName))) {

                            // Find and click the Remove button
                            WebElement removeBtn = container.findElement(
                                    By.cssSelector(".ml-4 button")
                            );

                            new Actions(driver)
                                    .moveToElement(removeBtn)
                                    .pause(300)
                                    .click(removeBtn)
                                    .perform();

                            Thread.sleep(800); // Wait for removal to complete
                            return true;
                        }
                    } catch (NoSuchElementException | StaleElementReferenceException e) {
                        continue;
                    } catch (InterruptedException e) {
                        throw new RuntimeException(e);
                    }
                }
                return false;
            });

            assertTrue(removed, "Failed to remove song: " + songInfo);

        } catch (TimeoutException e) {
            String currentContent = driver.findElement(By.id("word-cloud")).getText();
            throw new AssertionError("Timeout removing '" + songInfo + "'. Current content:\n" + currentContent);
        }
    }

    @Then("{string} should be not visible inside the Word Cloud")
    public void verifyWordNotVisibleInWordCloud(String word) throws InterruptedException {
        Thread.sleep(1500); // Let UI render changes
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

        try {
            boolean isGone = wait.until(driver -> {
                try {
                    WebElement cloud = driver.findElement(By.id("word-cloud"));
                    List<WebElement> spans = cloud.findElements(By.xpath(".//span"));

                    System.out.println("🔍 Checking for word: \"" + word + "\" in Word Cloud");
                    System.out.println("📦 Word cloud span count: " + spans.size());

                    for (WebElement span : spans) {
                        String text = span.getText().replace('\u00A0', ' ').trim().toLowerCase();
                        System.out.println("🟣 Span text: " + text);
                        if (text.contains(word.toLowerCase())) {
                            return false; // Word still present
                        }
                    }

                    return true; // Word not found
                } catch (StaleElementReferenceException e) {
                    return false; // Retry on DOM refresh
                } catch (NoSuchElementException e) {
                    return true; // If word cloud disappeared, treat as not visible
                }
            });

            assertTrue(isGone, "❌ Word Cloud still contains the word: \"" + word + "\"");
            System.out.println("✅ Word \"" + word + "\" is no longer visible in Word Cloud.");

        } catch (TimeoutException e) {
            String finalContent = driver.findElement(By.id("word-cloud")).getText();
            System.out.println("⛔ Final Word Cloud state: " + finalContent);
            throw new AssertionError("❌ Timed out waiting for word \"" + word + "\" to disappear from Word Cloud", e);
        }
    }


    @Then("The word cloud should be not visible")
    public void verifyWordCloudIsNotVisible() throws InterruptedException {
        Thread.sleep(1000);  // Allow animations/rendering to finish
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        boolean noSongsVisible = wait.until(driver -> {
            try {
                WebElement cloud = driver.findElement(By.id("word-cloud"));
                List<WebElement> headers = cloud.findElements(By.xpath(".//h3[contains(text(),'by')]"));
                return headers.isEmpty(); // No song titles like "Rap God by Eminem"
            } catch (NoSuchElementException e) {
                return true; // Word cloud is gone
            }
        });

        assertTrue(noSongsVisible, "❌ Expected no songs in the Word Cloud, but some are still present.");
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
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(50));

        System.out.println("⏳ Waiting for Word Cloud to update...");

        WebElement wordCloud = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("word-cloud")));
        int initialSpanCount = wordCloud.findElements(By.tagName("span")).size();
        System.out.println("📦 Initial span count: " + initialSpanCount);

        boolean updated = wait.until(driver -> {
            try {
                WebElement updatedCloud = driver.findElement(By.id("word-cloud"));
                int currentSpanCount = updatedCloud.findElements(By.xpath(".//span[normalize-space(text()) != '']")).size();
                System.out.println("📈 Current span count: " + currentSpanCount);
                return currentSpanCount > initialSpanCount;
            } catch (StaleElementReferenceException | NoSuchElementException e) {
                return false;
            }
        });

        if (!updated) {
            throw new TimeoutException("❌ Word Cloud did not update after adding a song.");
        }
        System.out.println("✅ Word Cloud update confirmed.");
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

        // Locate the button using its ID
        WebElement toggleButton = wait.until(ExpectedConditions.elementToBeClickable(
                By.id("view-table")
        ));

        new Actions(driver).moveToElement(toggleButton).perform();
        toggleButton.click();

        // Wait for the view to switch/render
        Thread.sleep(2000);

        System.out.println("✅ Clicked 'Table' button to switch to tabular view");
    }

    @And("I refresh the dashboard page")
    public void refreshDashboardPage() throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Refresh the page
        driver.navigate().refresh();

        // Wait until we're back on the dashboard and the word cloud is present
        wait.until(ExpectedConditions.urlContains("dashboard"));

        // Optional: Wait until the word cloud is visible again (if needed by tests)
        wait.until(ExpectedConditions.presenceOfElementLocated(By.id("word-cloud")));

        Thread.sleep(1000); // Brief pause to allow animations or rendering to finish
        System.out.println("🔄 Dashboard page refreshed and word cloud is ready.");
    }

    @Then("The words in word cloud should not be over 100")
    public void verifyWordCloudWordLimit() throws InterruptedException {
        Thread.sleep(1000); // Allow UI to fully render
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement wordCloud = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("word-cloud")));

        // Locate the specific word container inside the word cloud
        WebElement wordContainer = wordCloud.findElement(By.xpath(".//div[contains(@style, 'flex-wrap')]"));

        // Count only span elements inside the word container (actual words)
        List<WebElement> wordSpans = wordContainer.findElements(By.tagName("span"));
        int count = wordSpans.size();

        System.out.println("📦 Word count inside word cloud container: " + count);

        assertTrue(count <= 100, "❌ Word cloud has more than 100 words. Found: " + count);
        System.out.println("✅ Word cloud has " + count + " words (within limit).");
    }

    @Then("The word {string} should be larger than the word {string}")
    public void verifyWordSizeComparison(String moreFrequent, String lessFrequent) throws InterruptedException {
        Thread.sleep(1000);
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement cloud = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("word-cloud")));
        WebElement wordContainer = cloud.findElement(By.xpath(".//div[contains(@style, 'flex-wrap')]"));

        List<WebElement> spans = wordContainer.findElements(By.tagName("span"));

        double sizeMore = -1;
        double sizeLess = -1;

        for (WebElement span : spans) {
            String text = span.getText().replace("\u00A0", " ").trim().toLowerCase();
            String style = span.getAttribute("style");

            if (text.equals(moreFrequent.toLowerCase())) {
                sizeMore = extractFontSize(style);
            } else if (text.equals(lessFrequent.toLowerCase())) {
                sizeLess = extractFontSize(style);
            }
        }

        System.out.println("🔎 Font size of \"" + moreFrequent + "\": " + sizeMore);
        System.out.println("🔎 Font size of \"" + lessFrequent + "\": " + sizeLess);

        assertTrue(sizeMore > sizeLess,
                "❌ Expected \"" + moreFrequent + "\" to be larger than \"" + lessFrequent + "\", but it wasn't.");
        System.out.println("✅ \"" + moreFrequent + "\" is larger than \"" + lessFrequent + "\".");
    }

    private double extractFontSize(String style) {
        try {
            for (String part : style.split(";")) {
                if (part.trim().startsWith("font-size")) {
                    return Double.parseDouble(part.split(":")[1].replace("px", "").trim());
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to extract font size from: " + style);
        }
        return -1;
    }

    @And("I click the add to favorites button on {string}")
    public void clickAddToFavoritesOn(String songName) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Find the song container by song name text
        WebElement songBlock = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//span[contains(text(), \"" + songName + "\")]/ancestor::div[contains(@class, 'flex')]")
        ));

        assertNotNull(songBlock, "❌ Could not find song block for: " + songName);

        // Hover to trigger button visibility
        new Actions(driver).moveToElement(songBlock).perform();
        Thread.sleep(1000); // Wait for React to render the hover-based button

        // Now locate the 'Add to Favorites' button within this block
        WebElement favoriteButton = songBlock.findElement(
                By.xpath(".//button[normalize-space(text())='Add to Favorites']")
        );

        wait.until(ExpectedConditions.elementToBeClickable(favoriteButton));
        favoriteButton.click();
        System.out.println("✅ Clicked 'Add to Favorites' on: " + songName);
    }

    @And("I add {string} to favorites from Word Cloud")
    public void addToFavoritesFromWordCloud(String songName) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));

        // Locate the outer flex container that wraps the song content
        WebElement songBlock = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//span[contains(normalize-space(), \"" + songName + "\")]/ancestor::div[contains(@class, 'flex')]")
        ));

        // Now hover over the **outer block**, not just the span
        Actions actions = new Actions(driver);
        actions.moveToElement(songBlock).pause(Duration.ofMillis(1000)).perform();

        // Explicit wait for the "Add to Favorites" button to appear within this block
        WebElement favoriteButton = wait.until(ExpectedConditions.visibilityOf(
                songBlock.findElement(By.xpath(".//button[normalize-space()='Add to Favorites']"))
        ));

        wait.until(ExpectedConditions.elementToBeClickable(favoriteButton));
        favoriteButton.click();

        System.out.println("✅ Successfully hovered and clicked 'Add to Favorites' for: " + songName);
    }

    public WebElement findSongInWordCloud(String songName) {
        // Locate card from span text → up to its outer container
        return new WebDriverWait(driver, Duration.ofSeconds(5)).until(driver1 ->
                driver1.findElement(By.xpath("//span[contains(normalize-space(), \"" + songName + "\")]/ancestor::div[contains(@class, 'flex')]"))
        );
    }

    @And("I hover over {string} in Word Cloud")
    public void hoverOverInWordCloud(String songName) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Normalize spacing since there may be &nbsp;
        String normalized = songName.replace("\u00A0", " ").trim();

        WebElement songDiv = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//span[contains(normalize-space(), \"" + normalized + "\")]/ancestor::div[contains(@class, 'group')]")
        ));

        assertNotNull(songDiv, "Failed to locate the song container div for hover: " + songName);

        new Actions(driver)
                .moveToElement(songDiv)
                .pause(Duration.ofMillis(500)) // Allow react to show the button
                .perform();

        System.out.println("✅ Hovered over song in Word Cloud: " + songName);
    }

    @And("I hover over {string} in Word Cloud and click Add to Favorites")
    public void hoverAndClickAddToFavorites(String songName) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Get the outer song container
        WebElement songDiv = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//span[contains(normalize-space(), \"" + songName + "\")]/ancestor::div[contains(@class, 'group')]")
        ));

        new Actions(driver)
                .moveToElement(songDiv)
                .pause(Duration.ofMillis(500))
                .perform();

        // Wait for the button inside that div to appear and click
        WebElement button = wait.until(ExpectedConditions.elementToBeClickable(
                songDiv.findElement(By.tagName("button"))
        ));

        button.click();
        System.out.println("✅ Hovered and clicked 'Add to Favorites' for: " + songName);
    }

    @And("I click on the word {string} in word cloud in tabular")
    public void clickOnWordInTabular(String word) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait for the table to be visible (in tabular view)
        WebElement table = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//table")));

        // Find the table row where the first <td> contains the word (case insensitive match)
        WebElement row = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//table//tr[td[1][normalize-space(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')) = '" + word.toLowerCase() + "']]")
        ));

        // Click the row to trigger the word selection (song list)
        row.click();
        System.out.println("✅ Clicked on word \"" + word + "\" in tabular word cloud view");
    }

    @Then("I should see an error message in word cloud")
    public void verifyErrorMessageInWordCloud() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Look for any div that contains text starting with ❌
        By errorSelector = By.xpath("//div[starts-with(normalize-space(), '❌')]");

        WebElement errorMessage = wait.until(ExpectedConditions.visibilityOfElementLocated(errorSelector));
        String text = errorMessage.getText();

        assertTrue(text.startsWith("❌"), "Expected error message to start with ❌, but got: " + text);
        System.out.println("🚨 Found error message in word cloud: " + text);
    }

    @And("I started word cloud")
    public void iStartedWordCloud() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        By startButtonSelector = By.xpath("//button[contains(text(), 'Start Word Cloud') or @aria-label='start word cloud']");

        WebElement startButton = wait.until(ExpectedConditions.elementToBeClickable(startButtonSelector));
        startButton.click();
    }

    @And("I click confirm removal")
    public void iClickConfirmRemoval() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        By confirmButtonSelector = By.id("accept-remove");

        WebElement confirmButton = wait.until(ExpectedConditions.elementToBeClickable(confirmButtonSelector));
        confirmButton.click();
    }

    @Then("I should not see any filler words")
    public void iShouldNotSeeAnyFillerWords() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait until word cloud spans are present
        List<WebElement> wordElements = wait.until(ExpectedConditions.presenceOfAllElementsLocatedBy(
                By.cssSelector("#word-cloud span") // Adjust this if your words are inside a different tag
        ));

        // List of stop (filler) words
        Set<String> stopWords = new HashSet<>(Arrays.asList(
                "the", "and", "a", "to", "of", "in", "is", "it", "you", "that", "on", "for", "with",
                "as", "was", "are", "but", "be", "at", "by", "this", "have", "or", "an", "not", "we"
        ));

        // Extract and normalize all words from the cloud
        List<String> wordsInCloud = wordElements.stream()
                .map(WebElement::getText)
                .map(String::toLowerCase)
                .toList();

        // Check if any filler word appears
        List<String> foundFillerWords = wordsInCloud.stream()
                .filter(stopWords::contains)
                .toList();

        assertTrue(foundFillerWords.isEmpty(), "Filler words found in word cloud: " + foundFillerWords);
    }


    @Then("Word cloud should follow word stemming")
    public void wordCloudShouldFollowWordStemming() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait for the word cloud to render
        List<WebElement> wordElements = wait.until(ExpectedConditions.presenceOfAllElementsLocatedBy(
                By.cssSelector("#word-cloud span")
        ));

        // Collect all displayed words
        List<String> words = wordElements.stream()
                .map(WebElement::getText)
                .map(String::toLowerCase)
                .toList();

        // Stemming check for 'love' and 'loving'
        boolean hasLove = words.contains("love");
        boolean hasLoving = words.contains("lovin'");

        // ✅ Expecting only the stemmed base 'love' to appear
        assertTrue(hasLove, "Expected stemmed word 'love' to be present.");
        assertFalse(hasLoving, "Did not expect unstemmed variant 'loving' to appear.");

        System.out.println("✅ Word cloud correctly stemmed 'loving' to 'love'.");
    }

    @And("I clicked on a song with the word")
    public void iClickedOnASongWithTheWord() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait for any related song to appear and click on it
        // Using aria-label that starts with "Related Song Title:"
        WebElement songTitle = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//span[starts-with(@aria-label, 'Related Song Title:')]")
        ));
        songTitle.click();
    }

    @Then("I should more info and lyrics of the song")
    public void iShouldMoreInfoAndLyricsOfTheSong() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait for artist name
        WebElement artist = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.id("artist-name")
        ));
        assertTrue(artist.getText().toLowerCase().contains("artist"), "Artist info not found.");

        // Wait for release date
        WebElement releaseDate = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.id("release-date")
        ));
        assertTrue(releaseDate.getText().toLowerCase().contains("release date"), "Release date not found.");

        // Wait for lyrics section
        WebElement lyrics = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[@aria-label='Lyrics:']")
        ));
        assertFalse(lyrics.getText().isBlank(), "Lyrics section is empty.");
    }

    @Then("I should see the selected word highlighted in lyrics")
    public void iShouldSeeTheSelectedWordHighlightedInLyrics() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait for at least one highlighted word (yellow background)
        List<WebElement> highlightedWords = wait.until(ExpectedConditions.presenceOfAllElementsLocatedBy(
                By.xpath("//div[@aria-label='Lyrics:']//span[contains(@style, 'background-color: yellow')]")
        ));

        assertFalse(highlightedWords.isEmpty(), "Expected to find at least one highlighted word in lyrics.");
    }

    @Then("I should see a progress bar that shows the loading progress")
    public void iShouldSeeAProgressBarThatShowsTheLoadingProgress() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Wait for the <progress> element to appear
        WebElement progressBar = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.tagName("progress")
        ));

        // Check the value and max attributes
        String value = progressBar.getAttribute("value");
        String max = progressBar.getAttribute("max");

        assertNotNull(value, "Progress bar 'value' attribute is missing.");
        assertNotNull(max, "Progress bar 'max' attribute is missing.");
        assertTrue(Integer.parseInt(value) <= Integer.parseInt(max), "Progress bar value exceeds max.");
    }

    @Then("I should see a progress bar that correctly loads multiple songs")
    public void iShouldSeeProgressBarCorrectlyLoadsMultipleSongs() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Step 1: Wait for progress bar to appear
        WebElement progressBar = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("progress.w-full.h-2")
        ));

        // Step 2: Check initial attributes while it's visible
        int max = Integer.parseInt(progressBar.getAttribute("max"));
        int value = Integer.parseInt(progressBar.getAttribute("value"));

        assertTrue(max >= 2, "Expected to load multiple songs, but max is: " + max);
        assertTrue(value <= max, "Progress value should not exceed max.");

        // Optional: log progress during load
        System.out.println("⬆️  Progress started: " + value + "/" + max);

        // Step 3: Wait for the progress bar to disappear (loading complete)
        wait.until(ExpectedConditions.invisibilityOf(progressBar));

        System.out.println("✅ Progress bar completed and collapsed after loading " + max + " songs.");
    }



    @And("I stopped word cloud")
    public void iStoppedWordCloud() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        By startButtonSelector = By.xpath("//button[contains(text(), 'Stop Word Cloud') or @aria-label='Stop word cloud']");

        WebElement startButton = wait.until(ExpectedConditions.elementToBeClickable(startButtonSelector));
        startButton.click();
    }

    @Then("I see the warning {string}")
    public void iSeeTheWarning(String expectedMessage) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Match the aria-label format used in your component
        String fullLabel = "Status Message: ❌ " + expectedMessage;

        WebElement warning = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[@aria-label='" + fullLabel + "']")
        ));

        assertTrue(warning.isDisplayed(), "Expected warning message not visible.");
    }


    @And("I clicked on {string} picture in ambiguous search")
    public void iClickedOnPictureInAmbiguousSearch(String artistName) {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // The artist's button has an id like "artist-Eminem"
        String artistButtonId = "artist-" + artistName;

        WebElement artistTile = wait.until(ExpectedConditions.elementToBeClickable(
                By.id(artistButtonId)
        ));

        assertTrue(artistTile.isDisplayed(), "Artist tile for '" + artistName + "' is not visible.");
        artistTile.click();

        System.out.println("🎤 Clicked on artist picture for: " + artistName);
    }

    @And("The songs are added to favorites")
    public void theSongsAreAddedToFavorites() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(30));

        // Wait for the success message element
        WebElement successMsg = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.id("search-success")
        ));

        String messageText = successMsg.getText();
        assertTrue(messageText.startsWith("✅ Added:"), "Expected success message to start with '✅ Added:', but got: " + messageText);

        System.out.println("✅ Favorites successfully added: " + messageText);
    }

    @And("I clear all the favorited songs")
    public void iClearAllTheFavoritedSongs() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(30));

        // Step 1: Click the "Clear All Favorites" button
        WebElement clearButton = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//button[@aria-label='Clear All Favorites']"))
        );
        clearButton.click();

        // Step 2: Wait for the modal to appear
        WebElement confirmModal = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.id("confirm-clear-favorites-modal"))
        );

        // Step 3: Click "Yes, clear all"
        WebElement acceptButton = confirmModal.findElement(By.id("accept-remove"));
        acceptButton.click();

        // Step 4 (Optional): Wait for list to clear or message to appear
        wait.until(ExpectedConditions.invisibilityOf(confirmModal));
        WebElement message = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[@aria-label='Notification Message' and contains(text(), '🧹 All songs cleared')]"))
        );

        assertTrue(message.isDisplayed(), "Expected confirmation message not found.");
    }

}

