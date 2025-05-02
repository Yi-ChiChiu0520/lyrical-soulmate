Feature: Word Cloud Functionality

  Scenario: Add a song to Word Cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud

  Scenario: Add two songs to Word Cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    Then "Lose Yourself" should be visible inside the Word Cloud
    And "Rap God" should be visible inside the Word Cloud

  Scenario: Add two songs then remove one from Word Cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    And I remove "Rap God by Eminem" from the Word Cloud
    Then "Rap God" should be not visible inside the Word Cloud
    And "Lose Yourself" should be visible inside the Word Cloud

  Scenario: Add one song then delete that song
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I remove "Rap God by Eminem" from the Word Cloud
    Then The word cloud should be not visible

  Scenario: Add favorites into word cloud
    Given I am authenticated
    And My favorites list is empty
    And I navigate to the dashboard page
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select the song "Rap God by Eminem"
    And I select the song "Lose Yourself by Eminem"
    And I click the "Add Selected to Favorites" button
    And The songs are added to favorites
    And I started word cloud
    And I click the "Add All Favorites to Word Cloud" button
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud
    And "Lose Yourself" should be visible inside the Word Cloud

  Scenario: Add favorites then remove favorites
    Given I am authenticated
    And My favorites list is empty
    And I navigate to the dashboard page
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select the song "Rap God by Eminem"
    And I select the song "Lose Yourself by Eminem"
    And I click the "Add Selected to Favorites" button
    And The songs are added to favorites
    And I navigate to the favorites page
    And I clear all the favorited songs
    And I navigate to the dashboard page
    And I started word cloud
    And I click the "Add All Favorites to Word Cloud" button
    Then "Rap God" should be not visible inside the Word Cloud
    And "Lose Yourself" should be not visible inside the Word Cloud

  Scenario: Click on word cloud word and shows songs that its from
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "Rap" in word cloud
    Then it should show "Rap God by Eminem"

  Scenario: Click on word cloud word and shows two songs that its from
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    Then it should show "Rap God by Eminem"
    And it should show "Lose Yourself by Eminem"

  Scenario: Switch to tabular view
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click the switch to tabular view button
    Then it should show the tabular view

  Scenario: Reload page and word cloud should be gone
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I refresh the dashboard page
    Then The word cloud should be not visible

  Scenario: Words in word cloud aren't over 100
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then The words in word cloud should not be over 100

  Scenario: Words that appear more frequently are larger in the Word Cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then The word "i" should be larger than the word "thai"

  Scenario: Add a song in word cloud to favorites
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    And I navigate to the favorites page
    Then I should see "Rap God by Eminem" in my favorites list

  Scenario: Add a song in word cloud to favorites in tabular mode
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
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
    And I started word cloud
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    Then I should see an error message in word cloud

  Scenario: Re-favorite already favorited song from word cloud in tabular
    Given I am authenticated
    And I favorited "Rap God by Eminem"
    And I started word cloud
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    And I click the switch to tabular view button
    And I click on the word "i" in word cloud in tabular
    And I hover over "Rap God" in Word Cloud and click Add to Favorites
    Then I should see an error message in word cloud

#Sprint 4 Scenarios
  Scenario: Add songs to word cloud without starting word cloud
    Given I am authenticated
    When I navigate to the dashboard page
    And I add "Rap God by Eminem" into the Word Cloud
    Then I should see an error message in word cloud
    And "Rap God" should be not visible inside the Word Cloud

  Scenario: Word cloud should not show filler words
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Lose Yourself by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    Then I should not see any filler words

  Scenario: Word cloud should follow word stemming
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Lovin' You by Minnie Riperton" into the Word Cloud
    And The Word Cloud is loaded
    Then Word cloud should follow word stemming

  Scenario: Click on songs with selected word should show artist name, song release date, and lyrics
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    And I clicked on a song with the word
    Then I should see artist name, song release date, and lyrics of the song

  Scenario: Selected word should be highlighted in lyrics
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I click on the word "i" in word cloud
    And I clicked on a song with the word
    Then I should see the selected word highlighted in lyrics

  Scenario: Progress bar shows up
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    Then I should see a progress bar that shows the loading progress

  Scenario: Progress bar correctly loads multiple songs
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select "Rap God"
    And I select "Lose Yourself"
    And I click the "Add Selected to Word Cloud" button
    Then I should see a progress bar that correctly loads multiple songs

  Scenario: Click stop word cloud should stop generation
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And I stopped word cloud
    Then The word cloud should be not visible

  Scenario: Click stop word cloud after generation
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I add "Rap God by Eminem" into the Word Cloud
    And The Word Cloud is loaded
    And I stopped word cloud
    Then The word cloud should be not visible

  Scenario: Adding song to word with steps broken down
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I select "Rap God"
    And I click the "Add Selected to Word Cloud" button
    And The Word Cloud is loaded
    Then "Rap God" should be visible inside the Word Cloud

  Scenario: Try to add song to word cloud without selecting song
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I search for "10" songs by "Eminem"
    And I clicked on "Eminem" picture in ambiguous search
    And I click the "Add Selected to Word Cloud" button
    Then I should get an alert "Please select at least one song to add to the word cloud."

  Scenario: Refresh resets start word cloud state
    Given I am authenticated
    When I navigate to the dashboard page
    And I started word cloud
    And I refresh the dashboard page
    Then I see the warning "Please start the word cloud before generating."