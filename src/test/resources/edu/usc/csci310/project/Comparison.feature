Feature: User Comparison

  Scenario: Compare songs with multiple users
    Given I am authenticated as "user1"
    And for comparison, I have added "Polly by Nirvana" to my favorites
    And for comparison, I have added "God's Plan by Drake" to my favorites
    And for comparison, I have added "Help by The Beatles" to my favorites
    And "user2" has added "Polly by Nirvana" to their favorites
    And "user2" has added "God's Plan by Drake" to their favorites
    And "user3" has added "Polly by Nirvana" to their favorites
    And I navigate to the compare page
    Then I search for "user2"
    And I click "Add to Compare List"
    Then I search for "user3"
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see "Polly by Nirvana" ranked #1
    And I should see "God's Plan by Drake" ranked #2
    And I should see "Help by The Beatles" ranked #3

  Scenario: Compare with a user having no common songs
    Given I am authenticated as "user1"
    And for comparison, I have added "Polly by Nirvana" to my favorites
    And for comparison, I have added "God's Plan by Drake" to my favorites
    And for comparison, I have added "Help by The Beatles" to my favorites
    And "user4" has added "Need 2 by Pinegrove" to their favorites
    And I navigate to the compare page
    Then I search for "user4"
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see both user's favorite lists

  Scenario: Compare with empty favorites list with other user who has favorites
    Given I am authenticated as "user1"
    And "user1" has no favorites
    And "user6" has added "Eventually by Tame Impala" to their favorites
    And I navigate to the compare page
    Then I search for "user6"
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

  Scenario: Hovering over song shows mutual users
    Given I am authenticated as "user1"
    And for comparison, I have added "Polly by Nirvana" to my favorites
    And for comparison, I have added "God's Plan by Drake" to my favorites
    And for comparison, I have added "Help by The Beatles" to my favorites
    And "user2" has added "Polly by Nirvana" to their favorites
    And "user2" has added "God's Plan by Drake" to their favorites
    And "user3" has added "Polly by Nirvana" to their favorites
    And I navigate to the compare page
    Then I search for "user2"
    And I click "Add to Compare List"
    Then I search for "user3"
    And I click "Add to Compare List"
    And I click "Compare Now"
    And I hover over "Polly by Nirvana" on compare page
    Then I should see "user1", "user2", and "user3"

  Scenario: Clicking song shows mutual users
    Given I am authenticated as "user1"
    And for comparison, I have added "Polly by Nirvana" to my favorites
    And for comparison, I have added "God's Plan by Drake" to my favorites
    And for comparison, I have added "Help by The Beatles" to my favorites
    And "user2" has added "Polly by Nirvana" to their favorites
    And "user2" has added "God's Plan by Drake" to their favorites
    And "user3" has added "Polly by Nirvana" to their favorites
    And I navigate to the compare page
    Then I search for "user2"
    And I click "Add to Compare List"
    Then I search for "user3"
    And I click "Add to Compare List"
    And I click "Compare Now"
    And I click song "Polly by Nirvana"
    Then In the details, I should see "user1", "user2", and "user3"

  Scenario: Comparing with private user
    Given I am authenticated as "user1"
    And "user7" is private
    And I navigate to the compare page
    Then I search for "user7"
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see a privacy error message

  Scenario: Comparing with non-existent user
    Given I am authenticated as "user1"
    And "user8" doesn't exist
    And I navigate to the compare page
    Then I search for non-existent "user8"
    And I click "Add to Compare List"
    And I click "Compare Now"
    Then I should see a doesn't exist error message

  Scenario: Comparison page view details
    Given I am authenticated as "user1"
    And for comparison, I have added "Polly by Nirvana" to my favorites
    And for comparison, I have added "God's Plan by Drake" to my favorites
    And for comparison, I have added "Help by The Beatles" to my favorites
    And "user2" has added "Polly by Nirvana" to their favorites
    And "user2" has added "God's Plan by Drake" to their favorites
    And "user3" has added "Polly by Nirvana" to their favorites
    And I navigate to the compare page
    Then I search for "user2"
    And I click "Add to Compare List"
    Then I search for "user3"
    And I click "Add to Compare List"
    And I click "Compare Now"
    And I click song "Polly by Nirvana"
    Then I should see comparison song details including:
      | Song name          |
      | Artist name        |
      | Release date       |
      | Comparison results |

 Scenario: Comparison reverse order
   Given I am authenticated as "user1"
   And for comparison, I have added "Polly by Nirvana" to my favorites
   And for comparison, I have added "God's Plan by Drake" to my favorites
   And for comparison, I have added "Help by The Beatles" to my favorites
   And "user2" has added "Polly by Nirvana" to their favorites
   And "user2" has added "God's Plan by Drake" to their favorites
   And "user3" has added "Polly by Nirvana" to their favorites
   And I navigate to the compare page
   Then I search for "user2"
   And I click "Add to Compare List"
   Then I search for "user3"
   And I click "Add to Compare List"
   And I click "Compare Now"
   And I click "Least to Most"
   Then I should see "Polly by Nirvana" ranked #3
   And I should see "God's Plan by Drake" ranked #2
   And I should see "Help by The Beatles" ranked #1