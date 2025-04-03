Feature: User Favorites List Feature

  # security
  Scenario: User tries to access favorite page without being logged in
    Given I am on the login page
    And I am not authenticated
    And I try to navigate to the favorites page
    Then I should be redirected to the login page

  # -- Add/Remove Favorites --
  Scenario: User adds one song to favorites
    Given I am authenticated
    And I navigate to the dashboard page
    When I search for "1" songs by the name "TESTS by The Microphones"
    And I select "TESTS by The Microphones"
    And I click the "Add Selected to Favorites" button
    Then I should see search success message "✅ Added: TESTS by The Microphones"
    And I should see "TESTS by The Microphones" in my favorites list

  Scenario: User removes a favorite song
    Given I am authenticated
    And I have added "Sugar by Men I Trust" to my favorites
    When I navigate to the favorites page
    And I remove "Sugar by Men I Trust" from my favorites list
    And I should not see "Sugar by Men I Trust" in my favorites list

  Scenario: User fails to add duplicate song
    Given I am authenticated
    And I have added "Toxic by Britney Spears" to my favorites
    And I navigate to the dashboard page
    When I search for "1" songs by the name "Toxic by Britney Spears"
    And I select "Toxic by Britney Spears"
    And I click the "Add Selected to Favorites" button
    Then I should see search error message "⚠️ Already in favorites: Toxic by Britney Spears"

  Scenario: Bulk add songs to favorites
    Given I am authenticated
    And I have added "Despacito (Remix) by Luis Fonsi & Daddy Yankee (Ft. Justin Bieber)" to my favorites
    And I navigate to the dashboard page
    When I search for "10" songs by the name "a"
    And I select "Despacito (Remix) by Luis Fonsi & Daddy Yankee (Ft. Justin Bieber)"
    And I select "Starboy by The Weeknd (Ft. Daft Punk)"
    And I select "Bad and Boujee by Migos (Ft. Lil Uzi Vert)"
    And I click the "Add Selected to Favorites" button
    Then I should see search success message "✅ Added: Bad and Boujee by Migos (Ft. Lil Uzi Vert), Starboy by The Weeknd (Ft. Daft Punk)"
    And I should see search error message "⚠️ Already in favorites: Despacito (Remix) by Luis Fonsi & Daddy Yankee (Ft. Justin Bieber)"
    And I should see "Despacito (Remix) by Luis Fonsi & Daddy Yankee (Ft. Justin Bieber)" in my favorites list
    And I should see "Starboy by The Weeknd (Ft. Daft Punk)" in my favorites list
    And I should see "Bad and Boujee by Migos (Ft. Lil Uzi Vert)" in my favorites list

  # -- Interacting with Songs --
  Scenario: User moves song up
    Given I am authenticated
    And I have added "Loose Change by The Alchemist (Ft. Earl Sweatshirt)" to my favorites
    And I have added "I Hate It Too by Hum" to my favorites
    # this ^ places it below Loose Change
    When I navigate to the favorites page
    And I move "I Hate It Too by Hum" up
    Then I should see "I Hate It Too by Hum" above "Loose Change by The Alchemist (Ft. Earl Sweatshirt)"

  Scenario: User moves song down
    Given I am authenticated
    And I have added "Hidden Place by Björk" to my favorites
    And I have added "Easter Pink by fakemink" to my favorites
    When I navigate to the favorites page
    And I move "Hidden Place by Björk" down
    Then I should see "Easter Pink by fakemink" above "Hidden Place by Björk"

  Scenario: User views additional song info in favorites
    Given I am authenticated
    And I have added "Hazey Jane II by Nick Drake" to my favorites
    When I navigate to the favorites page
    And I click on favorite "Hazey Jane II by Nick Drake"
    Then I should see the artist name "Nick Drake" for "Hazey Jane II by Nick Drake"
    And I should see the release date "1971" for "Hazey Jane II by Nick Drake"

