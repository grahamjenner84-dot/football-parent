Football Coach App — Prototype Inventory
Screens / Tabs
1. Onboarding (first-run wizard, 5 steps)
Purpose: first-time setup before the main app is usable.

Step 0 – Welcome: Name input (Your Name), Role picker (Head Coach / Assistant Coach / Team Manager), Team Name input (required — shows error text if empty on Continue).
Step 1 – Game Format: Format chips (a-side sizes, derived from all available formations: 3,4,5,6,7,8,9,11), Default Formation chips (filtered to formats matching chosen size), Periods toggle (Halves / Quarters), Minutes-per-period number input.
Step 2 – Home Ground: optional Address text input.
Step 3 – Auto-Rotate Rules: four Yes/No toggles — Equal Game Time by Default, Rotate Positions, GK Included in Rotation; plus Minimum Time per Player (At least half / At least a quarter).
Step 4 – Squad Setup: bulk "Quick Add" textarea (comma-separated names) + Add Names button; one-by-one Add (name, optional number, position chip picker); each added player can have Primary Position and Secondary Position set inline; players can be removed (×). Finish Setup / Back / Skip for now.
Writes: coachName, coachRole, teamName, format/formation, period type/minutes, home ground, all rotation rules, initial squad (custom players).
State: step index 0–4; validation blocks step 0 without a team name.
2. Home tab
Purpose: at-a-glance dashboard.

Upcoming fixtures (next 2, tagged NEXT/THEN) — tap opens Matchday tab.
Form · Last 5 — 5 result badges (W/D/L, fixed green/amber/red regardless of accent) with score; tap opens Match Detail modal.
Record summary text (e.g. "3W 1D 1L across last 5 games").
Reads only — no data captured here.
3. Matchday tab (multi-screen flow)
3a. Overview — Next Match card: opponent/date/KO/meet/location, mini pitch preview (shows starter initials if a lineup is saved, else "no lineup set yet"), two buttons: Pre-Match Admin (→ Squad screen) and Match Day Live (→ Live screen, blocked with an alert if no lineup exists).

3b. Confirm Squad — grid of all players; tap toggles Available/Out (opacity + badge changes). Any pending rule alert banner shown, dismissible. Continue button proceeds to Team Selection (re-uses last lineup if nothing selected yet).

3c. Team Selection —

Format chips (a-side sizes) and Formation chips for that size.
"Customize Formation" toggle: drag any non-GK player on the pitch into a new spot (snapped into Attack/Midfield/Defence thirds by vertical position); "Reset to standard formation" link.
Mode toggle: Fixed Team vs Equal Time (Rotate).
Fixed Team: Auto-generate / Use Last Lineup ⇄ Clear Lineup / Select manually. Pitch diagram with tap-to-fill, tap-to-swap, and drag-and-drop from bench. Bench list below (tap or drag onto a slot).
Equal Time (Rotate): Auto-fill Rotation button; a grid table (position rows × period columns: 1st/2nd Half or Q1–Q4) with a synthesized extra Subs row listing players not on the pitch that period; tap or drag to assign/swap.
Settings gear icon → Team Selection Settings modal (below).
Save Lineup button.
Writes: formation, custom positions, fixed slots or per-period rotation slots, saved "last lineup" for reuse.
3d. Live Match —

Header: opponent name, Start/Pause toggle, settings gear (→ Match Settings modal).
"End [Period]" / "Full Time" button advances period or ends match (locks controls, snapshots result, may open Man of the Match modal).
Scoreboard (US / THEM goal counts, fixed dark card).
Goal For / Goal Against buttons (open Goal modal); Yellow Card / Red Card buttons (open Card modal) — all disabled once match is saved.
On-Pitch diagram for the current period with drag-and-drop substitutions (dropping a bench player onto a pitch slot logs a "Substitution" feed event; swapping two on-pitch players logs a "Position swap" event).
Bench chips below pitch (draggable onto pitch).
Match Feed: list of events (goals, cards, subs, period-end, notes) each with a colored dot (green=goal for, red=goal against/opponent, amber=card, grey=note/period); "+" button in the feed header adds a blank note and opens the Commentary modal; tapping any event row also opens Commentary (prefilled if it already has a note) — this is the click-to-edit commentary feature.
4. Training tab
Purpose: tactics board / drill builder.

