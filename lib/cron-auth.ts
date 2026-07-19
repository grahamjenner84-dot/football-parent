// Shared-secret bearer check for the cron-triggered publish endpoint.
// Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`
// when CRON_SECRET is set as an env var - but this same check also accepts
// any other caller presenting the right header, which is what lets an
// external scheduler (e.g. GitHub Actions) trigger the identical endpoint
// if the project ever ends up on a Vercel plan whose Cron Jobs feature
// doesn't support a sub-daily schedule.
export function isAuthorizedCronRequest(authorizationHeader: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authorizationHeader === `Bearer ${expected}`;
}
