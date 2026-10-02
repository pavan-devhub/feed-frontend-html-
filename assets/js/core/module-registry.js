// Tiny module registry - the first script on every page.
//
// The site's scripts are plain (classic) scripts rather than ES modules, so the pages work the same
// whether they are opened from a web server or straight from disk (double-clicking an .html file -
// browsers refuse to load JavaScript modules from file:// URLs).
//
// Each file in assets/js keeps its code private inside its own function scope and shares what other
// files need through this registry:
//
//   FW.define('core/dom', { html, render });              // what the file offers (its "exports")
//   const { html, render } = FW.require('core/dom');      // what a file uses (its "imports")
//
// A module's name is its path under assets/js without ".js". A page lists its <script defer> tags in
// dependency order (a file's requirements before the file itself) - `defer` scripts run in that order
// once the HTML has been parsed.
(function () {
  'use strict';

  const modules = Object.create(null);

  window.FW = {
    define(name, exports) {
      if (name in modules) throw new Error(`FW.define: "${name}" is defined twice`);
      modules[name] = Object.freeze(exports);
    },

    require(name) {
      if (!(name in modules)) {
        throw new Error(`FW.require: "${name}" is not loaded - add <script defer src=".../assets/js/${name}.js"></script> before the script that needs it`);
      }
      return modules[name];
    },

    has(name) {
      return name in modules;
    },
  };
})();
