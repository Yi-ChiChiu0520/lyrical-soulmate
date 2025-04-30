Feature: Song Search functionality

  Scenario: Duplicate artist search
    Given I am logged in
    When I navigate to the search page
    And I enter "Smith" in the artist search field
    And I select to display "5" results
    And I click the search button
    Then I should see a list of artists that include the name "Smith"
    When I select artist "The Smiths"
    Then I should see a list of 5 songs by "The Smiths"

  Scenario: Basic song search by artist name
    Given I am logged in
    When I navigate to the search page
    And I enter "Gotye" in the artist search field
    And I select to display "5" results
    And I click the search button
    And I select artist "Gotye"
    Then I should see a list of 5 songs by "Gotye"
    And each song result should display the song name and artist

  Scenario: Empty artist name search
    Given I am logged in
    When I navigate to the search page
    And I enter no artist name
    And I select to display "5" results
    And I click search
    Then I should see an error message
    And no search results displayed

  Scenario: Empty number of songs to display
    Given I am logged in
    When I navigate to the search page
    And I enter "Love" in the search field
    And I enter no song display number
    And I click search
    Then I should see an error message
    And no search results displayed

  Scenario: View song details from search results
    Given I am logged in
    And I have searched for artist "Gotye"
    And search results are displayed
    When I click on a song in the search results
    Then I should see the song details including:
      | Song name      |
      | Artist name    |
      | Release date   |

  Scenario: User adds one song to favorites
    Given I am authenticated
    And I navigate to the dashboard page
    When I search for "10" songs by "Nirvana"
    And I select artist "Nirvana"
    And I select "Polly by Nirvana"
    And I click the "Add Selected to Favorites" button
    Then I should see success message "✅ Added: Polly by Nirvana"
    And I should see "Polly by Nirvana" in my favorites list

  # SPRINT 2 REVIEW: Repeated
  Scenario: Limit number of search results displayed
    Given I am logged in to the application
    When I navigate to the search page
    And I enter "Drake" in the artist search field
    And I select to display "3" results
    And I click the search button
    And I select artist "Drake"
    Then I should see no more than 3 song results

  Scenario: Navigate from search results to word cloud creation
    Given I am logged in to the application
    And I have searched for artist "Gotye"
    And search results are displayed
    And I select the song "Somebody That I Used to Know"
    When I click the "Add Selected to Word Cloud" button for a song
    Then I should see the song's word cloud

  Scenario: Search with non-existent artist
    Given I am logged in to the application
    When I navigate to the search page
    And I enter a non-existent artist name "XYZ123NonExistent"
    And I select to display "5" results
    And I click the search button
    Then I should see a no results error message
