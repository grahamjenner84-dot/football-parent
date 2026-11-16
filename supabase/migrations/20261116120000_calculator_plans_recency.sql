-- Hours since this device last made a plan in the calculator, so a coach
-- back for next week's game can be told apart from one reloading the page.
-- Null on a first plan, and whenever the coach has not accepted analytics
-- cookies: the app only keeps the "last plan" time with that consent
-- (coach-app src/data/calculatorTracking.ts). A number, nothing else.
-- football-parent-social project (ref jwlwzoklgrzharqvazeg).
alter table calculator_plans add column if not exists hours_since_last_plan integer;
