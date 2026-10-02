(function () {
  'use strict';

  const { assetUrl } = FW.require('core/router');

  // Single source of truth for how an EPM event's category (one of the fixed ids returned by
  // GET /api/epm/events/categories - see EpmCategory on the backend) maps to an icon + accent
  // color + list-card image, shared by the EPM landing page and the "All EPMs" listing so the same
  // category always looks the same everywhere. `icon` is a name for core/icons.js icon().
  const CATEGORY_META = {
    'GAP Workshop': { accent: 'green', icon: 'leaf', badge: 'tag-green', img: assetUrl('images/epm/epm-compliance.avif') },
    'Capacity Building Trainings': { accent: 'teal', icon: 'graduation-cap', badge: 'tag-teal', img: assetUrl('images/epm/epm-training.avif') },
    'FPO Management Sessions': { accent: 'purple', icon: 'building-2', badge: 'tag-purple', img: assetUrl('images/epm/epm-msme.avif') },
    'EPM Meeting': { accent: 'blue', icon: 'users', badge: 'tag-blue', img: assetUrl('images/epm/epm-buyer-seller.avif') },
    'Export Workshops': { accent: 'orange', icon: 'globe', badge: 'tag-orange', img: assetUrl('images/epm/epm-global-market.avif') },
  };
  const FALLBACK = { accent: 'gray', icon: 'calendar', badge: 'tag-orange', img: assetUrl('images/epm/epm-packaging.avif') };

  function getCategoryMeta(category) {
    return CATEGORY_META[category] || FALLBACK;
  }

  function getCategoryIcon(category) {
    return getCategoryMeta(category).icon;
  }

  FW.define('utils/epm-category', { getCategoryMeta, getCategoryIcon });
})();
