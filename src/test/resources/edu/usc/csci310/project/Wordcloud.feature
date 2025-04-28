Feature: Word Cloud Functionality

  Scenario: Add a song to Word Cloud
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud

  Scenario: Add two songs to Word Cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I search for "10" songs by "Eminem"
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    Then "Lose Yourself" should be visible inside the Word Cloud
    And "Rap God" should be visible inside the Word Cloud

  Scenario: Add two songs then remove one from Word Cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I search for "10" songs by "Eminem"
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    And I remove "Rap God by Eminem" from the Word Cloud
    Then "Rap God" should be not visible inside the Word Cloud
    And "Lose Yourself" should be visible inside the Word Cloud

  Scenario: Add one song then delete that song
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I remove "Rap God by Eminem" from the Word Cloud
    Then The word cloud should be not visible

  Scenario: Add favorites into word cloud
    Given I am authenticated
    And My favorites list is empty
    And I favorited "Rap God by Eminem"
    And I favorited "In My Feelings by Drake"
    And I click the "Add All Favorites to Word Cloud" button
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud
    And "In My Feelings" should be visible inside the Word Cloud

  Scenario: Add favorites then remove favorites
    Given I am authenticated
    And My favorites list is empty
    And I favorited "God's Plan by Drake"
    And I favorited "In My Feelings by Drake"
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
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "Rap" in word cloud
    Then it should show "Rap God by Eminem"

  Scenario: Click on word cloud word and shows two songs that its from
    Given I am authenticated
    When I navigate to the dashboard page
    And I search for "10" songs by "Eminem"
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    Then it should show "Rap God by Eminem"
    And it should show "Lose Yourself by Eminem"

  Scenario: Switch to tabular view
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click the switch to tabular view button
    Then it should show the tabular view

  Scenario: Reload page and word cloud should be gone
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I refresh the dashboard page
    Then The word cloud should be not visible

  Scenario: Words in word cloud aren't over 100
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then The words in word cloud should not be over 100

  Scenario: Words that appear more frequently are larger in the Word Cloud
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then The word "i" should be larger than the word "thai"

  Scenario: Adding a song that is already in word cloud to word cloud
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I add "Rap God by Eminem" into the Word Cloud

  Scenario: Add a song in word cloud to favorites
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    And I navigate to the favorites page
    Then I should see "Rap God by Eminem" in my favorites list

  Scenario: Add a song in word cloud to favorites in tabular mode
    Given I am authenticated
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click the switch to tabular view button
    And I click on the word "i" in word cloud in tabular
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    And I navigate to the favorites page
    Then I should see "Rap God by Eminem" in my favorites list

  Scenario: Add a song that's already in favorites in word cloud to favorites
    Given I am authenticated
    And I favorited "Rap God by Eminem"
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    Then I should see an error message in word cloud

  Scenario: Re-favorite already favorited song from word cloud in tabular
    Given I am authenticated
    And I favorited "Rap God by Eminem"
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click the switch to tabular view button
    And I click on the word "i" in word cloud in tabular
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    Then I should see an error message in word cloud
