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
        driver.get("http://localhost:8080/");

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
        driver.get("http://localhost:8080/match");
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
        driver.get("http://localhost:8080/");

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
        WebDriver driver = DriverManager.getDriver();

        // Wait a short time to confirm absence (not visibility)
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(3));
        boolean overlayAbsent = wait.until(d -> {
            List<WebElement> elements = d.findElements(By.cssSelector("[data-testid='celebration-overlay']"));
            return elements.isEmpty() || elements.stream().noneMatch(WebElement::isDisplayed);
        });

        assertTrue(overlayAbsent, "Celebratory overlay should not be visible");
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
}