Sub-nav: Editor / My Drills / Sessions.
Editor:
Drill name field + Save Drill / New buttons.
Pitch size (Full / Half / Final Third).
Tool palette: Player, Ball, Cone, Goal, Arrow, Line, plus Clear.
Undo/Redo (history of up to 30 steps).
Player tool shows a colour swatch picker (blue/red/yellow).
Arrow/Line tool shows a drawing hint; drawing a shape prompts a label picker (Pass/Shoot/Run/Jog/Dribble/Cancel) and assigns it to a numbered "sequence step" (steppable +/−) so multiple arrows can be grouped to animate together.
Pitch canvas: click to place the selected element; drag existing elements; double-click deletes; arrows/lines can be selected (click) and have draggable endpoints; ▶ Animate Drill plays arrow sequences step-by-step (moves matching player/ball tokens along each step's path); ■ Stop cancels playback.
My Drills: list of saved drills, tap to load into Editor, Delete per row; empty-state message if none saved.
Sessions: create named sessions; open a session to add/reorder/remove saved drills (↑/↓/×); Play Session steps through its drills one at a time in the Editor with Prev/Next/Exit Session controls.
Writes: drills (pitch size + placed elements + arrows), sessions (ordered drill lists), current board state.
5. Stats tab
Purpose: season/team/player analytics (read-only, computed).

Filters: Season chips (All Time / 2025-26 / 2024-25), Match Type chips (All/League/Cup/Tournament/Friendly, multi-select).
Sub-tab: Team vs Individual.
Team: summary tile groups — Record (games, wins, draws, losses + %), Goals (for/against/diff/clean sheets/top scorer/top assister), Averages (avg for/against/diff, mins per goal), Streaks & Extremes (best win streak, biggest win/loss), Home/Away records. Player Stats table (Goals/Assists/Minutes/Goals-per-90, per90 in accent color). Playing Time by Position — a per-player stacked bar (GK/DEF/MID/FWD/Sub %) using fixed position colors.
Individual: player chip selector; selected player's goals/assists/minutes summary plus breakdown groups: Goals by Body Part, Goals by Type, Home vs Away minutes, By Competition minutes, By Position minutes — each as labeled progress bars.
Reads only — all values are computed/derived (some are seeded-random placeholder generators, see Placeholders section).
6. Global overlays (available across screens)
FAB (+) menu — floating action button (hidden on Squad/Team-Select/Live screens or when any modal is open) expands to: New Match, New Training Session, New Poll.
New Match modal: Opponent (text), Match Type chips (League/Cup/Tournament/Friendly), conditional Extra-Time-if-Drawn Yes/No (Cup/Tournament only) → Extra Time Format (One Period/Two Periods) + Minutes-per-period, Date, Kick-off time, Meet-up time (auto-suggests 30 min before kick-off unless manually edited), Location text, optional "save as default home ground" checkbox, static map-preview placeholder, Notes textarea, Save Match.
New Poll modal: Question text, two option inputs (labeled placeholders "Yes"/"No"), Send Poll — not functionally wired (see Placeholders).
Match Settings modal (live match only): Manage Squad/Bench shortcut, Abandon Match (confirms, discards score/events).
Team Selection Settings modal: Game Format chips, Quarters/Halves, Minutes per section; Auto-Rotate Rules: Equal Position Time (season balance Yes/No), GK Included in Rotation, Minimum Game Time per Player (1 Quarter / 2 Quarters-Half), Same-position-per-game policy (Allow/Warn/Block), Alert-when-player-needs-more-minutes Yes/No; Save; Manage Squad/Bench shortcut.
Settings modal (global, from top-bar gear): Appearance (Light/Dark — link swaps to the sibling file), Button Colour swatch picker (5 accent options, scoped only to buttons/non-critical UI), Team Name field, Manage Squad shortcut (shows player count), Coach Details (name, role chips), Home Ground field, Team Rules section (Format, Default Formation, and the same rotation-rule set as onboarding step 3 plus Same-Position policy as 3-way Allow/Allow+Alert/Block and Alert-on-rule-break Yes/No), Save Changes, Log Out (visual only).
Manage Squad modal: full roster list; tap a row to expand inline edit (name, number, position chips), Save; × removes a player (custom players deleted outright, base squad players hidden via a removed-ids list); Add Player form (name, number, position chips) at the bottom.
Man of the Match modal: triggered automatically at Full Time if any players took part; list of participants (tap to record MOTM) or Skip.
Fixtures modal: Upcoming list + Played list (result badge, score, competition, venue) — tap a played row opens Match Detail.
Match Detail modal: scoreline card, result label/color, meta line (competition · season · venue), Scorers (extracted from feed text), Man of the Match (if recorded), full Match Feed (if recorded) or "No event-by-event detail recorded" fallback.
Manual Slot Picker / Manual Period Slot Picker: bottom-sheet player list to fill an empty pitch/rotation slot, or clear it.
Goal modal: two-step — 1) Who Scored? (grid of on-pitch players), 2) Body Part chips, Goal Type chips, Assist (optional, grid of other on-pitch players incl. "No assist"), Save Goal. (Goal Against skips straight to a simple "Goal conceded" feed entry, no detail steps.)
Card modal: Our Team vs Opponent toggle; Our Team shows a player grid to attribute the card (2nd yellow auto-escalates to a red-card event); Opponent shows a single "Log Card for Opponent" button (no player attribution for the opposing side).
Commentary modal: title switches between "Add Commentary?" (new note) and "Edit Commentary" (existing); shows the parent event's text, a free-text textarea, Skip (discards an empty new note) / Save.
Data Entities
Player — id, name, number, primary position (GK/DEF/MID/FWD or none = "Any"), secondary position (optional). Custom (coach-added) players and the seeded base squad are merged; base-squad players can be edited via per-field overrides or removed via a hidden-ids list rather than true deletion.

