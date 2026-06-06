/**
 * js/app.js — App bootstrap
 */
const App = (() => {

  function launch(user) {
    try {
      const role = (user.role && user.role in Router.roleConfig) ? user.role : 'patient';

      // Hide auth screen, show app
      const authScreen = document.getElementById('auth-screen');
      const appEl      = document.getElementById('app');

      if (authScreen) authScreen.style.display = 'none';
      if (appEl) {
        appEl.style.display       = 'flex';
        appEl.style.flexDirection = 'column';
        appEl.style.minHeight     = '100vh';
      }

      // Update topbar name/avatar/role
      UI.updateTopbar({ ...user, role });

      // Render sidebar + default page for this role
      Router.setRole(role);

      UI.showToast(`Welcome back, ${user.firstName}!`, 'ok');

    } catch (err) {
      console.error('App.launch error:', err);
      // Show error in content area so it's visible
      const content = document.getElementById('content');
      if (content) {
        content.innerHTML = `
          <div style="padding:24px">
            <div style="background:#FCEBEB;color:#A32D2D;padding:14px;border-radius:10px;border-left:3px solid #E24B4A;font-size:13px">
              <strong>App launch error:</strong> ${err.message}<br>
              <small>Check browser console (F12) for details.</small>
            </div>
          </div>`;
      }
    }
  }

  async function init() {
    try {
      const storedUser = API.getStoredUser();
      const token      = API.Tokens.getAccess();

      if (storedUser && token) {
        try {
          const res = await API.auth.me();
          if (res && res.data) {
            launch(res.data);
          } else {
            API.clearSession();
          }
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          API.clearSession();
          // Make sure auth screen is visible
          const authScreen = document.getElementById('auth-screen');
          if (authScreen) authScreen.style.display = 'flex';
          const appEl = document.getElementById('app');
          if (appEl) appEl.style.display = 'none';
        }
      } else {
        // No session — make sure auth screen shows
        const authScreen = document.getElementById('auth-screen');
        if (authScreen) authScreen.style.display = 'flex';
        const appEl = document.getElementById('app');
        if (appEl) appEl.style.display = 'none';
      }
    } catch (err) {
      console.error('App.init error:', err);
    }
  }

  return { launch, init };
})();

// Start the app
App.init();
