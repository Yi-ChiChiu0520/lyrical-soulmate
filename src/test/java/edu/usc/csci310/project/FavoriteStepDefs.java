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

public class FavoriteStepDefs {
    private final WebDriver driver;
    private final Connection connection;

    public FavoriteStepDefs(Connection connection) {
        driver = DriverManager.getDriver();
        this.connection = connection;
    }

    public WebElement findSongInFavoritesList(String songName) {
        String id = songName.replaceAll("[\\s\\u00A0]", "").replaceAll("[^a-zA-Z0-9_-]", "");
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        try {
            return wait.until(driver1 -> driver1.findElement(By.id(id)));
        } catch (TimeoutException e) {
            return null;
        }
    }

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
        String artistName = parts.length == 2 ? parts[1] : null;
        assertNotNull(artistName, "Could not parse artist name from song title: " + songName);

        iSearchForSongsByArtist("10", artistName);

        Wait<WebDriver> searchWait = new WebDriverWait(driver, Duration.ofSeconds(10));
        try {
            searchWait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));
        } catch (TimeoutException e) {
            fail("Search results list did not appear after searching for artist '" + artistName + "'.", e);
        }

        iSelect(songName);
        driver.findElement(By.id("add-to-favorites")).click();
        iShouldSeeSuccessMessage("✅ Added: " + songName);
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
        boolean favsRendered = wait.until(driver -> driver.findElement(By.id("favorites-header")).isDisplayed());
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

        driver.findElement(By.id("search-button")).click();
    }

    @When("I select {string}")
    public void iSelect(String songName) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement resultsList = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("results-list")));

        WebElement checkbox = null;
        WebElement songNameElement = null;
        List<WebElement> listItems = resultsList.findElements(By.tagName("li"));
        assertFalse(listItems.isEmpty(), "Results list is empty.");

        for (WebElement el : listItems) {
            try {
                songNameElement = el.findElement(By.id("song-name"));
                if (songNameElement.getText().contains(songName)) {
                    checkbox = el.findElement(By.tagName("input"));
                    break;
                }
            } catch (NoSuchElementException e) {
                System.err.println("Skipping a list item due to missing elements.");
            }
        }

        assertNotNull(checkbox, "Could not find checkbox for song: " + songName);
        assertNotNull(songNameElement, "Could not find song name element for: " + songName);

        if (!checkbox.isSelected()) {
            checkbox.click();
        }

        assertTrue(checkbox.isSelected(), "Checkbox for song was not selected.");
    }

    @Then("I should see success message {string}")
    public void iShouldSeeSuccessMessage(String expectedMessage) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(30));
        try {
            boolean messagePresent = wait.until(driver -> {
                WebElement el = driver.findElement(By.id("search-success"));
                return el.isDisplayed() && el.getText().contains(expectedMessage);
            });
            assertTrue(messagePresent, "Success message did not contain: " + expectedMessage);
        } catch (TimeoutException e) {
            System.err.println("Timeout waiting for success message.");
            fail("Success message not found or incorrect.", e);
        }
    }

    @Then("I should see search error message {string}")
    public void iShouldSeeSearchErrorMessage(String expectedMessage) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        try {
            boolean messagePresent = wait.until(driver -> {
                WebElement el = driver.findElement(By.id("search-error"));
                return el.isDisplayed() && el.getText().contains(expectedMessage);
            });
            assertTrue(messagePresent, "Error message did not contain: " + expectedMessage);
        } catch (TimeoutException e) {
            fail("Error message not found or incorrect.", e);
        }
    }

    @And("I should see {string} in my favorites list")
    public void iShouldSeeInMyFavoritesList(String songName) {
        iNavigateToTheFavoritesPage();
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
    }

    @And("I should not see {string} in my favorites list")
    public void iShouldNotSeeInMyFavoritesList(String songName) {
        iNavigateToTheFavoritesPage();
        WebElement song = findSongInFavoritesList(songName);
        assertNull(song);
    }

    @And("I hover over {string}")
    public void iHoverOver(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        new Actions(driver).moveToElement(song).perform();
    }

    @Then("I should see the move and remove buttons on {string}")
    public void iShouldSeeTheMoveAndRemoveButtonsOn(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        assertNotNull(song.findElement(By.id("move-up")));
        assertNotNull(song.findElement(By.id("move-down")));
        assertNotNull(song.findElement(By.id("remove-favorite")));
    }

    @And("I click the remove button on {string}")
    public void iRemoveFromMyFavoritesList(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        song.findElement(By.id("remove-favorite")).click();
    }

    @And("I click the move up button on {string}")
    public void iMoveUp(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        song.findElement(By.id("move-up")).click();
    }

    @And("I click the move down button on {string}")
    public void iMoveDown(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        song.findElement(By.id("move-down")).click();
    }

    @Then("I should see {string} above {string}")
    public void iShouldSeeAbove(String songA, String songB) throws InterruptedException {
        Thread.sleep(500);
        List<WebElement> favorites = getFavoritesList();

        int idxA = -1, idxB = -1;
        for (int i = 0; i < favorites.size(); i++) {
            String name = favorites.get(i).findElement(By.id("song-title")).getText();
            if (name.contains(songA)) idxA = i;
            if (name.contains(songB)) idxB = i;
        }

        assertTrue(idxA != -1 && idxB != -1);
        assertTrue(idxA < idxB, songA + " was not above " + songB);
    }

    @And("I click on the song title {string}")
    public void iClickOnFavorite(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        song.findElement(By.id("song-title")).click();
    }

    @Then("I should see the artist name {string} for {string}")
    public void iShouldSeeTheArtistName(String artist, String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertTrue(song.findElement(By.id("artist-name")).getText().contains(artist));
    }

    @Then("I should see the release date {string} for {string}")
    public void iShouldSeeTheReleaseDate(String date, String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertTrue(song.findElement(By.id("release-date")).getText().contains(date));
    }

    @And("I select favorite {string}")
    public void iSelectFavorite(String songName) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);
        song.findElement(By.id("select-favorite")).click();
    }

    @When("I do not select any favorites")
    public void iDoNotSelectAnyFavorites() {}

    @Then("I cannot click the Generate Word Cloud button")
    public void iCannotClickTheGenerateWordCloudButton() {
        WebElement button = driver.findElement(By.id("add-to-word-cloud"));
        assertFalse(button.isEnabled());
    }

    @Then("I click the Generate Word Cloud button")
    public void iClickTheGenerateWordCloudButton() {
        WebElement button = driver.findElement(By.id("add-to-word-cloud"));
        assertTrue(button.isEnabled());
        button.click();
    }

    @Then("I should get an alert {string}")
    public void iShouldGetAnAlert(String message) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        String alertText = wait.until(driver -> driver.switchTo().alert().getText());
        driver.switchTo().alert().accept();
        assertEquals(message, alertText);
    }

    @Then("I should see a word cloud")
    public void iShouldSeeAWordCloud() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement el = wait.until(driver -> {
            WebElement wc = driver.findElement(By.id("word-cloud"));
            return wc.isDisplayed() ? wc : null;
        });
        assertNotNull(el);
    }

    @When("I refresh the favorites page")
    public void iRefreshThePage() {
        driver.navigate().refresh();
        WebElement el = new WebDriverWait(driver, Duration.ofSeconds(10)).until(
                d -> {
                    WebElement header = d.findElement(By.id("favorites-header"));
                    return header.isDisplayed() ? header : null;
                }
        );
        assertNotNull(el);
    }

    @And("the order of songs in my favorites list should be:")
    public void theOrderOfSongsInMyFavoritesListShouldBe() {}

    @Then("I should have the following order in my favorites list")
    public void iShouldHaveTheFollowingOrderInMyFavoritesList(DataTable table) {
        List<List<String>> rows = table.asLists(String.class);
        iNavigateToTheFavoritesPage();
        List<WebElement> favorites = getFavoritesList();
        assertNotNull(favorites);

        for (int i = 0; i < rows.size(); i++) {
            String expected = rows.get(i).get(1);
            String actual = favorites.get(i).findElement(By.id("song-title")).getText();
            assertTrue(actual.contains(expected), "Expected " + expected + " at index " + i + ", but got " + actual);
        }
    }

    @And("{string} is at index {} in my favorites list")
    public void isAtIndexInMyFavoritesList(String songName, int index) {
        WebElement song = findSongInFavoritesList(songName);
        assertNotNull(song);

        List<WebElement> favorites = getFavoritesList();
        int foundIndex = -1;
        for (int i = 0; i < favorites.size(); i++) {
            if (favorites.get(i).findElement(By.id("song-title")).getText().contains(songName)) {
                foundIndex = i;
                break;
            }
        }

        assertEquals(index, foundIndex, "Expected " + songName + " at index " + index);
    }

    @Given("My favorites list is empty")
    public void myFavoritesListIsEmpty() {
        DriverManager.resetUserFavorites(connection, "testUser");
        iNavigateToTheFavoritesPage();
        assertNull(getFavoritesList(), "Expected favorites list to be empty.");
    }
}
