Feature: Signup Functionality
  # SPRINT REVIEW 2: Got points but we need the opposite case, where the cancel modal is declined
  Scenario: Cancel signup and confirming clears forms and redirects to login
    Given I am on the signup page
    When I enter the username "testUser1"
    And I enter the password "testPass1"
    And I confirm the password with "testPass1"
    And I click the cancel button
    And I confirm the cancellation
    Then I should be redirected to the login page
    And Inputs should be empty

  Scenario: Unsuccessful signup with duplicate username
    Given a user with username "existingUser" already exists
    And I am on the signup page
    When I enter the username "existingUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    Then I see error "Username already taken"

  # Validate various invalid password formats
  Scenario Outline: Unsuccessful signup due to invalid password format
    Given I am on the signup page
    When I enter the username "<username>"
    And I enter the password "<password>"
    And I confirm the password with "<password>"
    And I click the signup button
    Then I see error "Password must contain at least one uppercase letter, one lowercase letter, and one number."

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
    Then I see error "Passwords do not match"

  Scenario: Successful signup then redirect to login
    Given I am on the signup page
    When I enter the username "newUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    And I confirm signup
    Then I should be registered successfully
    And I should be redirected to the login page

  # SPRINT REVIEW 2: Not needed + no points
  Scenario: Valid signup but decline confirm redirects to login
    Given I am on the signup page
    When I enter the username "newUser1"
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    And I do not confirm signup
    Then I should not be registered
    And I should be redirected to the login page

  Scenario: Blank username
    Given I am on the signup page
    When I enter the username ""
    And I enter the password "Valid1Pass"
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    Then Input "username" shows error "Please fill out this field."

  Scenario: Blank password
    Given I am on the signup page
    When I enter the username "existingUser"
    And I enter the password ""
    And I confirm the password with "Valid1Pass"
    And I click the signup button
    Then I see error "Passwords do not match"

  Scenario: Blank confirm password
    Given I am on the signup page
    When I enter the username "existingUser"
    And I enter the password "Valid1Pass"
    And I confirm the password with ""
    And I click the signup button
    Then Input "confirmPassword" shows error "Please fill out this field."
