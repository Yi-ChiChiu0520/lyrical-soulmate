Feature: Word Cloud Functionality

  Scenario: Add a song to Word Cloud
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud

  Scenario: Add two songs to Word Cloud
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Lose Yourself by Eminem" into the Word Cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then "Lose Yourself" should be visible inside the Word Cloud
    And "Rap God" should be visible inside the Word Cloud

  Scenario: Add two songs then remove one from Word Cloud
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Lose Yourself by Eminem" into the Word Cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I remove "Rap God by Eminem" from the Word Cloud
    Then "Rap God" should be not visible inside the Word Cloud
    And "Lose Yourself" should be visible inside the Word Cloud

  Scenario: Add one song then delete that song
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I remove "Rap God by Eminem" from the Word Cloud
    Then The word cloud should be not visible

  Scenario: Add favorites into word cloud
    Given I am authenticated
    When The Word Cloud is empty
    And My favorites list is empty
    And I have added "Rap God by Eminem" to my favorites
    And I have added "In My Feelings by Drake" to my favorites
    And I click the "Add All Favorites to Word Cloud" button
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud
    And "In My Feelings" should be visible inside the Word Cloud

  Scenario: Add favorites then remove favorites
    Given I am authenticated
    When The Word Cloud is empty
    And My favorites list is empty
    And I have added "God's Plan by Drake" to my favorites
    And I have added "In My Feelings by Drake" to my favorites
    And I click the "Add All Favorites to Word Cloud" button
    And I navigate to the favorites page
    And I hover over "God's Plan by Drake"
    And I click the move up button on "God's Plan by Drake"
    And I hover over "In My Feelings by Drake"
    And I click the move up button on "In My Feelings by Drake"
    And I navigate to the dashboard page
    Then "God's Plan" should be not visible inside the Word Cloud
    And "In My Feelings" should be not visible inside the Word Cloud

  Scenario: Click on word cloud word and shows songs that its from
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "Rap" in word cloud
    Then it should show "Rap God by Eminem"

  Scenario: Click on word cloud word and shows two songs that its from
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Rap God by Eminem" into the Word Cloud
    And I add "Lose Yourself by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    Then it should show "Rap God by Eminem"
    And it should show "Lose Yourself by Eminem"

  Scenario: Switch to tabular view
    Given I am authenticated
    When The Word Cloud is empty
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click the switch to tabular view button
    Then it should show the tabular view