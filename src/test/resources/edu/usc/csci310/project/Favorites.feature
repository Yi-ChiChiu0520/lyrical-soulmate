Feature: User Favorites List Feature

  Scenario: User tries to access favorite page without being logged in
    Given I am on the login page
    And I am not authenticated
    And I try to navigate to the favorites page
    Then I should be redirected to the login page

  Scenario: User adds one song to favorites
    Given I am authenticated
    And I navigate to the dashboard page
    When I search for "1" songs by the name "TESTS by The Microphones"
    And I select "TESTS by The Microphones"
    And I click the "Add Selected to Favorites" button
    Then I should see search message "✅ Added: TESTS by The Microphones"
    And I should see "TESTS by The Microphones" in my favorites list

  Scenario: User fails to add duplicate song
    Given I am authenticated
    And I have added "Toxic by Britney Spears" to my favorites
    And I navigate to the dashboard page
    When I search for "1" songs by the name "Toxic by Britney Spears"
    And I select "Toxic by Britney Spears"
    And I click the "Add Selected to Favorites" button
    Then I should see search message "⚠️ Already in favorites: Toxic by Britney Spears"



