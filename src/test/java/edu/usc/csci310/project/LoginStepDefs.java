package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.services.AuthService;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class LoginStepDefs {

    private final WebDriver driver;
    private final Connection connection;

    public LoginStepDefs(Connection connection) {
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

    @Given("I am on the login page")
    public void iAmOnTheLoginPage() {
        driver.get("http://localhost:8080");

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        WebElement loginButton = driver.findElement(By.id("loginButton"));
        wait.until(d -> loginButton.isDisplayed());
    }

    @And("a user exists with username {string} and password {string}")
    public void aUserExistsWithUsernameAndPassword(String username, String password) {
        UserRepository userRepository = new UserRepository(connection);
        AuthService authService = new AuthService(userRepository);
        authService.registerUser(username, password);
    }

    @When("I enter {string} in the username field")
    public void iEnterInTheUsernameField(String arg0) {
        WebElement usernameField = driver.findElement(By.cssSelector("input[placeholder='Username']"));
        usernameField.sendKeys(arg0);
    }

    @And("I enter {string} in the password field")
    public void iEnterInThePasswordField(String arg0) {
        WebElement passwordField = driver.findElement(By.cssSelector("input[placeholder='Password']"));
        passwordField.sendKeys(arg0);
    }

    @And("I click the {string} button")
    public void iClickTheButton(String arg0) throws InterruptedException {
        WebElement button = driver.findElement(By.xpath("//button[text()='" + arg0 + "']"));
        button.click();
        Thread.sleep(1000);
    }

    @Then("I should see an error message {string}")
    public void iShouldSeeAnErrorMessage(String arg0) {
        // wait 2 seconds
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> d.getPageSource().contains(arg0));
        boolean errorTextPresent = driver.getPageSource().contains(arg0);
        assertTrue(errorTextPresent);
    }

    @Then("I should not see a {string} button")
    public void iShouldNotSeeAButton(String arg0) {
        List<WebElement> buttons = driver.findElements(By.xpath("//button[text()='" + arg0 + "']"));
        assertTrue(buttons.isEmpty());
    }

    @And("when I navigate to the signup page")
    public void whenINavigateToTheSignupPage() {
        WebElement switchSignup = driver.findElement(By.id("switchSignup"));
        switchSignup.click();

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        WebElement signupButton = driver.findElement(By.id("signupButton"));

        wait.until(d -> signupButton.isDisplayed());
    }

    @Then("I should be redirected to my dashboard")
    public void iShouldBeRedirectedToMyDashboard() throws InterruptedException {
        Thread.sleep(1000);
        String currentUrl = driver.getCurrentUrl();
        assertEquals("http://localhost:8080/dashboard", currentUrl);
    }

    @Then("The input {string} shows error {string}")
    public void iShouldSeeAnInputErrorMessage(String input, String expectedMessage) {
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
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.findElement(By.xpath(path)).isDisplayed());
        WebElement inputField = driver.findElement(By.xpath(path));
        String actualMessage = inputField.getAttribute("validationMessage");
        assertEquals(expectedMessage, actualMessage);
    }

    @When("I am not authenticated")
    public void iAmNotAuthenticated() {
        driver.manage().deleteAllCookies();
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("window.localStorage.clear();");
    }

    @Given("I navigate to the dashboard page")
    public void iNavigateToTheDashboardPage() throws InterruptedException {
        driver.get("http://localhost:8080/dashboard");
        Thread.sleep(1000);
    }

    @And("I wait {int} seconds")
    public void iWaitSeconds(int arg0) throws InterruptedException {
        Thread.sleep(arg0 * 1000);
    }

    @And("I click the {string} button {int} times with {int} seconds between")
    public void iClickTheButtonTimesWithSecondBetween(String arg0, int arg1, int arg2) throws InterruptedException {
        for (int i = 0; i <= arg1; i++) {
            driver.findElement(By.id("loginButton")).click();
            Thread.sleep(arg2 * 1000);
        }
    }

    @And("I clear the forms")
    public void iClearTheForms() {
        List<WebElement> inputs = driver.findElements(By.tagName("input"));
        for (WebElement input : inputs) {
            while(!input.getAttribute("value").equals("")){
                input.sendKeys(Keys.BACK_SPACE);
            }
        }
    }

    @Given("I am authenticated")
    public void iAmAuthenticated() {
        DriverManager.signInAsTester(connection);
    }
}
