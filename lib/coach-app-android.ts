// The Coach App's Android build as it shows up in this site's data. Plain
// constants, no server-only imports, so the admin dashboard (a client
// component) can use them as well as the report modules.

// Each Android app open (coach-app src/data/appPageView.ts): /coach-app/android
// for a signed-in coach, /coach-app/android/sign-in for the sign-in screen.
// Recorded from the Android release of 21 Oct 2026; before that no Android
// open reached this site.
const ANDROID_APP_PATH = "/coach-app/android";

export function isAndroidAppPath(path: string): boolean {
  return path === ANDROID_APP_PATH || path.startsWith(`${ANDROID_APP_PATH}/`);
}

// The landing path every Android sign-up reports to coach_app_signups,
// attributed or not (coach-app src/data/installAttribution.ts). Every other
// sign-up came through a web form.
export const ANDROID_INSTALL_LANDING_PATH = "/coach-app/android-install";
