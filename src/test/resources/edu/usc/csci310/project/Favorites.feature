Feature: User Favorites List Feature

  # security
  Scenario: User tries to access favorite page without being logged in
    Given I am on the login page
    And I am not authenticated
    And I try to navigate to the favorites page
    Then I should be redirected to the login page

  Scenario: Favorites persist across sessions with correct order
    Given I am authenticated
    And My favorites list is empty
    When I have added "when you sleep by my bloody valentine" to my favorites
    And I have added "Nurse! by bar italia" to my favorites
    And I have added "Sofia by Clairo" to my favorites
    Then I should have the following order in my favorites list
      | 0 | when you sleep by my bloody valentine |
      | 1 | Nurse! by bar italia                  |
      | 2 | Sofia by Clairo                       |
    # SPRINT REVIEW 2: RENAME TO LOGOUT/LOG IN
    When I am not authenticated
    And I am on the login page
    And I am authenticated
    And I navigate to the favorites page
    Then I should have the following order in my favorites list
      | 0 | when you sleep by my bloody valentine |
      | 1 | Nurse! by bar italia                  |
      | 2 | Sofia by Clairo                       |

  # SPRINT REVIEW 2: REMIND TO RELOOK AT NEXT SPRINT, NO POINTS THIS TIME
  # DO TWO CASES FOR MOVE UP AND MOVE DOWN SEPARAtELY
  Scenario: Moved favorites maintain order after logout and login
    Given I am authenticated
    And My favorites list is empty
    And I have added "The Phone Works Both Ways by The Jazz June" to my favorites
    And I have added "Me and Your Mama by Childish Gambino" to my favorites
    And I have added "Ribs by Lorde" to my favorites
    When I navigate to the favorites page
    Then I should have the following order in my favorites list
      | 0 | The Phone Works Both Ways by The Jazz June           |
      | 1 | Me and Your Mama by Childish Gambino     |
      | 2 | Ribs by Lorde               |
    When I hover over "Ribs by Lorde"
    And I click the move up button on "Ribs by Lorde"
    And I hover over "The Phone Works Both Ways by The Jazz June"
    And I click the move down button on "The Phone Works Both Ways by The Jazz June"
    Then I should have the following order in my favorites list
      | 0 | Ribs by Lorde               |
      | 1 | The Phone Works Both Ways by The Jazz June           |
      | 2 | Me and Your Mama by Childish Gambino     |
    When I am not authenticated
    And I am on the login page
    And I am authenticated
    And I navigate to the favorites page
    Then I should have the following order in my favorites list
      | 0 | Ribs by Lorde               |
      | 1 | The Phone Works Both Ways by The Jazz June           |
      | 2 | Me and Your Mama by Childish Gambino     |


  # -- Add/Remove Favorites --
  # move to search
  Scenario: Add no songs to favorites (none selected)
    Given I am authenticated
    When I navigate to the dashboard page
    And I search for "5" songs by "test"
    And I click the "Add Selected to Favorites" button
    Then I should get an alert "Please select at least one song to add."

  # only by artist name for search

  Scenario: Hovering over song shows buttons
    Given I am authenticated
    And My favorites list is empty
    And I have added "The Phone Works Both Ways by The Jazz June" to my favorites
    When I navigate to the favorites page
    And I hover over "The Phone Works Both Ways by The Jazz June"
    Then I should see the move and remove buttons on "The Phone Works Both Ways by The Jazz June"

  # SPRINT REVIEW 2: There should be a confirmation modal for removing a song
  Scenario: User removes a favorite song
    Given I am authenticated
    And I have added "Show Me How by Men I Trust" to my favorites
    When I navigate to the favorites page
    And I hover over "Show Me How by Men I Trust"
    And I click the remove button on "Show Me How by Men I Trust"
    And I should not see "Show Me How by Men I Trust" in my favorites list

  # SPRINT REVIEW 2: No points but leave this in here
  Scenario: User fails to add duplicate song
    Given I am authenticated
    And I have added "Toxic by Britney Spears" to my favorites
    And I navigate to the dashboard page
    When I search for "10" songs by "Britney Spears"
    And I select "Toxic by Britney Spears"
    And I click the "Add Selected to Favorites" button
    Then I should see search error message "⚠️ Already in favorites: Toxic by Britney Spears"

  # SPRINT REVIEW 2: No points but leave this in here
  Scenario: Bulk add songs to favorites
    Given I am authenticated
    And I have added "the Moon by The Microphones" to my favorites
    And I navigate to the dashboard page
    When I search for "20" songs by "The Microphones"
    And I select "I Want Wind To Blow by The Microphones"
    And I select "I Felt Your Shape by The Microphones"
    And I select "the Moon by The Microphones"
    # these songs were chosen purely out of convenience
    And I click the "Add Selected to Favorites" button
    Then I should see success message "✅ Added: I Want Wind To Blow by The Microphones, I Felt Your Shape by The Microphones"
    And I should see search error message "⚠️ Already in favorites: the Moon by The Microphones"
    And I should see "I Want Wind To Blow by The Microphones" in my favorites list
    And I should see "I Felt Your Shape by The Microphones" in my favorites list
    And I should see "the Moon by The Microphones" in my favorites list

  # -- Interacting with Songs --
  # add hovering scenario + specificity
  Scenario: User moves song up
    Given I am authenticated
    And I have added "White Owls by smokedope2016" to my favorites
    And I have added "Laputa by Panchiko" to my favorites
    # this ^ places it below Loose Change
    When I navigate to the favorites page
    And I hover over "Laputa by Panchiko"
    And I click the move up button on "Laputa by Panchiko"
    Then I should see "Laputa by Panchiko" above "White Owls by smokedope2016"

  Scenario: User moves song down
    Given I am authenticated
    And I have added "Venus as a Boy by Björk" to my favorites
    And I have added "Easter Pink by fakemink" to my favorites
    When I navigate to the favorites page
    And I hover over "Venus as a Boy by Björk"
    And I click the move down button on "Venus as a Boy by Björk"
    Then I should see "Easter Pink by fakemink" above "Venus as a Boy by Björk"

  # SPRINT REVIEW 2: This case failed. Find out why.
  Scenario: User views additional song info in favorites
    Given I am authenticated
    And I have added "Northern Sky by Nick Drake" to my favorites
    When I navigate to the favorites page
    # i click on song title
    And I click on the song title "Northern Sky by Nick Drake"
    Then I should see the artist name "Nick Drake" for "Northern Sky by Nick Drake"
    And I should see the release date "1971" for "Northern Sky by Nick Drake"