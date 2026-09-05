(() => {
  const config = window.PRAYER_BOX_CONFIG || {};
  const hasSettings = Boolean(
    config.SUPABASE_URL &&
    config.SUPABASE_PUBLISHABLE_KEY &&
    !config.SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
    !config.SUPABASE_PUBLISHABLE_KEY.includes('REPLACE_WITH_YOUR_KEY')
  );
  const libraryAvailable = Boolean(window.supabase && window.supabase.createClient);
  const configured = hasSettings && libraryAvailable;

  const client = configured
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  window.PrayerBox = Object.freeze({
    client,
    configured,
    configurationMessage: hasSettings
      ? 'Unable to load. Check your internet connection and try again.'
      : 'This site is not connected yet. Add the Supabase URL and publishable key in app-config.js.'
  });
})();
