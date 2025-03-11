Feature: Signup Functionality
  Scenario: Unsuccessful signup with duplicate username
    Given a user with username "existingUser" already exists
    And I am on the signup page
    When I enter the username "existingUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
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
    And I confirm the password with "Invalid1Pass"
    And I click the signup button
    Then I should see a signup error message "Passwords do not match"

  Scenario: Successful signup with valid details
    Given I am on the signup page
    When I enter the username "newUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    Then I should be registered successfully