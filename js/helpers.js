/* ============================================================
   helpers.js - shared UI utilities
   ============================================================ */

/* Shortcut selector */
function $(sel) {
  return document.querySelector(sel);
}

/* Show/hide contextual status text in pages */
function showStatus(el, text) {
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
}

/* Overlay management */
function showOverlay(id) {
  document.querySelectorAll('.overlay-screen, .overlay-dialog').forEach((el) => el.classList.remove('show'));
  document.getElementById(id).classList.add('show');
}

function hideOverlays() {
  document.querySelectorAll('.overlay-screen, .overlay-dialog').forEach((el) => el.classList.remove('show'));
}

/* Message / error / unsupported dialog */
function showMessageScreen(title, html) {
  document.getElementById('msg-title').textContent = title;
  document.getElementById('msg-body').innerHTML = html || '';
  showOverlay('message-screen');
}

document.getElementById('msg-ok').addEventListener('click', () => hideOverlays());

/* ============================================================
   Wallpaper randomizer
   ============================================================ */
const wallpapers = [
  '2058x1440/MCV_SummerDropKeyArt_NetDownloadableWallpaper_2058x1440.png',
  '2058x1440/Minecraft_TheGardenAwakens_DotNet_2058x1440.png',
  '2058x1440/Minecraft_Trails&Tales_.Net_2058x1440.png',
  '2058x1440/wallpaper_minecraft_bedrock_edition_2058x1440.png',
  '2058x1440/wallpaper_minecraft_caves_cliffs(part1)_2058x1440.png',
  '2058x1440/wallpaper_minecraft_caves_cliffs(part2)_2058x1440.png',
  '2058x1440/wallpaper_minecraft_nether_update_2058x1440.png',
  '2058x1440/wallpaper_minecraft_trickytrials_2058x1440.png',
  '2058x1440/wallpaper_minecraft_world_color_2058x1440.png'
];

document.getElementById('background').style.backgroundImage =
  'url("' + wallpapers[Math.floor(Math.random() * wallpapers.length)] + '")';