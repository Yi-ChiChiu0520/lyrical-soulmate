package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.services.AuthService;

import io.cucumber.java.AfterAll;
import io.cucumber.java.Before;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.sql.Connection;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class SignupStepDefs {

    private final WebDriver driver;
    private final Connection connection;

    public SignupStepDefs(Connection connection) {
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

    @Given("I am on the signup page")
    public void iAmOnTheSignupPage() {
        driver.get("https://localhost:8080/");

        WebElement signupButton = driver.findElement(By.id("switchSignup"));
        signupButton.click();

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains("Sign Up"));
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
        DriverManager.createUserWithUsername(connection, arg0);
    }

    @Then("I should be registered successfully")
    public void iShouldBeRegisteredSuccessfully() {
        // "User registered successfully" message should be in the page
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains("Signup successful!"));
        boolean successTextPresent = driver.getPageSource().contains("Signup successful!");
        assertTrue(successTextPresent);
    }

    @And("I confirm signup")
    public void iConfirmSignup() throws InterruptedException {
        Thread.sleep(1000);
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        WebElement confirmSignup = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("#confirmSignup")));
        confirmSignup.click();
        Thread.sleep(5000);
    }

    @And("I do not confirm signup")
    public void iDoNotConfirmSignup() throws InterruptedException {
        Thread.sleep(1000);
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        WebElement cancelSignup = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("#cancelSignup")));
        cancelSignup.click();
    }

    @Then("I should not be registered")
    public void iShouldNotBeRegistered() {
        boolean successTextPresent = driver.getPageSource().contains("Account Created!");
        assertFalse(successTextPresent);
    }

    @And("I click the signup button")
    public void iClickTheSignupButton() {
        // clear db first
        WebElement signupButton = driver.findElement(By.id("signupButton"));
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> signupButton.isDisplayed());
        signupButton.click();
    }

    @Given("I see error {string}")
    public void iShouldSeeASignupErrorMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains(arg0));
        boolean errorTextPresent = driver.getPageSource().contains(arg0);
        assertTrue(errorTextPresent);
    }

    @Then("I see a password requirement error")
    public void i_see_password_requirement_error() {
        String expectedError = "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until( d-> driver.findElement(By.id("errorMessage")));
        WebElement errorElement = driver.findElement(By.id("errorMessage")); // adjust selector as needed
        String actualError = errorElement.getText();
        assertEquals(expectedError, actualError);
    }


    @Then("I should be on the login page")
    public void iShouldBeOnTheLoginPage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains("Don't have an account?"));
        boolean loginPagePresent = driver.getPageSource().contains("Don't have an account?");
        assertTrue(loginPagePresent);
    }

    @Then("Input {string} shows error {string}")
    public void iShouldSeeAnInputErrorMessage(String input, String expectedMessage) throws InterruptedException {
        String path;
        switch (input) {
            case "password" -> path = "//*[@id=\"password\"]";
            case "username" -> path = "//*[@id=\"username\"]";
            case "confirmPassword" -> path = "//*[@id=\"confirmPassword\"]";
            default -> {
                path = "";
                assert (false);
            }
        }
        assertNotNull(path);
        assert(StepHelper.InputShowsError(path, expectedMessage));
    }

    @And("I click the cancel button")
    public void iClickTheCancelButton() {
        WebElement cancelButton = driver.findElement(By.id("cancelButton"));
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> cancelButton.isDisplayed());
        cancelButton.click();

        Wait<WebDriver> wait2 = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains("Are you sure you want to cancel account creation?"));

    }

    @And("I confirm the cancellation")
    public void iConfirmTheCancellation() throws InterruptedException {
        Thread.sleep(1000);
        WebElement confirmCancel = driver.findElement(By.id("confirmCancel"));
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> confirmCancel.isDisplayed());
        confirmCancel.click();
    }

    @Then("I should be redirected to the login page")
    public void iShouldBeRedirectedToTheLoginPage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(4));
        WebElement loginButton = wait.until(driver -> {
            WebElement el = driver.findElement(By.id("loginButton"));

            return el.isDisplayed() ? el : null;
        });
        String url = driver.getCurrentUrl();
        assertEquals("https://localhost:8080/", url);
        assertTrue(loginButton.isDisplayed());

    }

    @And("Inputs should be empty")
    public void inputsShouldBeEmpty() {
        List<WebElement> inputs = driver.findElements(By.tagName("input"));
        for (WebElement input : inputs) {

            assertTrue(input.getText().isEmpty());
        }

    }
}