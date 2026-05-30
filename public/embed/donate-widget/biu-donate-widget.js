/**
 * Believe In Unity — embeddable donation widget
 *
 * Embed:  https://believeinunity.org/{ORG_SLUG}
 */
(function () {
  "use strict";

  var DEFAULT_BASE = "https://believeinunity.org";
  var LOGO = "/favicon-96x96.png";

  function getBaseUrl() {
    var widget = document.querySelector(".biu-donate-widget");
    if (widget && widget.getAttribute("data-base-url")) {
      return widget.getAttribute("data-base-url").replace(/\/$/, "");
    }

    if (window.location.hostname === "localhost" || window.location.hostname.endsWith(".test")) {
      return window.location.origin;
    }

    return DEFAULT_BASE;
  }

  function getOrgSlug() {
    var widget = document.querySelector(".biu-donate-widget");
    if (widget && widget.getAttribute("data-org-slug")) {
      return widget.getAttribute("data-org-slug").trim();
    }

    var parts = window.location.pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return "";
    }

    if (parts[0] === "embed" && parts[1] === "donate-widget") {
      var params = new URLSearchParams(window.location.search);
      return (params.get("org") || params.get("slug") || "").trim();
    }

    return parts[parts.length - 1].trim();
  }

  function donateUrl(method) {
    var base = getBaseUrl();
    var slug = getOrgSlug();
    var url = slug ? base + "/" + encodeURIComponent(slug) : base + "/donate";

    if (method) {
      url += (url.indexOf("?") >= 0 ? "&" : "?") + "method=" + encodeURIComponent(method);
    }

    return url;
  }

  function openDonate(method) {
    window.open(donateUrl(method), "_blank", "noopener,noreferrer");
  }

  window.openBelieveCash = function () {
    openDonate("believecash");
  };

  window.openCashApp = function () {
    openDonate("cash_app");
  };

  window.openZelle = function () {
    openDonate("zelle");
  };

  window.openCardAch = function () {
    openDonate("card_ach");
  };

  function applyConfig() {
    var base = getBaseUrl();
    var slug = getOrgSlug();
    var widget = document.querySelector(".biu-donate-widget");

    if (! widget) {
      return;
    }

    if (slug) {
      widget.setAttribute("data-org-slug", slug);
    }

    var logos = widget.querySelectorAll("[data-biu-logo]");
    logos.forEach(function (img) {
      img.src = base + LOGO;
    });

    var mainLink = widget.querySelector(".biu-donate-button");
    if (mainLink) {
      mainLink.href = donateUrl("believecash");
    }

    var footerLink = widget.querySelector(".biu-footer-powered a[data-biu-home]");
    if (footerLink) {
      footerLink.href = base;
    }

    var sitePill = widget.querySelector("[data-biu-site-url]");
    if (sitePill) {
      sitePill.textContent = base.replace(/^https?:\/\//, "");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyConfig);
  } else {
    applyConfig();
  }
})();
