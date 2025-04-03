package edu.usc.csci310.project;

import io.cucumber.java.AfterAll;
import io.cucumber.java.Before;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.sql.Connection;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertNotNull;

public class FavoriteStepDefs {
    private final WebDriver driver;
    private final Connection connection;

    public FavoriteStepDefs(Connection connection) {
        driver = DriverManager.getDriver();
        this.connection = connection;
    }

    @Given("I have added {string} to my favorites")
    public void addSongToFavorites(String songName) {
        driver.get("http://localhost:8080/dashboard");

        iSearchForSongsByTheName("1", songName);
        iSelect(songName);

        WebElement addToFavoritesButton = driver.findElement(By.id("add-to-favorites"));
        addToFavoritesButton.click();

        iShouldSeeSearchMessage("✅ Added: " + songName);
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
            WebElement el = driver.findElement(By.id("favorites-list"));
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

    @Then("I should see search message {string}")
    public void iShouldSeeSearchMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        boolean errorTextPresent = wait.until(driver -> {
            // check if the error message is present
            WebElement el = driver.findElement(By.id("search-message"));
            return el.getText().contains(arg0);
        });

        assert errorTextPresent;
    }

    @And("I should see {string} in my favorites list")
    public void iShouldSeeInMyFavoritesList(String arg0) throws InterruptedException {
        iNavigateToTheFavoritesPage();

        String id = arg0.replaceAll("[\\s\\u00A0]", "").replaceAll("[^a-zA-Z0-9_-]", "");

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        boolean songPresent = wait.until(driver -> {
            // check if the error message is present
            WebElement el = driver.findElement(By.id(id));
            return el.getText().contains(arg0);
        });

        assert songPresent;
    }
}
