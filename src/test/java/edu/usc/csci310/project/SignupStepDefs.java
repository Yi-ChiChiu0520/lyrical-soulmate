package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.services.AuthService;

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

import static org.junit.jupiter.api.Assertions.*;

public class SignupStepDefs extends BaseStepDefs {

    public SignupStepDefs(Connection connection) {
        super(connection);
    }

    @Given("I am on the signup page")
    public void iAmOnTheSignupPage() {
        driver.get("http://localhost:8080/");

        WebElement signupButton = driver.findElement(By.id("switchSignup"));
        signupButton.click();
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
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains("Account Created!"));
        boolean successTextPresent = driver.getPageSource().contains("Account Created!");
        assertTrue(successTextPresent);
    }

    @And("I accept the terms")
    public void iAcceptTheTerms() {
        WebElement acceptButton = driver.findElement(By.xpath("//*[@id=\"root\"]/div/div/div[2]/button[1]"));
        acceptButton.click();
    }

    @And("I do not accept the terms")
    public void iDoNotAcceptTheTerms() {
        WebElement declineButton = driver.findElement(By.xpath("//*[@id=\"root\"]/div/div/div[2]/button[2]"));
        declineButton.click();
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

    @Given("I should see a signup error message {string}")
    public void iShouldSeeASignupErrorMessage(String arg0) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains(arg0));
        boolean errorTextPresent = driver.getPageSource().contains(arg0);
        assertTrue(errorTextPresent);
    }

    @When("I proceed to login")
    public void proceedToLogin() {
        WebElement loginButton = driver.findElement(By.xpath("//*[@id=\"root\"]/div/div/div[2]/button"));
        loginButton.click();
    }

    @Then("I should be on the login page")
    public void iShouldBeOnTheLoginPage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.getPageSource().contains("Don't have an account?"));
        boolean loginPagePresent = driver.getPageSource().contains("Don't have an account?");
        assertTrue(loginPagePresent);
    }

    @Then("The signup input {string} should show error message {string}")
    public void iShouldSeeAnInputErrorMessage(String input, String expectedMessage) throws InterruptedException {
        String path;
        switch (input) {
            case "password" -> path = "/html/body/div/div/div/form/div[1]/input";
            case "username" -> path = "//*[@id=\"username\"]";
            case "confirmPassword" -> path = "/html/body/div/div/div/form/div[3]/input";
            default -> {
                path = "";
                assert (false);
            }
        }
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.findElement(By.xpath(path)).isDisplayed());
        WebElement inputField = driver.findElement(By.xpath(path));
        String actualMessage = inputField.getAttribute("validationMessage");
        assertEquals(expectedMessage, actualMessage);
    }
}