Fixture (upcoming match) — id, opponent, date, kick-off time, meet time, location, notes, competition type, extra-time flag/format/minutes.

Played Result / Match record — id, opponent, venue (H/A), goals for, goals against, result (W/D/L), competition, season, date, list of match events, Man of the Match name.

Match Event (in a match's feed) — id, type (goal / card / sub / period / note), side (for/against/us/them where relevant), display text, optional free-text commentary.

Lineup / Team Selection — formation key, fixed-mode slot array (player id per formation slot) OR periods-mode: an array of slot-arrays (one per period); optional custom formation slot positions (x/y overrides); "last lineup" cache for reuse.

Rules (Team Rules / Auto-Rotate config) — equalGameTimeDefault, rotatePositions, gkIncludedDefault, minTimePerPlayer, samePositionPolicy, alertOnRuleBreak, periodMinutes, positionBalanceMode, alertPositionMinutesNeeded.

Drill — id, name, pitch size, list of placed elements (player/ball/cone/goal tokens with x/y and, for players, a colour), list of arrows/lines (each with start/end coords, optional label and sequence step).

Session — id, name, ordered list of drill ids.

Season stats (derived, not stored) — computed per-player and per-team from the played-results list; not a persisted entity.

App/coach profile — teamName, coachName, coachRole, homeGroundAddress/defaultHomeGround, accent color override, theme (light/dark — separate files, not a stored field), onboarding completion flag.

Fixed Vocabularies
Positions: GK, DEF, MID, FWD (plus "Any"/none as a player default).
Tactical role labels (auto-derived from formation, shown as sub-labels only): CB/LCB/RCB/LB/RB/LWB/RWB (defence); CM/LCM/RCM/LM/RM/CDM/LDM/RDM/CAM/LW/RW (midfield, split into Deep/Advanced bands when spread wide); ST/LST/RST/LW/RW (attack); GK.
Formations (fixed sets): 4-3-3, 4-4-2, 4-2-3-1, 3-4-3, 1-2-1 (5-a-side), 2-1-1 (5-a-side), plus procedurally generated ones for other squad sizes: 1-1 (3-a-side), 2-2-1 / 1-3-1 (6-a-side), 2-3-1 / 3-2-1 (7-a-side), 3-3-1 / 2-3-2 (8-a-side), 3-3-2 (9-a-side), 4-3-1 (9-a-side).
Game formats (a-side): derived from formation sizes — 3, 4, 5, 6, 7, 8, 9, 11.
Periods: Halves (1st Half, 2nd Half) or Quarters (Q1–Q4); optional Extra Time (One Period / Two Periods) for Cup/Tournament matches.
Match/Competition types: League, Cup, Tournament, Friendly.
Goal body parts: Left foot, Right foot, Header, Body.
Goal types: Volley, Shot, Solo run, Free kick, Corner.
Card types: Yellow Card, Red Card (2nd yellow auto-generates a Red).
Training tools: Player, Ball, Cone, Goal, Arrow, Line.
Player token colours: blue, red, yellow.
Arrow/movement labels: Pass, Shoot, Run, Jog, Dribble (each has a fixed label colour; Pass/Shoot move the ball token, others move a player token during Animate).
Coach roles: Head Coach, Assistant Coach, Team Manager.
Same-position-per-game policy: Allow / Allow+Alert (Warn) / Block.
Availability: Available / Out.
Result codes: W, D, L.
Accent (button colour) options: 5 curated swatches, one shared list across both Light and Dark theme files; scoped strictly to buttons and non-critical accents — win/draw/loss colours, pitch green, and stats-page colours are fixed regardless of accent.
Seasons (stats filter): All Time, 2025/26, 2024/25.
Relationships
A Fixture becomes a Played Result once its match is completed (Full Time); the played result carries the season and competition inherited from the fixture/match setup at kickoff.
A Played Result belongs to a Season (season string field) and a Competition type.
A Played Result contains a list of Match Events, each optionally carrying Commentary.
A Lineup (fixed or per-period) references Players by id per Formation slot; the formation determines slot count/positions, which determines the vocabulary of valid positions for rotation-rule checks.
Rules govern how a Lineup's rotation is auto-generated and validated (e.g. same-position policy checks against a player's history within the current match's period slots).
A Session references an ordered list of Drills by id (drills are shared/reusable across sessions).
Team/individual Stats are derived from the combined list of seeded historical Played Results plus any session-created ones — not their own stored entity.
Players are shared globally across Squad screens, Team Selection, Live Match, Manage Squad, and Stats — one roster, referenced by id everywhere.
Placeholders / Not Fully Designed
Poll feature: the "New Poll" modal is UI-only — inputs aren't wired to state, and "Send Poll" just closes the modal with no persistence or distribution logic.
Stats numbers (goals, assists, minutes, per-90, breakdowns) are synthetically generated from a seeded pseudo-random function based on player id/position — not real recorded data. Only the season won/lost/drawn record and its 20 seeded historical matches are semi-fixed "sample data"; anything played live during a session adds to this list.
Map preview in the New Match modal is a static placeholder pattern with "map preview" text — no real map integration.
Log Out in Settings is a static, non-functional label.
Coach Details / Home Ground are captured but not used elsewhere in the app beyond display.
Opponent cards (Card modal, "Opponent" side) are logged without attributing an individual player — intentionally simplified since the coach doesn't track the opposing roster.
Dark theme file is a structurally-synced duplicate of the light file (same logic/state/props) with dark-appropriate default colors and softer pastel accent swatches; the two are not a single codebase with a runtime theme switch — switching themes navigates to the other file.