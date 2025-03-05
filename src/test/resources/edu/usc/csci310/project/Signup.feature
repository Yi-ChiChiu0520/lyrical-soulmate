Feature: Signup Functionality
  Scenario: Successful signup with valid details
    Given I am on the signup page
    When I enter a unique username "newUser"
    And I enter a password "Valid1Pass" that contains at least one uppercase letter, one lowercase letter, and one number
    And I confirm the password with "Valid1Pass"
    And I click the "Signup" button
    Then I should be registered successfully
    And I should be redirected to the welcome page

  Scenario: Unsuccessful signup with duplicate username
    Given a user with username "existingUser" already exists
    And I am on the signup page
    When I enter "existingUser" in the username field
    And I enter a password "Valid1Pass" that meets the requirements
    And I confirm the password with "Valid1Pass"
    And I click the "Signup" button
    Then I should see an error message "Username already exists"

  # Validate various invalid password formats
  Scenario Outline: Unsuccessful signup due to invalid password format
    Given I am on the signup page
    When I enter a unique username "<username>"
    And I enter a password "<password>" in the password field
    And I confirm the password with "<password>" in the confirm password field
    And I click the "Signup" button
    Then I should see an error message "<error_message>"

    Examples:
      | username    | password    | error_message                                                                              |
      | testUser1   | abcdef1     | "Password must contain at least one uppercase letter"                                      |
      | testUser2   | ABCDEF1     | "Password must contain at least one lowercase letter"                                      |
      | testUser3   | Abcdefgh    | "Password must contain at least one number"                                                  |

  # Validate mismatch between password and confirmation
  Scenario: Unsuccessful signup due to mismatched passwords
    Given I am on the signup page
    When I enter a unique username "mismatchUser"
    And I enter a password "Valid1Pass" in the password field
    And I enter a different password "Invalid1Pass" in the confirm password field
    And I click the "Signup" button
    Then I should see an error message "Passwords do not match"