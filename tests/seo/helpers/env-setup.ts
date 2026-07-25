// Dummy env vars so tests never depend on this developer's real
// .env.local (gitignored, absent in CI) or accidentally pick up real
// credentials. `??=` mirrors tests/helpers/env-setup.ts's existing
// convention - only fills in what isn't already set.
process.env.DATAFORSEO_LOGIN ??= "test-user@example.com";
process.env.DATAFORSEO_PASSWORD ??= "test-password-not-real";
process.env.DATAFORSEO_ENV ??= "sandbox";
process.env.DATAFORSEO_ALLOW_LIVE ??= "false";
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??= "test@example.iam.gserviceaccount.com";
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.GSC_SITE_URL ??= "sc-domain:footballparent.co.uk";

export {};
