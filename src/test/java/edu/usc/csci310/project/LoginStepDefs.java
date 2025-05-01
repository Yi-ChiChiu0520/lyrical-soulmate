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

import static org.junit.jupiter.api.Assertions.*;

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
        driver.get("https://localhost:8080");

        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(driver -> {
            WebElement el = driver.findElement(By.id("loginButton"));
            return el.isDisplayed() ? el : null;
        });
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
        assertEquals("https://localhost:8080/dashboard", currentUrl);
    }

    @Then("The input {string} shows error {string}")
    public void iShouldSeeAnInputErrorMessage(String input, String expectedMessage) {
        String path;
        switch (input) {
            case "password" -> path = "//*[@id=\"password\"]";
            case "username" -> path = "//*[@id=\"username\"]";
            default -> path = null;
        }

        assertNotNull(path);
        assert(StepHelper.InputShowsError(path, expectedMessage));
    }

    public void logout() {
        driver.manage().deleteAllCookies();
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("window.localStorage.clear();");
    }

    @When("I am not authenticated")
    public void iAmNotAuthenticated() {
        logout();
    }

    @When("I am logged out")
    public void iAmLoggedOut() {
        logout();
    }

    @Given("I navigate to the dashboard page")
    public void iNavigateToTheDashboardPage() throws InterruptedException {
        driver.get("https://localhost:8080/dashboard");
        Thread.sleep(1000);
    }

    @And("I wait {int} seconds")
    public void iWaitSeconds(int arg0) throws InterruptedException {
        Thread.sleep(arg0 * 1000);
    }

    @And("I click the login button {int} times within a minute")
    public void iClickTheLoginButtonTimesWithinAMinute(int arg1) throws InterruptedException {
        for (int i = 0; i <= arg1; i++) {
            driver.findElement(By.id("loginButton")).click();
            Thread.sleep(1000);
        }
    }

    @And("I click the login button {int} times within more than a minute")
    public void iClickTheLoginButtonTimesWithinMoreThanAMinute(int arg1) throws InterruptedException {
        for (int i = 0; i <= arg1; i++) {
            driver.findElement(By.id("loginButton")).click();
            Thread.sleep(21000);
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

    @When("I log out and log back in")
    public void logoutAndIn() {
        logout();
        DriverManager.signInAsTester(connection);
    }

    @And("My access to the app is restricted")
    public void myAccessToTheAppIsRestricted() {
        JavascriptExecutor js = (JavascriptExecutor) driver;
        String user = (String) js.executeScript("return window.localStorage.getItem('user');");
        assertNull(user);
    }

    @When("I navigate to {string}")
    public void iNavigateTo(String arg0) {
        driver.get(arg0);
    }

    @Then("I should be redirected to the signup page")
    public void iShouldBeRedirectedToTheSignupPage() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(4));
        WebElement loginButton = wait.until(driver -> {
            WebElement el = driver.findElement(By.id("signupButton"));

            return el.isDisplayed() ? el : null;
        });
        String url = driver.getCurrentUrl();
        assertEquals("https://localhost:8080/", url);
        assertTrue(loginButton.isDisplayed());
    }

    @When("I click the switch to signup button")
    public void iClickTheSwitchToSignupButton() {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        WebElement signupButton = wait.until(driver -> driver.findElement(By.id("switchSignup")));
        signupButton.click();
    }
}