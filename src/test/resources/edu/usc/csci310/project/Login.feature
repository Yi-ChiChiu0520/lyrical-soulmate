Feature: Login Functionality
  Scenario: Successful login with valid credentials
    Given I am on the login page
    And a user exists with username "validUser" and password "Valid1Pass"
    When I enter "validUser" in the username field
    And I enter "Valid1Pass" in the password field
    And I click the "Login" button
    Then I should be redirected to my dashboard

  Scenario: Unsuccessful login with incorrect password
    Given I am on the login page
    And a user exists with username "validUser" and password "Valid1Pass"
    When I enter "validUser" in the username field
    And I enter "WrongPass1" in the password field
    And I click the "Login" button
    Then I should see an error message "Invalid username or password"

  Scenario: Unsuccessful login with non-existent username
    Given I am on the login page
    When I enter "nonExistentUser" in the username field
    And I enter "AnyPass1" in the password field
    And I click the "Login" button
    Then I should see an error message "Invalid username or password"

  Scenario: Logout button is not visible on login and signup pages
    Given I am on the login page
    Then I should not see a "Logout" button
    And when I navigate to the signup page
    And I should not see a "Logout" button

  Scenario: Blank username
    Given I am on the login page
    When I enter "" in the username field
    And I enter "AnyPass1" in the password field
    And I click the "Login" button
    Then The login field "username" should show required error

  Scenario: Blank password
    Given I am on the login page
    When I enter "AnyUser" in the username field
    And I enter "" in the password field
    And I click the "Login" button
    Then The login field "password" should show required error
