/**
 * js/app.js — App bootstrap
 */
const App = (() => {

  function launch(user) {
    try {
      const role = (user.role && user.role in Router.roleConfig) ? user.role : 'patient';

      // ── Hide auth elements completely ──
      document.querySelectorAll('.auth-bg, .auth-screen, #auth-screen').forEach(el => {
        el.style.cssText = 'display:none!important;visibility:hidden!important;pointer-events:none';
      });

      // ── Remove any login-page body styles ──
      document.body.style.cssText = '';
      document.body.classList.remove('auth-page');

      // ── Remove the login-page <style> block that hides #app ──
      // The inline style in login.html adds display:none!important to #app
      // We override it by setting a higher-specificity inline style
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.removeAttribute('style');
        appEl.style.setProperty('display', 'flex', 'important');
        appEl.style.flexDirection = 'column';
        appEl.style.minHeight = '100vh';
        appEl.style.position = 'relative';
        appEl.style.zIndex = '1';
      }

      // ── Ensure sidebar and content are visible ──
      ['sidebar','content','topbar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.removeAttribute('style');
          el.style.removeProperty('display');
        }
      });

      // ── Show toast ──
      const toastEl = document.getElementById('toast');
      if (toastEl) {
        toastEl.removeAttribute('style');
        toastEl.style.display = '';
      }

      // ── Render dashboard ──
      UI.updateTopbar({ ...user, role });
      Router.setRole(role);
      UI.showToast(`Welcome, ${user.firstName}!`, 'ok');

    } catch (err) {
      console.error('App.launch error:', err);
      const content = document.getElementById('content');
      if (content) content.innerHTML = `
        <div style="padding:24px">
          <div style="background:#FCEBEB;color:#A32D2D;padding:14px 18px;border-radius:10px;border-left:3px solid #E24B4A;font-size:14px">
            <strong>Launch error:</strong> ${err.message}<br>
            <small style="color:#888">Press F12 → Console for details</small>
          </div>
        </div>`;
    }
  }

  async function init() {
    try {
      const storedUser = API.getStoredUser();
      const token      = API.Tokens.getAccess();

      if (storedUser && token) {
        try {
          const res = await API.auth.me();
          if (res?.data) {
            launch(res.data);
          } else {
            API.clearSession();
            _showAuth();
          }
        } catch (err) {
          console.warn('Session check failed:', err.message);
          API.clearSession();
          _showAuth();
        }
      } else {
        _showAuth();
      }
    } catch (err) {
      console.error('App.init error:', err);
      _showAuth();
    }
  }

  function _showAuth() {
    const appEl   = document.getElementById('app');
    const authBg  = document.querySelector('.auth-bg');
    const authScr = document.querySelector('.auth-screen');
    if (appEl)   appEl.style.cssText   = 'display:none!important';
    if (authBg)  authBg.style.display  = 'block';
    if (authScr) authScr.style.display = 'flex';
  }

  return { launch, init };
})();

App.init();
