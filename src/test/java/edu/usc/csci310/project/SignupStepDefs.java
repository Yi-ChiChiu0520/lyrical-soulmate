package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.services.AuthService;
import io.cucumber.java.Before;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class SignupStepDefs {
    private static WebDriver driver = new ChromeDriver();

    private final Connection connection;

    public SignupStepDefs(Connection connection) { this.connection = connection;}

    @Before
    public void resetUserDatabase() {
        try (Statement stmt = connection.createStatement()) {

            String deleteTableSQL = "DROP TABLE IF EXISTS users";
            stmt.executeUpdate(deleteTableSQL);

            String createTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL)";
            stmt.executeUpdate(createTableSQL);
        } catch (SQLException e) {
            throw new RuntimeException("Error clearing the database before scenario", e);
        }
    }

    @AfterAll
    public static void closeDriver() {
        driver.quit();
    }

    @Given("I am on the signup page")
    public void iAmOnTheSignupPage() {
        driver.get("http://localhost:8080/");
    }

    @Given("I enter the username {string}")
    public void iEnterUniqueUsername(String arg0) {
        WebElement usernameField = driver.findElement(By.cssSelector("input[placeholder='Username']"));
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> usernameField.isDisplayed());

        usernameField.sendKeys(arg0);
    }

    @Given("I enter the password {string}")
    public void iEnterValidPassword(String arg0) {
        WebElement passwordField = driver.findElement(By.cssSelector("input[placeholder='Password']"));
        passwordField.sendKeys(arg0);
    }

    @Given("I confirm the password with {string}")
    public void iConfirmPasswordWith(String arg0) {
        WebElement confirmPasswordField = driver.findElement(By.cssSelector("input[placeholder='Confirm Password']"));
        confirmPasswordField.sendKeys(arg0);
    }

    @Given("a user with username {string} already exists")
    public void aUserWithUsernameAlreadyExists(String arg0) {
        UserRepository userRepository = new UserRepository(connection);
        AuthService authService = new AuthService(userRepository);
        authService.registerUser(arg0, "Valid1Pass");
    }

    @Then("I should be registered successfully")
    public void iShouldBeRegisteredSuccessfully() {
        // "User registered successfully" message should be in the page
        WebElement successMessage = driver.findElement(By.xpath("//*[@id=\"root\"]/div/form/p"));
        assert(successMessage.isDisplayed());
    }

    @And("I click the signup button")
    public void iClickTheSignupButton() {
        // clear db first
        resetUserDatabase();
        WebElement signupButton = driver.findElement(By.id("signupButton"));
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> signupButton.isDisplayed());
        signupButton.click();
    }

    @Given("I should see a signup error message {string}")
    public void iShouldSeeASignupErrorMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains(arg0));
        boolean errorTextPresent = driver.getPageSource().contains(arg0);
        assertTrue(errorTextPresent);
    }
}
