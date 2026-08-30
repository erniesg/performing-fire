/* Optional localized Payload broadcast-content adapter.
   Copy is remote-editable; structure, signals, layout, and contribution behavior are not. */
(function () {
  "use strict";
  var LOCALES = ["en", "ko", "zh", "ja"];
  var CHANNELS = ["about", "contribute", "experiments", "research", "log"];
  var FULL = ["label", "heading", "body", "link"];
  var SECTION = ["heading", "body", "link"];
  var HEADING = ["heading", "link"];
  var FIELD_SUPPORT = {
    about: [FULL, SECTION, SECTION, SECTION, SECTION],
    contribute: [FULL, SECTION, SECTION, HEADING, HEADING],
    experiments: [FULL, FULL],
    research: [FULL, SECTION, HEADING, HEADING, HEADING, HEADING, SECTION],
    log: [FULL, SECTION, SECTION, SECTION, SECTION]
  };
  var meta = document.querySelector('meta[name="pf-broadcast-endpoint"]');
  var configuredEndpoint = meta ? String(meta.getAttribute("content") || "").trim() : "";

  function approvedEndpoint(value) {
    if (!value) { return ""; }
    try {
      var url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin && url.origin !== "https://berlayar.ai") { return ""; }
      if (url.protocol !== "https:" && url.origin !== window.location.origin) { return ""; }
      return url.href;
    } catch (e) { return ""; }
  }

  function text(value, limit) {
    return typeof value === "string" && value.trim() && value.length <= limit ? value.trim() : null;
  }

  function internalLink(value) {
    if (typeof value !== "string" || value.indexOf("\\") !== -1 || !/^\/(?!\/)[^\s]*$/.test(value)) { return null; }
    try {
      var resolved = new URL(value, window.location.origin + "/");
      return resolved.origin === window.location.origin ? value : null;
    } catch (e) { return null; }
  }

  function normalizeTransmission(value, fields) {
    if (!value || typeof value !== "object" || Array.isArray(value)) { return null; }
    var item = {};
    var label = text(value.label, 80);
    var heading = text(value.heading, 160);
    var body = text(value.body, 1200);
    var linkLabel = text(value.linkLabel, 100);
    var linkHref = internalLink(value.linkHref);
    if (label && fields.indexOf("label") !== -1) { item.label = label; }
    if (heading && fields.indexOf("heading") !== -1) { item.heading = heading; }
    if (body && fields.indexOf("body") !== -1) { item.body = body; }
    if (linkLabel && linkHref && fields.indexOf("link") !== -1) { item.linkLabel = linkLabel; item.linkHref = linkHref; }
    return Object.keys(item).length ? item : null;
  }

  function normalize(payload, locale) {
    var root = payload && Array.isArray(payload.docs) ? payload.docs[0] : payload;
    if (!root || typeof root !== "object" || root.locale && root.locale !== locale) { return null; }
    if (root.status && root.status !== "published") { return null; }
    var source = root.channels;
    if (!source || typeof source !== "object" || Array.isArray(source)) { return null; }
    var result = {};
    CHANNELS.forEach(function (slug) {
      var channel = source[slug];
      if (!channel || !Array.isArray(channel.transmissions)) { return; }
      var support = FIELD_SUPPORT[slug];
      var transmissions = channel.transmissions.map(function (value, index) {
        return normalizeTransmission(value, support[index] || []);
      });
      if (transmissions.some(Boolean)) { result[slug] = transmissions; }
    });
    return Object.keys(result).length ? result : null;
  }

  function load(locale) {
    if (LOCALES.indexOf(locale) === -1) { return Promise.resolve(null); }
    var endpoint = approvedEndpoint(configuredEndpoint);
    if (!endpoint) { return Promise.resolve(null); }
    var url = new URL(endpoint);
    url.searchParams.set("locale", locale);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, 3500) : 0;
    return window.fetch(url.href, {
      headers: { "Accept": "application/json" },
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) { throw new Error(String(res.status)); }
      return res.json();
    }).then(function (json) {
      return normalize(json, locale);
    }).catch(function () {
      return null;
    }).then(function (value) {
      if (timer) { window.clearTimeout(timer); }
      return value;
    });
  }

  window.PF_BROADCAST_CONTENT = {
    load: load,
    normalize: normalize,
    approvedEndpoint: approvedEndpoint
  };
})();
