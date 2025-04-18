package edu.usc.csci310.project;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class StepHelper {
    private static final WebDriver driver = DriverManager.getDriver();

    public static boolean InputShowsError(String xPathToInput, String expectedError) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
        wait.until(d -> driver.findElement(By.xpath(xPathToInput)).isDisplayed());
        WebElement inputField = driver.findElement(By.xpath(xPathToInput));
        String actualMessage = inputField.getAttribute("validationMessage");

        return actualMessage.equals(expectedError);
    }

    public static void clickButtonWithId(String id) {
        Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        WebElement button = wait.until(driver -> {
            WebElement b = driver.findElement(By.id(id));
            return b.isDisplayed() ? b : null;
        });

        button.click();
    }
}
