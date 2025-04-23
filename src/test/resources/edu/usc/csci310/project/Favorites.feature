Feature: User Favorites List Feature

  Scenario: User tries to access favorite page without being logged in
    Given I am on the login page
    And I am not authenticated
    And I try to navigate to the favorites page
    Then I should be redirected to the login page

  Scenario: User removes a favorite song
    Given I am authenticated
    And I favorited "Show Me How by Men I Trust"
    When I navigate to the favorites page
    And I hover over "Show Me How by Men I Trust"
    And I click the remove button on "Show Me How by Men I Trust"
    And I see the remove confirmation modal
    And I confirm removal
    Then I should not see "Show Me How by Men I Trust" in my favorites list

  Scenario: User does not confirm song removal
    Given I am authenticated
    And I favorited "Winona by Drop Nineteens"
    When I navigate to the favorites page
    And I hover over "Winona by Drop Nineteens"
    And I click the remove button on "Winona by Drop Nineteens"
    And I see the remove confirmation modal
    And I do not confirm removal
    Then I should see "Winona by Drop Nineteens" in my favorites list

  Scenario: Favorites persist across sessions with correct order
    Given I am authenticated
    And My favorites list is empty
    When I favorited "when you sleep by my bloody valentine"
    And I favorited "Nurse! by bar italia"
    And I favorited "Sofia by Clairo"
    Then I should have the following order in my favorites list
      | 0 | when you sleep by my bloody valentine |
      | 1 | Nurse! by bar italia                  |
      | 2 | Sofia by Clairo                       |

    When I am not authenticated
    And I am on the login page
    And I am authenticated
    And I navigate to the favorites page
    Then I should have the following order in my favorites list
      | 0 | when you sleep by my bloody valentine |
      | 1 | Nurse! by bar italia                  |
      | 2 | Sofia by Clairo                       |

  Scenario: User moves favorites up and down successfully
    Given I am authenticated
    And My favorites list is empty
    And I favorited "The Phone Works Both Ways by The Jazz June"
    And I favorited "Me and Your Mama by Childish Gambino"
    And I favorited "Ribs by Lorde"
    When I navigate to the favorites page
    Then I should have the following order in my favorites list
      | 0 | The Phone Works Both Ways by The Jazz June |
      | 1 | Me and Your Mama by Childish Gambino       |
      | 2 | Ribs by Lorde                              |
    When I hover over "Ribs by Lorde"
    And I click the move up button on "Ribs by Lorde"
    And I hover over "The Phone Works Both Ways by The Jazz June"
    And I move down "The Phone Works Both Ways by The Jazz June"
    Then I should have the following order in my favorites list
      | 0 | Ribs by Lorde                              |
      | 1 | The Phone Works Both Ways by The Jazz June |
      | 2 | Me and Your Mama by Childish Gambino       |

  Scenario: Moved favorites order persists after re-login
    Given I am authenticated
    And My favorites list is empty
    And I favorited "The Phone Works Both Ways by The Jazz June"
    And I favorited "Me and Your Mama by Childish Gambino"
    And I favorited "Ribs by Lorde"
    And I navigate to the favorites page
    And I hover over "Ribs by Lorde"
    And I click the move up button on "Ribs by Lorde"
    And I hover over "The Phone Works Both Ways by The Jazz June"
    And I move down "The Phone Works Both Ways by The Jazz June"
    When I am not authenticated
    And I am on the login page
    And I am authenticated
    And I navigate to the favorites page
    Then I should have the following order in my favorites list
      | 0 | Ribs by Lorde                              |
      | 1 | The Phone Works Both Ways by The Jazz June |
      | 2 | Me and Your Mama by Childish Gambino       |

  Scenario: Add no songs to favorites (none selected)
    Given I am authenticated
    When I navigate to the dashboard page
    And I search for "5" songs by "test"
    And I click the "Add Selected to Favorites" button
    Then I should get an alert "Please select at least one song to add."

  Scenario: Hovering over song shows buttons
    Given I am authenticated
    And My favorites list is empty
    And I favorited "The Phone Works Both Ways by The Jazz June"
    When I navigate to the favorites page
    And I hover over "The Phone Works Both Ways by The Jazz June"
    Then I see move remove for "The Phone Works Both Ways by The Jazz June"

  Scenario: User fails to add duplicate song
    Given I am authenticated
    And I favorited "Toxic by Britney Spears"
    And I navigate to the dashboard page
    When I search for "10" songs by "Britney Spears"
    And I select "Toxic by Britney Spears"
    And I click the "Add Selected to Favorites" button
    Then I'll see error "⚠️ Already in favorites: Toxic by Britney Spears"

  Scenario: Bulk add songs to favorites
    Given I am authenticated
    And I favorited "the Moon by The Microphones"
    And I navigate to the dashboard page
    When I search for "20" songs by "The Microphones"
    And I select "the Glow pt. 2 by The Microphones"
    And I select "the Moon by The Microphones"
    And I select "Headless Horseman by The Microphones"
    And I click the "Add Selected to Favorites" button
    Then I should see success message "✅ Added: the Glow pt. 2 by The Microphones, Headless Horseman by The Microphones"
    And I'll see error "⚠️ Already in favorites: the Moon by The Microphones"
    And I should see "the Moon by The Microphones" in my favorites list
    And I should see "the Glow pt. 2 by The Microphones" in my favorites list
    And I see "Headless Horseman by The Microphones" in favorites

  Scenario: User moves song up
    Given I am authenticated
    And I favorited "White Owls by smokedope2016"
    And I favorited "Laputa by Panchiko"
    When I navigate to the favorites page
    And I hover over "Laputa by Panchiko"
    And I click the move up button on "Laputa by Panchiko"
    Then I should see "Laputa by Panchiko" above "White Owls by smokedope2016"

  Scenario: User moves song down
    Given I am authenticated
    And I favorited "Venus as a Boy by Björk"
    And I favorited "Easter Pink by fakemink"
    When I navigate to the favorites page
    And I hover over "Venus as a Boy by Björk"
    And I move down "Venus as a Boy by Björk"
    Then I should see "Easter Pink by fakemink" above "Venus as a Boy by Björk"

  Scenario: User views additional song info in favorites
    Given I am authenticated
    And I favorited "Northern Sky by Nick Drake"
    When I navigate to the favorites page
    And I click on the song title "Northern Sky by Nick Drake"
    Then I see artist "Nick Drake" for "Northern Sky by Nick Drake"
    And I should see the release date "1971" for "Northern Sky by Nick Drake"
