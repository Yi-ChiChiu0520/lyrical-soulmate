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

import java.sql.Connection;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

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

    // assumes that we are already on a fully loaded favorites song page, and that some songs exist
    public List<WebElement> getFavoritesList() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        return driver.findElement(By.id("favorites-list")).findElements(By.tagName("li"));
    }

    @Given("I have added {string} to my favorites")
    public void addSongToFavorites(String songName) {
        driver.get("http://localhost:8080/dashboard");

        iSearchForSongsByTheName("10", songName);
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

    @When("I search for {string} songs by the name {string}")
    public void iSearchForSongsByTheName(String arg0, String arg1) {
        // wait until the page is loaded
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement songTitleField = wait.until(driver -> {
            WebElement el = driver.findElement(By.id("song-title"));
            return el.isDisplayed() ? el : null;
        });

        // send the title
        assertNotNull(songTitleField);
        songTitleField.sendKeys(arg1);

        // and num songs
        WebElement numSongsField = driver.findElement(By.id("song-limit"));
        numSongsField.sendKeys(arg0);

        // then search
        WebElement searchButton = driver.findElement(By.id("search-button"));
        searchButton.click();

        // wait for results
        wait.until(driver -> {
            WebElement el = driver.findElement(By.id("results-list"));
            return el.isDisplayed() ? el : null;
        });
    }

    @When("I select {string}")
    public void iSelect(String arg0) {
        WebElement resultsList = driver.findElement(By.id("results-list"));

        WebElement checkbox = null;
        for (WebElement el : resultsList.findElements(By.tagName("li"))) {
            // find the song name
            WebElement songName = el.findElement(By.id("song-name"));
            if (songName.getText().contains(arg0)) {
                checkbox = el.findElement(By.tagName("input"));
            }
        }
        assertNotNull(checkbox);

        // get and click the checkbox
        checkbox.click();
    }

    @Then("I should see search success message {string}")
    public void iShouldSeeSearchSuccessMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        boolean errorTextPresent = wait.until(driver -> {
            // check if the error message is present
            WebElement el = driver.findElement(By.id("search-success"));
            return el.getText().contains(arg0);
        });

        assert errorTextPresent;
    }

    @Then("I should see search error message {string}")
    public void iShouldSeeSearchErrorMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        boolean errorTextPresent = wait.until(driver -> {
            // check if the error message is present
            WebElement el = driver.findElement(By.id("search-error"));
            return el.getText().contains(arg0);
        });

        assert errorTextPresent;
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

    @And("I remove {string} from my favorites list")
    public void iRemoveFromMyFavoritesList(String arg0) {
        // I should already be on the favorites page
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song); // just in case

        // find the remove button and click it
        song.findElement(By.id("remove-favorite")).click();
    }

    @And("I move {string} up")
    public void iMoveUp(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("move-up")).click();
    }

    @And("I move {string} down")
    public void iMoveDown(String arg0) {
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song);

        song.findElement(By.id("move-down")).click();
    }

    @Then("I should see {string} above {string}")
    public void iShouldSeeAbove(String arg0, String arg1) {
        List<WebElement> favorites = getFavoritesList();

        int idxOne = -1;
        int idxTwo = -1;
        for (int i = 0; i < favorites.size(); i++) {
            // find the song name
            WebElement songName = favorites.get(i).findElement(By.id("song-title"));
            if (songName.getText().contains(arg0)) {
                idxOne = i;
            } else if (songName.getText().contains(arg1)) {
                idxTwo = i;
            }
        }

        // check that both are found
        assert idxOne != -1 && idxTwo != -1;
        assert idxOne < idxTwo : "Expected " + arg0 + " to be above " + arg1 + ", but it was not.";
    }

    @And("I click on favorite {string}")
    public void iClickOnFavorite(String arg0) {
        // I should already be on the favorites page
        WebElement song = findSongInFavoritesList(arg0);
        assertNotNull(song); // just in case

        // find the remove button and click it
        song.findElement(By.id("song-title")).click();
    }

    @Then("I should see the artist name {string} for {string}")
    public void iShouldSeeTheArtistName(String artistName, String songName) {
        WebElement song = findSongInFavoritesList(songName);

        assert song.findElement(By.id("artist-name")).getText().contains(artistName);
    }

    @Then("I should see the release date {string} for {string}")
    public void iShouldSeeTheReleaseDate(String releaseDate, String songName) {
        WebElement song = findSongInFavoritesList(songName);

        assert song.findElement(By.id("release-date")).getText().contains(releaseDate);
    }
}
