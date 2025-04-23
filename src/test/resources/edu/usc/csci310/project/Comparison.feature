Feature: Song Comparison

  Scenario: User tries to access comparison page without being logged in
    Given I am on the login page
    And I am not authenticated
    And I try to navigate to the friends comparison page
    Then I should be redirected to the login page

  Scenario: Compare songs with another user
    Given I am authenticated as "user1"
    And for comparison, I have added "Song A by Artist X" to my favorites
    And "user2" has added "Song A by Artist X" to their favorites
    When I navigate to the comparison page
    And I select "user2" to compare with
    Then I should see "Song A by Artist X" in the comparison results

  Scenario: Compare with multiple users having common and unique songs
    Given I am authenticated as "user1"
    And for comparison, I have added "Song A by Artist X" to my favorites
    And for comparison, I have added "Song B by Artist Y" to my favorites
    And for comparison, I have added "Song C by Artist Z" to my favorites
    And "user2" has added "Song A by Artist X" to their favorites
    And "user2" has added "Song B by Artist Y" to their favorites
    And "user3" has added "Song A by Artist X" to their favorites
    When I navigate to the comparison page
    And I select "user2" to compare with
    And I select "user3" to compare with
    Then I should see 2 users have "Song A by Artist X" in the comparison results
    And I should see 1 user has "Song B by Artist Y" in the comparison results

  Scenario: Compare with a user having no common songs
    Given I am authenticated as "user1"
    And for comparison, I have added "Song A by Artist X" to my favorites
    And "user4" has added "Song D by Artist W" to their favorites
    When I navigate to the comparison page
    And I select "user4" to compare with
    Then I should see no common songs in the comparison results

  Scenario: Compare with a user having an empty favorites list
    Given I am authenticated as "user1"
    And for comparison, I have added "Song A by Artist X" to my favorites
    And "user5" has no favorites
    When I navigate to the comparison page
    And I select "user5" to compare with
    Then I should see no common songs in the comparison results

  Scenario: Compare with empty favorites list with other user who has favorites
    Given I am authenticated as "user1"
    And "user1" has no favorites
    And "user6" has added "Song E by Artist V" to their favorites
    When I navigate to the comparison page
    And I select "user6" to compare with
    Then I should see no common songs in the comparison results

  Scenario: Searching for users displays suggestions
    Given I am authenticated as "user1"
    And "user2" exists in the system
    And "user3" exists in the system
    When I navigate to the comparison page
    And I enter "user" in the comparison search field
    Then I should see suggestions containing "user2"
    And I should see suggestions containing "user3"