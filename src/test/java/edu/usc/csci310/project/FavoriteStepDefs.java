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
import java.sql.Driver;
import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.*;

public class FavoriteStepDefs {
    private final WebDriver driver;
    private final Connection connection;

    public FavoriteStepDefs(Connection connection) {
        driver = DriverManager.getDriver();
        this.connection = connection;
    }

    // assumes that we are already on a fully loaded favorites song page, and returns null if the element doesn't exist
    public WebElement findSongInFavoritesList(String songName) {
        String id = songName.replaceAll("[\\s\\u00A0]", "").replaceAll("[^a-zA-Z0-9_-]", "");

        // try and find the song, but return null rather than failing
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        try {
            // wait until the page is loaded
            return wait.until(driver1 -> {
                // return if we can find the element in the list
                return driver1.findElement(By.id(id));
            });
        } catch (TimeoutException e) {
            // element not found
            return null;
        }
    }

    // assumes that we are already on a fully loaded favorites song page, and returns null if the list is empty
    public List<WebElement> getFavoritesList() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        try {
            return wait.until(driver -> driver.findElement(By.id("favorites-list")).findElements(By.tagName("li")));
        } catch (TimeoutException e) {
            return null;
        }
    }

    @Given("I have added {string} to my favorites")
    public void addSongToFavorites(String songName) {
        driver.get("http://localhost:8080/dashboard");

        String[] parts = songName.split(" by ", 2);
        String artistName = null;
        if (parts.length == 2) {
            artistName = parts[1];
            System.out.println("Artist: " + artistName);
        }
        assertNotNull(artistName, "Could not parse artist name from song title: " + songName);

        iSearchForSongsByArtist("10", artistName);

        Wait<WebDriver> searchWait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            searchWait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        } catch (TimeoutException e) {
            fail("Search results list did not appear after searching for artist '" + artistName + "' in addSongToFavorites helper.", e);
        }

        iSelect(songName);

        WebElement addToFavoritesButton = driver.findElement(By.id("add-to-favorites"));
        addToFavoritesButton.click();

        iShouldSeeSearchSuccessMessage("✅ Added: " + songName);
    }

    @AfterAll
    public static void afterAll() {
        DriverManager.closeDriver();
    }

    @Before
    public void before() {
        DriverManager.resetUserDatabase(connection);
    }

    @Given("I try to navigate to the favorites page")
    public void iTryToNavigateToTheFavoritesPage() {
        driver.get("http://localhost:8080/favorites");
    }

    @Given("I navigate to the favorites page")
    public void iNavigateToTheFavoritesPage() {
        driver.get("http://localhost:8080/favorites");

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        boolean favsRendered = wait.until(driver -> {
            WebElement el = driver.findElement(By.id("favorites-header"));
            return el.isDisplayed();
        });
        assert favsRendered;
    }

    @When("I search for {string} songs by {string}")
    public void iSearchForSongsByArtist(String limit, String artistName) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        WebElement artistField = wait.until(driver -> {
            WebElement el = driver.findElement(By.id("song-title"));
            return el.isDisplayed() ? el : null;
        });

        assertNotNull(artistField);
        artistField.clear();
        artistField.sendKeys(artistName);

        WebElement numSongsField = driver.findElement(By.id("song-limit"));
        numSongsField.clear();
        numSongsField.sendKeys(limit);

        WebElement searchButton = driver.findElement(By.id("search-button"));
        searchButton.click();
    }

    @When("I select {string}")
    public void iSelect(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));

        WebElement checkbox = null;
        WebElement songNameElement = null;
        List<WebElement> listItems = resultsList.findElements(By.tagName("li"));
        assertFalse(listItems.isEmpty(), "Results list is empty, cannot select song '" + arg0 + "'");

        for (WebElement el : listItems) {
            try {
                songNameElement = el.findElement(By.id("song-name"));
                if (songNameElement.getText().contains(arg0)) {
                    checkbox = el.findElement(By.tagName("input"));
                    break;
                }
            } catch (NoSuchElementException e) {
                System.err.println("Skipping list item, couldn't find #song-name or input element.");
            }
        }
        assertNotNull(checkbox, "Could not find checkbox for song containing text '" + arg0 + "' in the results list.");
        assertNotNull(songNameElement, "Could not find song name element for song containing text '" + arg0 + "'.");

        if (!checkbox.isSelected()) {
            checkbox.click();
        }
        assertTrue(checkbox.isSelected(), "Checkbox for song '" + songNameElement.getText() + "' was not selected after clicking.");
    }

    @Then("I should see search success message {string}")
    public void iShouldSeeSearchSuccessMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(30));
        try {
            boolean messagePresent = wait.until(driver -> {
                WebElement el = driver.findElement(By.id("search-success"));
                return el.isDisplayed() && el.getText().contains(arg0);
            });
            assertTrue(messagePresent, "Success message found but text did not contain '" + arg0 + "'");
        } catch (TimeoutException e) {
            System.err.println("Page source on timeout waiting for #search-success: " + driver.getPageSource());
            fail("Timed out waiting for success message element (#search-success) containing '" + arg0 + "'", e);
        }
    }

    @Then("I should see search error message {string}")
    public void iShouldSeeSearchErrorMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        try {
            boolean messagePresent = wait.until(driver -> {
                WebElement el = driver.findElement(By.id("search-error"));
                return el.isDisplayed() && el.getText().contains(arg0);
            });
            assertTrue(messagePresent, "Error message found but text did not contain '" + arg0 + "'");
        } catch (TimeoutException e) {
            System.err.println("Page source on timeout waiting for #search-error: " + driver.getPageSource());
            fail("Timed out waiting for error message element (#search-error) containing '" + arg0 + "'", e);
        }
    }

    @And("I should see {string} in my favorites list")
    public void iShouldSeeInMyFavoritesList(String arg0) throws InterruptedException {
        iNavigateToTheFavoritesPage();

        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);
    }

    @And("I should not see {string} in my favorites list")
    public void iShouldNotSeeInMyFavoritesList(String arg0) {
        iNavigateToTheFavoritesPage();

        WebElement song = findSongInFavoritesList(arg0);
        assertNull(song);
    }

    @And("I hover over {string}")
    public void iHoverOver(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        Actions actions = new Actions(driver);
        actions.moveToElement(song).perform();
    }

    @Then("I should see the move and remove buttons on {string}")
    public void iShouldSeeTheMoveAndRemoveButtonsOn(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        assertNotNull(song.findElement(By.id("move-up")));
        assertNotNull(song.findElement(By.id("move-down")));
        assertNotNull(song.findElement(By.id("remove-favorite")));
    }

    @And("I click the remove button on {string}")
    public void iRemoveFromMyFavoritesList(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("remove-favorite")).click();
    }

    @And("I click the move up button on {string}")
    public void iMoveUp(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("move-up")).click();
    }

    @And("I click the move down button on {string}")
    public void iMoveDown(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("move-down")).click();
    }

    @Then("I should see {string} above {string}")
    public void iShouldSeeAbove(String arg0, String arg1) throws InterruptedException {
        Thread.sleep(500);
        List<WebElement> favorites = getFavoritesList();

        int idxOne = -1;
        int idxTwo = -1;
        for (int i = 0; i < favorites.size(); i++) {
            WebElement songName = favorites.get(i).findElement(By.id("song-title"));
            if (songName.getText().contains(arg0)) {
                idxOne = i;
            } else if (songName.getText().contains(arg1)) {
                idxTwo = i;
            }
        }

        assert idxOne != -1 && idxTwo != -1;
        assert idxOne < idxTwo : "Expected " + arg0 + " to be above " + arg1 + ", but it was not.";
    }

    @And("I click on the song title {string}")
    public void iClickOnFavorite(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("song-title")).click();
    }

    @Then("I should see the artist name {string} for {string}")
    public void iShouldSeeTheArtistName(String artistName, String songName) throws InterruptedException {
        Thread.sleep(500);
        WebElement song = findSongInFavoritesList(songName);

        assert song.findElement(By.id("artist-name")).getText().contains(artistName);
    }

    @Then("I should see the release date {string} for {string}")
    public void iShouldSeeTheReleaseDate(String releaseDate, String songName) {
        WebElement song = findSongInFavoritesList(songName);

        assert song.findElement(By.id("release-date")).getText().contains(releaseDate);
    }

    @And("I select favorite {string}")
    public void iSelectFavorite(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("select-favorite")).click();
    }

    @When("I do not select any favorites")
    public void iDoNotSelectAnyFavorites() {
    }

    @Then("I cannot click the Generate Word Cloud button")
    public void iCannotClickTheGenerateWordCloudButton() {
        WebElement wordCloudButton = driver.findElement(By.id("add-to-word-cloud"));
        assert !wordCloudButton.isEnabled();
    }

    @Then("I click the Generate Word Cloud button")
    public void iClickTheGenerateWordCloudButton() {
        WebElement wordCloudButton = driver.findElement(By.id("add-to-word-cloud"));
        assert wordCloudButton.isEnabled();
        wordCloudButton.click();
    }

    @Then("I should get an alert {string}")
    public void iShouldGetAnAlert(String alertDescription) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        String alertText = wait.until(driver -> driver.switchTo().alert().getText());
        driver.switchTo().alert().accept();

        assertEquals(alertDescription, alertText);
    }

    @Then("I should see a word cloud")
    public void iShouldSeeAWordCloud() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement wordCloud = wait.until(driver -> {
            WebElement el = driver.findElement(By.id("word-cloud"));
            return el.isDisplayed() ? el : null;
        });

        assertNotNull(wordCloud);
    }

    @When("I refresh the favorites page")
    public void iRefreshThePage() {
        driver.navigate().refresh();
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement el = wait.until(driver -> {
            WebElement element = driver.findElement(By.id("favorites-header"));
            return element.isDisplayed() ? element : null;
        });
        assertNotNull(el);
    }

    @And("the order of songs in my favorites list should be:")
    public void theOrderOfSongsInMyFavoritesListShouldBe() {
    }

    @Then("^I should have the following order in my favorites list$")
    public void iShouldHaveTheFollowingOrderInMyFavoritesList(DataTable table) {
        List<List<String>> rows = table.asLists(String.class);

        iNavigateToTheFavoritesPage();

        List<WebElement> favorites = getFavoritesList();
        assertNotNull(favorites);

        for (int i = 0; i < rows.size(); i++) {
            WebElement songName = favorites.get(i).findElement(By.id("song-title"));
            assert songName.getText().contains(rows.get(i).get(1)) : "Expected " + rows.get(i).get(1) + " to be at index " + i + ", but it was not.";
        }
    }
    

    @And("{string} is at index {} in my favorites list")
    public void isAtIndexInMyFavoritesList(String arg0, int arg1) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        List<WebElement> favorites = getFavoritesList();
        int idx = -1;
        for (int i = 0; i < favorites.size(); i++) {
            WebElement songName = favorites.get(i).findElement(By.id("song-title"));
            if (songName.getText().contains(arg0)) {
                idx = i;
            }
        }

        assert idx != -1;
        assertEquals(arg1, idx, "Expected " + arg0 + " to be at index " + arg1 + ", but it was not.");
    }

    @Given("My favorites list is empty")
    public void myFavoritesListIsEmpty() {
        DriverManager.resetUserFavorites(connection, "testUser");

        iNavigateToTheFavoritesPage();
        List<WebElement> favorites = getFavoritesList();
        assertNull(favorites, "Expected favorites list to be empty, but it was not.");
    }
}
