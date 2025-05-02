Feature: Soulmate/Enemy Functionality

  Scenario: User1 and User2 are each others' soulmates
    Given I am signed in as "user1"
    And I have added "Rap God by Eminem" to my favorites
    And I click the "Logout" button
    And I am signed in as "user2"
    And I have added "Rap God by Eminem" to my favorites
    And I navigate to the soulmates page
    And I click the "Show Soulmate" button
    Then I should see a celebratory overlay
    And I should see "user1" as their soulmate

  Scenario: User1 and User2 are each others' enemies
    Given I am signed in as "user1"
    And I have added "Rap God by Eminem" to my favorites
    And I click the "Logout" button
    And I am signed in as "user2"
    And I have added "Lose Yourself by Eminem" to my favorites
    And I navigate to the soulmates page
    And I click the "Show Enemy" button
    Then I should see a sinister overlay
    And I should see "user1" as their enemy

  Scenario: User1's soulmate is User3, but User3's soulmate is User2
    Given I am signed in as "user1"
    And I have added "Rap God by Eminem" to my favorites
    And I click the "Logout" button
    And I am signed in as "user2"
    And I have added "Rap God by Eminem" to my favorites
    And I have added "Lose Yourself by Eminem" to my favorites
    And I click the "Logout" button
    And I am signed in as "user3"
    And I have added "Rap God by Eminem" to my favorites
    And I have added "Lose Yourself by Eminem" to my favorites
    And I click the "Logout" button
    And I login as "user1"
    And I navigate to the soulmates page
    And I click the "Show Soulmate" button
    Then I should not see a celebratory overlay
    And I should see "user2" as their soulmate

  Scenario: User1's enemy is User2, and User3's enemy is User1
    Given I am signed in as "user1"
    And I have added "Rap God by Eminem" to my favorites
    And I have added "Lose Yourself by Eminem" to my favorites
    And I click the "Logout" button
    And I am signed in as "user2"
    And I have added "One Dance by Drake" to my favorites
    And I have added "God's Plan by Drake" to my favorites
    And I click the "Logout" button
    And I am signed in as "user3"
    And I have added "Rap God by Eminem" to my favorites
    And I have added "God's Plan by Drake" to my favorites
    And I navigate to the soulmates page
    And I click the "Show Enemy" button
    Then I should not see a sinister overlay
    Then I should see "user2" as their enemy


