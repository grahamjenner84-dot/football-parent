-- Add a "banner_shown" action so cookie_consent_events can also record when
-- the banner is displayed, not just the decision a visitor eventually makes.
-- Without this, days with a real traffic drop and days with a real reject-rate
-- increase look identical from the decision counts alone - there was no
-- denominator. Same anonymous, consent-independent shape as the existing
-- accept_all/reject_all/save_preferences rows (see 20260810120000).
alter table cookie_consent_events drop constraint cookie_consent_events_action_check;

alter table cookie_consent_events
  add constraint cookie_consent_events_action_check
  check (action in ('banner_shown', 'accept_all', 'reject_all', 'save_preferences'));
