// Classic (non-module) script, loaded before the page's module script. Browsers refuse to load
// JavaScript modules from file:// URLs, so a page opened by double-clicking the .html file would
// render without its navbar, footer or any behaviour. Instead of failing silently, say how to
// open the site properly (see README.md -> "Running locally").
(function () {
  if (window.location.protocol !== 'file:') return;
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:100000;padding:16px 20px;'
      + 'background:#fff7ed;border:1px solid #fdba74;border-radius:12px;color:#7c2d12;'
      + 'font:14px/1.5 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.15);';
    box.innerHTML = '<strong>This site must be opened through a web server.</strong> '
      + 'Browsers block JavaScript modules on file:// pages. From the feed-frontend folder run '
      + '<code>npx serve .</code> (or use VS Code "Live Server") and open the address it prints. '
      + 'See README.md for details.';
    document.body.appendChild(box);
  });
})();
