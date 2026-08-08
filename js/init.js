/* ============================================================
   init.js: app initialization
   ============================================================ */
updatePlayText();
buildMenu();
setVersion('latest');
if (profile.version && profile.version !== 'latest') setVersion(profile.version);
refreshDataDir();