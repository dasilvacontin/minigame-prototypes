# Garden Grapple Implementation Tasks

Started at 8am? Done by 12pm with a quick breakfast break. That's 4 hours.

1. 🏟 **Core Game Setup**
   - 1.1 ✅ Set up a playable arena (garden setting).
   - 1.2 ✅ Implement collision detection (players, turnips, boundaries).
   - 1.3 ✅ Spawn locations for players and turnips.
   - 1.4 ✅ Set up a timer (e.g., 2–3 minutes per match).

2. 🏃 **Player Mechanics**
   - 2.1 ✅ Basic player movement (WASD/controller stick).
   - 2.2 ✅ Speed slows down based on turnip size.
   - 2.3 ✅ Implement turnip dropping (press button to drop and regain speed).

3. 🏋️ **Turnip Handling**
   - 3.1 ✅ Players can interact with turnips (press button to pick up).
   - 3.2 ✅ Turnips have random sizes (small, medium, large).
   - 3.3 ✅ Turnips slow players down when carried.
   - 3.4 ✅ Players carry only one turnip at a time.
   - 3.5 ✅ Turnips are dropped automatically if hit by a headbutt.

4. 🤜 **Headbutt Mechanic**
   - 4.1 ✅ Players can headbutt (attack button) when not holding a turnip.
   - 4.2 ✅ If headbutt lands, opponent is stunned (can't move or act) for X seconds.
   - 4.3 ✅ The attacker has a short recovery time after a headbutt.
   - 4.4 ✅ If a stunned player was carrying a turnip, they drop it.
   - 4.5 ✅ Stunned players have a visual effect (e.g., stars spinning around their head).

5. 🛒 **Turnip Collection & Scoring**
   - 5.1 ✅ Each player has a safe zone (chest).
   - 5.2 ✅ Players must drop turnips into their safe zone to bank them.
   - 5.3 ✅ Once banked, turnips cannot be stolen or lost.
   - 5.4 ✅ Score is based on turnip size.

6. 📊 **Score Tracking & UI**
   - 6.1 ✅ Display player scores on the UI.
   - 6.2 ✅ Add match timer on screen.
   - 6.3 ✅ Show who is carrying a turnip visually (turnip held above head).

7. 🎨 **Visual & Audio Feedback**
   - 7.1 ✅ Turnips change size when pulled from the ground.
   - 7.2 ✅ Players slow down visibly when carrying larger turnips.
   - 7.3 ✅ Headbutt has a small animation & impact effect.
   - 7.4 ✅ Stunned players have a "dizzy" effect (stars, wobbly movement).

8. 🔊 **Sound Effects**
   - 8.1 ❌ Turnip pull sound when grabbing a turnip.
   - 8.2 ❌ Drop sound when dropping a turnip.
   - 8.3 ❌ Impact sound when headbutting.
   - 8.4 ❌ Stun sound when a player is hit.

9. **Game Flow & Win Condition**
   - 9.1 ✅ Game starts with a countdown (3, 2, 1, Go!).
   - 9.2 ✅ Players collect turnips, headbutt, and bank points.
   - 9.3 ✅ Game ends when timer reaches 0.
   - 9.4 ✅ Winner is the player with the most points.
   - 9.5 ✅ Victory screen & scoreboard displayed. 