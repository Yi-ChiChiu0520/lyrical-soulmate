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
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(30));

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

        Thread.sleep(500); // Optional buffer
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

        // Wait for the paragraph that starts with ❌ to appear
        WebElement message = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//p[starts-with(normalize-space(), '❌')]")
        ));

        String text = message.getText();
        assertTrue(text.startsWith("❌"), "Expected an error message starting with ❌ but got: " + text);
        System.out.println("🚨 Found error message: " + text);
    }

}

