(function($) {

  /** List of all gravityforms and their data-attributes. */
  var formList = {};

  /**
   * Wrapper around all GA trackers.
   *
   * @example
   *  Gevent('Category', 'Action', 'Label', function() { I'm a callback });
   */
  window.Gevent = function() {
    var args = Array.prototype.slice.call(arguments);
    var callback = (typeof args[3] === 'function') ? args.splice(3, 1)[0] : null;
    // Yoast renames the `ga` global.
    var _ga = window.ga || window.__gaTracker;
    var script = 'no tracker available';
    var has_gtm = typeof dataLayer !== 'undefined';

    // Make sure any possible callback is fired even if GA fails.
    var hasFiredCallback = false;
    var fireCallback = function() {
      if (hasFiredCallback) {
        return;
      }
      hasFiredCallback = true;
      callback();
    };
    if (callback) {
      setTimeout(fireCallback, 1000);
    }

    if (typeof _ga !== 'undefined') {
      if (callback) {
        args.push({hitCallback: fireCallback, transport: 'beacon'});
      }
      _ga.apply(window, ['send', 'event'].concat(args));
      script = 'analytics.js';
    }
    else if (typeof _gaq !== 'undefined') {
      _gaq.push(['_trackEvent'].concat(args));
      if (callback) {
        _gaq.push(fireCallback);
      }
      script = 'ga.js';
    }
    // Fire the callback unless there's GTM available that can fire it.
    else if (!has_gtm && callback) {
      fireCallback();
    }

    if (has_gtm) {
      args = {
        event: args[0] + '.' + args[1],
        category: args[0],
        action: args[1],
        label: args[2] || ''
      };
      if (callback) {
        args.eventCallback = fireCallback;
      }
      dataLayer.push(args);
      script = 'gtm';
    }

    if (console && console.log) {
      console.log('track event in: ' + script, args);
    }
  };

  /**
   * Track an event specified on a HTML element using data attributes.
   * @private
   */
  function trackElementEvent($el) {
    var category, action, label;

    if (!(category = $el.data('category'))) {
      return;
    }
    if (!(action = $el.data('action'))) {
      return;
    }
    label = $el.data('label');

    window.Gevent(category, action, label);
  }

  /**
   * Trigger an event when form is being submitted and store the form data for
   * later.
   */
  $(document).on('submit', 'form', function (e) {
    var $form = $(this);
    var data = $form.data();
    if (data.hasOwnProperty('generoAnalytics') && data.category && !formList.hasOwnProperty(this.id)) {
      e.preventDefault();
      // Store the data values as the <form> element is removed with AJAX.
      formList[this.id] = data;
      window.Gevent(data.category, 'Send', data.label, function () {
        $form.submit();
      });
    }
  });

  /**
   * Trigger an event on AJAX confirmations.
   */
  $(document).on('gform_confirmation_loaded', function(e, formId) {
    var id = 'gform_' + formId;
    if (formList.hasOwnProperty(id) && !formList[id].done) {
      formList[id].done = true;
      var data = formList[id];
      window.Gevent(data.category, 'Confirmation', data.label);
    }
  });

  /**
   * Reliably track events on external links.
   *
   * @see Google Analytics Module for Drupal
   *
   * @example
   *  <a href="/foo" data-category="Outbound" data-action="Click" data-label="Foo">Foo</a>
   */
  $(document).on('mousedown keyup touchstart', 'a[data-category][data-action], button[data-category][data-action]', function(event) {
    trackElementEvent($(this));
  });

  /**
   * WP Hubspot Form integration.
   */
  $(document).on('wp-hubspot:onFormSubmit', function (e, $form) {
    var $wrapper = $form.parent();
    window.Gevent('HubspotForm', 'Submit', $wrapper.data('hubspotName'));
  });

  /**
   * WP Hubspot CTA integration.
   */
  $(document).on('mousedown keyup touchstart', '.hs-cta-wrapper .cta_button', function () {
    var $this = $(this);
    var $wrapper = $this.parents('.wp-hubspot--cta');
    var label = $wrapper.length ? $wrapper.data('hubspotName') : $this.text();
    window.Gevent('HubspotCTA', 'Click', label);
  })

}(jQuery));
