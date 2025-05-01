Feature: Song Comparison
  Scenario: Compare songs with multiple users
    Given I am authenticated as "user1"
    And I navigate to the compare page
    And I have added "Polly by Nirvana" to my favorites
    And I have added "God's Plan by Drake" to my favorites
    And I have added "Help by The Beatles" to my favorites
    And "user2" has added "Polly by Nirvana" to their favorites
    And "user2" has added "God's Plan by Drake" to their favorites
    And "user3" has added "Polly by Nirvana" to their favorites
    When I navigate to the comparison page
    And I select "user2" and "user3" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see "Polly by Nirvana" ranked the #1
    And I should see "God's Plan by Drake" ranked #2
    And I should see "Help by The Beatles" ranked #3

  Scenario: Compare with a user having no common songs
    Given I am authenticated as "user1"
    And I navigate to the compare page
    And "user4" has added "Need 2 by Pinegrove" to their favorites
    When I navigate to the comparison page
    And I select "user4" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see both user's favorite lists

  Scenario: Compare with a user having an empty favorites list
    Given I am authenticated as "user1"
    And I navigate to the compare page
    And "user5" has no favorites
    When I navigate to the comparison page
    And I select "user5" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see my favorites list

  Scenario: Compare with empty favorites list with other user who has favorites
    Given I am authenticated as "user1"
    And "user1" has no favorites
    And "user6" has added "Eventually by Tame Impala" to their favorites
    When I navigate to the comparison page
    And I select "user6" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see "user6" 's favorite list

  Scenario: Searching for users displays suggestions
    Given I am authenticated as "user1"
    And "user2" exists in the system
    And "user3" exists in the system
    When I navigate to the comparison page
    And I enter "user" in the comparison search field
    Then I should see suggestions containing "user2"
    And I should see suggestions containing "user3"

  Scenario: Hovering over comparison shows users
    Given I am authenticated as "user1"
    And I select "user2" and "user3" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    And I hover over "Polly by Nirvana"
    Then I should see "user1", "user2", and "user3"

  Scenario: Hovering over comparison shows users
    Given I am authenticated as "user1"
    And I select "user2" and "user3" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    And I click "Polly by Nirvana"
    Then I should see "user1", "user2", and "user3"

  Scenario: Comparing with private user
    Given I am authenticated as "user1"
    And "user7" is private
    And I select "user7" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see a comparison error message

  Scenario: Comparison page view details
    Given I am authenticated as "user1"
    And I navigate to the comparison page
    And I click on a song in the comparison results
    Then I should see the song details including:
      | Song name          |
      | Artist name        |
      | Release date       |
      | Comparison results |

 Scenario: Comparison reverse order
    Given I am authenticated as "user1"
    And I navigate to the compare page
    And I have added "Polly by Nirvana" to my favorites
    And I have added "God's Plan by Drake" to my favorites
    And I have added "Help by The Beatles" to my favorites
    And "user2" has added "Polly by Nirvana" to their favorites
    And "user2" has added "God's Plan by Drake" to their favorites
    And "user3" has added "Polly by Nirvana" to their favorites
    When I navigate to the comparison page
    And I select "user2" and "user3" to compare with
    And I click "Add to Compare List"
    And I click "Compare Now"
    And I click "Least to Most"
    Then I should see "Polly by Nirvana" ranked the #3
    And I should see "God's Plan by Drake" ranked #2
    And I should see "Help by The Beatles" ranked #1