Feature: Signup Functionality
  Scenario: Unsuccessful signup with duplicate username
    Given a user with username "existingUser" already exists
    And I am on the signup page
    When I enter the username "existingUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    And I accept the terms
    Then I should see a signup error message "Username already taken"

  # Validate various invalid password formats
  Scenario Outline: Unsuccessful signup due to invalid password format
    Given I am on the signup page
    When I enter the username "<username>"
    And I enter the password "<password>"
    And I confirm the password with "<password>"
    And I click the signup button
    Then I should see a signup error message "Password must contain at least one uppercase letter, one lowercase letter, and one number."

    Examples:
      | username  | password |  |
      | testUser1 | abcdef1  |  |
      | testUser2 | ABCDEF1  |  |
      | testUser3 | Abcdefgh |  |

  # Validate mismatch between password and confirmation
  Scenario: Unsuccessful signup due to mismatched passwords
    Given I am on the signup page
    When I enter the username "mismatchUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "DiffPass"
    Then I should see a signup error message "Passwords do not match"

  Scenario: Successful signup then stay on signup
    Given I am on the signup page
    When I enter the username "newUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    And I accept the terms
    Then I should be registered successfully
    When I proceed to login
    Then I should be on the login page

  Scenario: Valid signup but decline terms
    Given I am on the signup page
    When I enter the username "newUser1"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    And I do not accept the terms
    Then I should not be registered


  Scenario: Blank username
    Given I am on the signup page
    When I enter the username ""
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    Then The signup input "username" should show error message "Please fill out this field."

  Scenario: Blank password
    Given I am on the signup page
    When I enter the username "existingUser"
    And I enter the password ""
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    Then I should see a signup error message "Passwords do not match"

  Scenario: Blank confirm password
    Given I am on the signup page
    When I enter the username "existingUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with ""
    And I click the signup button
    Then The signup input "confirmPassword" should show error message "Please fill out this field."