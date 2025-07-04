Feature: Login and Security Functionality

  Scenario: localhost:8080 is the login page
    When I navigate to "https://localhost:8080"
    Then I should be redirected to the login page

  Scenario: A user that isn't logged in can't go to any other page
    Given I am on the login page
    And I am not authenticated
    When I navigate to the dashboard page
    Then I should be redirected to the login page
    When I try to navigate to the favorites page
    Then I should be redirected to the login page
    When I navigate to the soulmates page
    Then I should be redirected to the login page
    When I try to navigate to the comparison page
    Then I should be redirected to the login page

  Scenario: A user can switch to the signup page
    Given I am on the login page
    And I am not authenticated
    When I click the switch to signup button
    Then I should be redirected to the signup page

  Scenario: Logout correctly revokes user access and redirects to login
    Given I am authenticated
    And I navigate to the dashboard page
    When I click the "Logout" button
    Then I should be redirected to the login page
    And My access to the app is restricted

  Scenario: Restricted access for non-authenticated users
    Given I am on the login page
    And I am not authenticated
    When I navigate to the dashboard page
    Then I should be redirected to the login page

  Scenario: Lockout ends after 30 seconds
    Given I am on the login page
    And I am not authenticated
    And a user exists with username "validUser" and password "Valid1Pass"
    When I enter "validUser" in the username field
    And I enter "wrong1Pass" in the password field
    And I click the login button 3 times within a minute
    And I wait 30 seconds
    And I clear the forms
    And I enter "validUser" in the username field
    And I enter "Valid1Pass" in the password field
    And I click the "Login" button
    Then I should be redirected to my dashboard

  Scenario: 3 failed login attempts within one minute causes lockout
    Given I am on the login page
    And I am not authenticated
    And a user exists with username "validUser1" and password "Valid1Pass"
    When I enter "validUser1" in the username field
    And I enter "wrong1Pass" in the password field
    And I click the login button 3 times within a minute
    Then I see error "Account temporarily locked. Please try again shortly."

  Scenario: No lockout if 3 failed logins span over 1 min
    Given I am on the login page
    And I am not authenticated
    And a user exists with username "validUser" and password "Valid1Pass"
    When I enter "validUser" in the username field
    And I enter "wrong1Pass" in the password field
    And I click the login button 3 times within more than a minute
    And I clear the forms
    And I enter "validUser" in the username field
    And I enter "Valid1Pass" in the password field
    And I click the "Login" button
    Then I should be redirected to my dashboard

  # Scenarios below are not needed (from sprint 1)
  Scenario: Successful login with valid credentials
    Given I am on the login page
    And I am not authenticated
    And a user exists with username "validUser" and password "Valid1Pass"
    When I enter "validUser" in the username field
    And I enter "Valid1Pass" in the password field
    And I click the "Login" button
    Then I should be redirected to my dashboard

  Scenario: Unsuccessful login with incorrect password
    Given I am on the login page
    And I am not authenticated
    And a user exists with username "validUser" and password "Valid1Pass"
    When I enter "validUser" in the username field
    And I enter "WrongPass1" in the password field
    And I click the "Login" button
    Then I should see an error message "Invalid username or password"

  Scenario: Unsuccessful login with non-existent username
    Given I am on the login page
    And I am not authenticated
    When I enter "nonExistentUser" in the username field
    And I enter "AnyPass1" in the password field
    And I click the "Login" button
    Then I should see an error message "Invalid username or password"

  Scenario: Logout button is not visible on login and signup pages
    Given I am on the login page
    And I am not authenticated
    Then I should not see a "Logout" button
    And when I navigate to the signup page
    And I should not see a "Logout" button

  Scenario: Blank username
    Given I am on the login page
    And I am not authenticated
    When I enter "" in the username field
    And I enter "AnyPass1" in the password field
    And I click the "Login" button
    Then The input "username" shows error "Please fill out this field."

  Scenario: Blank password
    Given I am on the login page
    And I am not authenticated
    When I enter "AnyUser" in the username field
    And I enter "" in the password field
    And I click the "Login" button
    Then The input "password" shows error "Please fill out this field."
