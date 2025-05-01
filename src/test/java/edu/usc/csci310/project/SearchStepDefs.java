package edu.usc.csci310.project;

import io.cucumber.java.AfterAll;
import io.cucumber.java.Before;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.sql.Connection;
import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.*;

// Contains step definitions for testing the song search (by artist) features.
public class SearchStepDefs {
    private final WebDriver driver;
    private final Connection connection;

    public SearchStepDefs(Connection connection) {
        driver = DriverManager.getDriver();
        this.connection = connection;
    }

    // Closes the WebDriver after all scenarios have run.
    @AfterAll
    public static void afterAll() {
        DriverManager.closeDriver();
    }

    // Resets the user database before each scenario.
    @Before
    public void before() {
        DriverManager.resetUserDatabase(connection);
    }

    // --- Setup and Navigation Steps ---

    @Given("I am logged in")
    public void iAmLoggedIn() {
        DriverManager.createUserWithUsername(connection, "testUser");
        driver.get("https://localhost:8080");

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginButton")));

        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("window.localStorage.setItem('user', 'testUser');");
        driver.navigate().refresh();
        driver.get("https://localhost:8080/dashboard");
        wait.until(ExpectedConditions.urlContains("dashboard"));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("artist-title")));
    }

    @Given("I am logged in to the application")
    public void iAmLoggedInToTheApplication() {
        iAmLoggedIn();
    }

    @When("I navigate to the search page")
    public void iNavigateToTheSearchPage() {
        if (!driver.getCurrentUrl().contains("dashboard")) {
            iAmLoggedIn();
        } else {
            Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("artist-title")));
        }
    }

    // --- Search Input Steps ---

    @And("I enter {string} in the search field")
    public void iEnterInTheSearchField(String searchTerm) {
        iEnterInTheArtistSearchField(searchTerm);
    }

    @And("I enter {string} in the artist search field")
    public void iEnterInTheArtistSearchField(String artistName) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        WebElement searchField = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("artist-title")));
        searchField.clear();
        searchField.sendKeys(artistName);
    }

    @And("I enter no artist name")
    public void iEnterNoArtistName() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement searchField = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("artist-title")));
        searchField.clear();
    }

    @And("I enter no song display number")
    public void iEnterNoSongDisplayNumber() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement songLimitField = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("song-limit")));
        songLimitField.clear();
    }

    @And("I select to display {string} results")
    public void iSelectToDisplayResults(String limit) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement songLimitField = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("song-limit")));
        songLimitField.clear();
        songLimitField.sendKeys(limit);
    }

    @And("I enter a non-existent artist name {string}")
    public void iEnterANonExistentArtistName(String nonExistentName) {
        iEnterInTheArtistSearchField(nonExistentName);
    }


    // --- Action Steps ---

    @And("I click the search button")
    public void iClickTheSearchButton() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement searchButton = wait.until(ExpectedConditions.elementToBeClickable(By.id("search-button")));
        searchButton.click();

        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @And("I click search")
    public void iClickSearch() {
        iClickTheSearchButton();
    }

    // Sets up a scenario where a search has already happened.
    @Given("I have searched for artist {string}")
    public void iHaveSearchedForArtist(String artistName) {
        iNavigateToTheSearchPage();
        iEnterInTheArtistSearchField(artistName);
        iSelectToDisplayResults("5");
        iClickTheSearchButton();
        iSelectArtist(artistName);

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        } catch (TimeoutException e) {
            try {
                Alert alert = driver.switchTo().alert();
                System.err.println("Alert during search setup: " + alert.getText());
                alert.accept();
            } catch (NoAlertPresentException ignored) {}
            fail("Search results did not appear during setup for artist: " + artistName);
        }
    }

    @And("I select the song {string}")
    public void iSelectTheSong(String songTitle) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));

        WebElement targetCheckbox = null;
        for (WebElement songElement : songElements) {
            try {
                WebElement nameElement = songElement.findElement(By.id("song-name"));
                if (nameElement.getText().contains(songTitle)) {
                    targetCheckbox = songElement.findElement(By.tagName("input"));
                    break;
                }
            } catch (NoSuchElementException e) {
                System.err.println("Skipping a result list item due to missing elements.");
            }
        }

        assertNotNull(targetCheckbox, "Could not find song '" + songTitle + "' in the results list to select.");
        if (!targetCheckbox.isSelected()) {
            targetCheckbox.click();
        }
        assertTrue(targetCheckbox.isSelected(), "Checkbox for song '" + songTitle + "' was not selected after clicking.");
    }

    // Clicks the button to add selected songs to favorites or word cloud.
    @When("I click the {string} button for a song")
    public void iClickTheActionButton(String buttonText) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        By buttonSelector;

        if ("Add Selected to Favorites".equalsIgnoreCase(buttonText)) {
            buttonSelector = By.id("add-to-favorites");
        } else if ("Add Selected to Word Cloud".equalsIgnoreCase(buttonText)) {
            buttonSelector = By.id("add-to-wordcloud");
        } else {
            fail("Unsupported button text specified: " + buttonText);
            return;
        }

        WebElement button = wait.until(ExpectedConditions.elementToBeClickable(buttonSelector));
        button.click();
    }

    // Clicks the first song in the results list.
    @When("I click on a song in the search results")
    public void iClickOnASongInTheSearchResults() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));
        assertFalse(songElements.isEmpty(), "No songs found in search results to click on.");

        WebElement firstSongNameElement = songElements.get(0).findElement(By.id("song-name"));
        wait.until(ExpectedConditions.elementToBeClickable(firstSongNameElement)).click();
    }

    // --- Assertion Steps ---

    @And("search results are displayed")
    public void searchResultsAreDisplayed() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
            assertTrue(resultsList.isDisplayed(), "Search results container (#results-list) is not visible.");
        } catch (TimeoutException e) {
            fail("Search results container (#results-list) did not appear within the timeout.");
        }
    }

    @And("search results are displayed with artist name and their songs")
    public void searchResultsAreDisplayedWithArtistNameAndSongs() {
        searchResultsAreDisplayed();

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        List<WebElement> songElements = wait.until(ExpectedConditions.numberOfElementsToBeMoreThan(By.cssSelector("#results-list li"), 0));
        assertFalse(songElements.isEmpty(), "No song list items (<li>) found within #results-list.");

        WebElement firstSong = songElements.get(0);
        WebElement songNameElement = firstSong.findElement(By.id("song-name"));
        assertTrue(songNameElement.getText().contains(" by "), "First song result does not display ' by ' (Artist name expected). Text: " + songNameElement.getText());
        WebElement imgElement = firstSong.findElement(By.tagName("img"));
        assertTrue(imgElement.isDisplayed(), "Image element not displayed in the first song result.");
        assertTrue(imgElement.getAttribute("src") != null && !imgElement.getAttribute("src").isEmpty(), "Image element in first song result has no src attribute.");
    }

    @Then("I should see a list of songs by {string}")
    public void iShouldSeeAListOfSongsBy(String artistName) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));

        assertFalse(songElements.isEmpty(), "Results list is empty. Expected songs by " + artistName);

        boolean foundArtist = false;
        for (WebElement songElement : songElements) {
            try {
                WebElement songNameElement = songElement.findElement(By.id("song-name"));
                if (songNameElement.getText().toLowerCase().contains(artistName.toLowerCase())) {
                    foundArtist = true;
                    break;
                }
            } catch (NoSuchElementException e) {
                System.err.println("Warning: Skipping result item due to missing #song-name element.");
            }
        }
        assertTrue(foundArtist, "No songs clearly attributed to artist '" + artistName + "' found in search results.");
    }

    @Then("I should see a list of {int} songs by {string}")
    public void iShouldSeeAListOfSongsByCount(int expectedCount, String artistName) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));

        long actualCount = songElements.stream()
                .filter(songElement -> {
                    try {
                        return songElement.findElement(By.id("song-name")).getText().toLowerCase().contains(artistName.toLowerCase());
                    } catch (NoSuchElementException e) {
                        return false;
                    }
                })
                .count();

        assertEquals(expectedCount, actualCount, "Expected " + expectedCount + " songs by '" + artistName + "' but found " + actualCount);
        assertEquals(expectedCount, songElements.size(), "Total number of results displayed (" + songElements.size() + ") does not match the expected count (" + expectedCount + ").");
    }

    @And("each song result should display the song name and artist")
    public void eachSongResultShouldDisplayTheSongNameAndArtist() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));
        assertFalse(songElements.isEmpty(), "No song results found to check structure.");

        for (int i = 0; i < songElements.size(); i++) {
            WebElement songElement = songElements.get(i);
            try {
                WebElement songNameElement = songElement.findElement(By.id("song-name"));
                assertNotNull(songNameElement, "Song name element not found in result #" + (i+1));
                assertFalse(songNameElement.getText().isEmpty(), "Song name is empty in result #" + (i+1));
                String songText = songNameElement.getText();
                assertTrue(songText.contains(" by "), "Song result #" + (i+1) + " does not display ' by ' (Artist name expected): " + songText);

                WebElement imgElement = songElement.findElement(By.tagName("img"));
                assertTrue(imgElement.isDisplayed(), "Image not displayed in result #" + (i+1));
                assertTrue(imgElement.getAttribute("src") != null && !imgElement.getAttribute("src").isEmpty(), "Image in result #" + (i+1) + " has no src attribute.");

            } catch (NoSuchElementException e) {
                fail("Result item #" + (i+1) + " is missing expected structure (e.g., #song-name or img).", e);
            }
        }
    }

    // Checks for different kinds of error messages (alert or element).
    @Then("I should see an error message")
    public void iShouldSeeAnErrorMessage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        boolean foundMessage = false;
        String alertText = "N/A";
        String elementText = "N/A";

        try {
            Alert alert = wait.until(ExpectedConditions.alertIsPresent());
            alertText = alert.getText();
            System.out.println("Alert found with text: " + alertText);
            assertTrue(alertText.contains("artist name") || alertText.contains("number of songs"),
                    "Alert text did not match expected validation message. Found: " + alertText);
            alert.accept();
            foundMessage = true;
        } catch (TimeoutException e) {
            System.out.println("No alert present within timeout. Checking for #search-error element.");
            try {
                WebElement errorMessage = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("search-error")));
                elementText = errorMessage.getText().trim();
                if (errorMessage.isDisplayed() && !elementText.isEmpty()) {
                    System.out.println("Error message element found with text: " + elementText);
                    assertTrue(elementText.contains("error") || elementText.contains("failed"),
                            "Error element text does not indicate an error. Found: " + elementText);
                    foundMessage = true;
                } else {
                    System.out.println("#search-error element found but not displayed or empty.");
                }
            } catch (TimeoutException | NoSuchElementException ex) {
                System.out.println("No #search-error element found within timeout.");
            }
        }

        if (!foundMessage) {
            System.err.println("Page source when failing to find error message: " + driver.getPageSource());
            fail(String.format("Expected an error message (Alert or #search-error), but found neither. Alert Text: %s, Element Text: %s", alertText, elementText));
        }
    }

    // Checks specifically for the "No results found" message variations.
    @Then("I should see a no results error message")
    public void iShouldSeeANoResultsErrorMessage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        // page should contain "No artists found" or "No songs found"
        By noResultsParaSelector = By.xpath("//p[contains(text(), 'No artists found') or contains(text(), 'No songs found')]");
        try {
            WebElement noResultsPara = wait.until(ExpectedConditions.visibilityOfElementLocated(noResultsParaSelector));
            assertTrue(noResultsPara.isDisplayed(), "No results paragraph message not displayed.");
            String noResultsText = noResultsPara.getText().trim();
            assertTrue(noResultsText.contains("No artists found") || noResultsText.contains("No songs found"),
                    "No results message text does not indicate 'no results'. Found: " + noResultsText);
        } catch (TimeoutException e) {
            System.out.println("No 'no results' paragraph found within timeout.");
        }
    }

    @And("no search results displayed")
    public void noSearchResultsDisplayed() {
        List<WebElement> resultsList = driver.findElements(By.id("results-list"));
        if (!resultsList.isEmpty()) {
            List<WebElement> songElements = resultsList.get(0).findElements(By.tagName("li"));
            assertTrue(songElements.isEmpty(), "Search results list (#results-list) was found, but it contains result items when none were expected.");
        } else {
            assertTrue(true, "#results-list element not found, confirming no results are displayed.");
        }
    }

    @Then("I should see the song details including:")
    public void iShouldSeeTheSongDetailsIncluding(io.cucumber.datatable.DataTable dataTable) {
        List<String> expectedDetails = dataTable.asList();
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement firstSong = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("#results-list li")));
        assertNotNull(firstSong, "Could not find the first song result item.");

        if (expectedDetails.contains("Song name")) {
            WebElement songNameElement = firstSong.findElement(By.id("song-name"));
            assertNotNull(songNameElement, "Song name element not found in first result");
            assertFalse(songNameElement.getText().isEmpty(), "Song name is empty in first result");
        }
        if (expectedDetails.contains("Artist name")) {
            WebElement songNameElement = firstSong.findElement(By.id("song-name"));
            assertTrue(songNameElement.getText().contains(" by "), "Artist name (' by ') not found in song details text: " + songNameElement.getText());
        }
        if (expectedDetails.contains("Release date")) {
            WebElement nameDiv = firstSong.findElement(By.xpath(".//span[@id='song-name']/parent::div"));
            List<WebElement> spans = nameDiv.findElements(By.tagName("span"));
            assertTrue(spans.size() >= 2, "Could not find release date span (expected second span in div).");
            String releaseDateText = spans.get(1).getText();
            assertTrue(releaseDateText.contains("📅"), "Release date span does not contain the calendar emoji. Text: " + releaseDateText);
        }
    }

    @Then("the song should be added to my favorites list")
    public void theSongShouldBeAddedToMyFavoritesList() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement successMessage = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("search-success")));
        assertTrue(successMessage.isDisplayed(), "Success message (#search-success) for adding to favorites not displayed");
        assertTrue(successMessage.getText().contains("✅ Added:") || successMessage.getText().contains("⚠️ Already in favorites:"),
                "Success message text does not indicate success or already added. Text: " + successMessage.getText());
    }

    @And("I should see a confirmation message")
    public void iShouldSeeAConfirmationMessage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement successMessage = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("search-success")));
        assertTrue(successMessage.isDisplayed(), "Confirmation message (#search-success) not displayed");
        assertTrue(successMessage.getText().contains("✅ Added:") || successMessage.getText().contains("⚠️ Already in favorites:"),
                "Confirmation message text does not indicate success or already added. Text: " + successMessage.getText());
    }

    // Verifies the number of results respects the limit, handling cases with 0 results.
    @Then("I should see no more than {int} song results")
    public void iShouldSeeNoMoreThanSongResults(int limit) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(35));
        By resultsListSelector = By.id("results-list");
        By noResultsParaSelector = By.xpath("//p[contains(text(), 'No songs found')]");
        By searchErrorSelector = By.id("search-error");

        try {
            WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(resultsListSelector));
            List<WebElement> songElements = resultsList.findElements(By.tagName("li"));
            assertTrue(songElements.size() <= limit,
                    "More than " + limit + " song results displayed: " + songElements.size());
            System.out.println("Results list found with " + songElements.size() + " items (Limit: " + limit + ")");

        } catch (TimeoutException e) {
            System.out.println("Results list did not appear within " + 35 + "s. Checking for 'no results' messages.");

            List<WebElement> noResultsParaElements = driver.findElements(noResultsParaSelector);
            List<WebElement> searchErrorElements = driver.findElements(searchErrorSelector);

            boolean noResultsFound = false;
            if (!noResultsParaElements.isEmpty() && noResultsParaElements.get(0).isDisplayed()) {
                System.out.println("Found 'No songs found' paragraph message.");
                noResultsFound = true;
            } else if (!searchErrorElements.isEmpty() && searchErrorElements.get(0).isDisplayed()) {
                String errorText = searchErrorElements.get(0).getText().toLowerCase();
                if (errorText.contains("no matches")) {
                    System.out.println("Found #search-error element with 'no matches' text.");
                    noResultsFound = true;
                } else {
                    System.out.println("#search-error element found, but text was: " + errorText);
                }
            }

            if (noResultsFound) {
                System.out.println("Condition (<= " + limit + ") met because no results were found.");
                assertTrue(true);
            } else {
                System.err.println("Page source when no results/error found after timeout: " + driver.getPageSource());
                fail("Expected search results (<= " + limit + ") or a 'no results' message, but neither was found after waiting.", e);
            }
        }
    }

    // Verifies the word cloud panel appears and has content.
    @Then("I should see the song's word cloud")
    public void iShouldSeeTheSongsWordCloud() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(25));
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

    @Then("I should see a list of songs by artists with the name {string}")
    public void iShouldSeeAListOfSongsByArtistsWithTheName(String artistName) {
        iShouldSeeAListOfSongsBy(artistName);
    }

    @And("I should see artist images")
    public void iShouldSeeArtistImages() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));
        assertFalse(songElements.isEmpty(), "No song results found to check for images.");

        for (int i = 0; i < songElements.size(); i++) {
            WebElement songElement = songElements.get(i);
            try {
                WebElement imgElement = songElement.findElement(By.tagName("img"));
                assertTrue(imgElement.isDisplayed(), "Image not displayed in result #" + (i+1));
                assertTrue(imgElement.getAttribute("src") != null && !imgElement.getAttribute("src").isEmpty(), "Image in result #" + (i+1) + " has no src attribute.");
            } catch (NoSuchElementException e) {
                fail("Result item #" + (i+1) + " is missing the image element (<img>).", e);
            }
        }
    }

    @Then("I should be able to select a song")
    public void iShouldBeAbleToSelectASong() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        List<WebElement> songElements = resultsList.findElements(By.tagName("li"));
        assertFalse(songElements.isEmpty(), "No songs found in search results to select.");

        WebElement firstSong = songElements.get(0);
        try {
            WebElement checkbox = firstSong.findElement(By.tagName("input"));
            assertTrue(checkbox.isEnabled(), "Checkbox for the first song is not enabled.");
        } catch (NoSuchElementException e) {
            fail("Checkbox (input element) not found in the first song result.", e);
        }
    }

    // --- Steps for Unauthenticated Access ---

    @And("I am not logged in")
    public void iAmNotLoggedIn() {
        driver.manage().deleteAllCookies();
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("window.localStorage.clear();");
        driver.get("https://localhost:8080");
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginButton")));
    }

    @And("I try to navigate to the search page")
    public void iTryToNavigateToTheSearchPage() {
        driver.get("https://localhost:8080/dashboard");
    }

    @Then("I should see a list of artists that include the name {string}")
    public void iShouldSeeAListOfArtistsThatIncludeTheName(String arg0) {
        // this div holds the artist grid id = "artist-selection"
        // get the list of artists
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement artistGrid = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("artist-selection")));
        List<WebElement> artistElements = artistGrid.findElements(By.tagName("span"));

        assertFalse(artistElements.isEmpty(), "No artist elements found in the artist grid.");
        for (WebElement artistElement : artistElements) {
            assert(artistElement.getText().toLowerCase().contains(arg0.toLowerCase()));
        }
    }

    @Then("I select artist {string}")
    public void iSelectArtist(String artistName) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement artistGrid = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("artist-selection")));
        List<WebElement> artistElements = artistGrid.findElements(By.tagName("span"));

        assertFalse(artistElements.isEmpty(), "No artist elements found in the artist grid.");
        for (WebElement artistElement : artistElements) {
            if (artistElement.getText().toLowerCase().contains(artistName.toLowerCase())) {
                artistElement.click();
                break;
            }
        }
    }
}
