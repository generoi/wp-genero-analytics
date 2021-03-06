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
   * Trigger the `gform_confirmation_loaded` event for forms without AJAX.
   */
  $(document).on('ready', function () {
    if (window.generoAnalyticsForm) {
      var formId = window.generoAnalyticsForm.id;
      var id = 'gform_' + formId;
      if (!formList.hasOwnProperty(id)) {
        formList[id] = window.generoAnalyticsForm;
        $(document).trigger('gform_confirmation_loaded', formId);
      }
    }
  })

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

  /**
   * Tawk.to integration
   */
  function addTawkToIntegration() {
    if (!window.Tawk_API) {
      return;
    }

    var window_loaded = new Date().getTime();
    var tawk_events = {
      'onChatMaximized': 'Open',
      'onChatMinimized': 'Close',
      'onChatHidden': 'Hide',
      'onChatEnded': 'End',
      'onPrechatSubmit': 'PrechatSubmit',
      'onOfflineSubmit': 'OfflineSubmit',
    };

    for (var event in tawk_events) if (tawk_events.hasOwnProperty(event)) {
      (function (event) {
        window.Tawk_API[event] = function () {
          var current_time = new Date().getTime();
          if (tawk_events[event] && (current_time > (window_loaded + 1000))) {
            window.Gevent('Tawk.to', tawk_events[event], window.Tawk_API.visitor && window.Tawk_API.visitor.name || '');
            tawk_events[event] = null;
          }
        };
      }(event));
    }
  }

  $(document).on('ready', addTawkToIntegration);
  $(window).on('load', addTawkToIntegration);

  /**
   * Social networks
   */
  function trackSocialInteraction(network, action, target) {
    // Yoast has it's own tracker anyways.
    if (window.ga) {
      ga('send', {
        hitType: 'social',
        socialNetwork: network,
        socialAction: action,
        socialTarget: target,
      })
    }
    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({
        event: 'socialInteraction',
        socialNetwork: network,
        socialAction: action,
        socialTarget: target,
      });
    }

    if (console && console.log) {
      console.log('track social interaction', arguments);
    }
  }

  function addFacebookListeners() {
    window.FB.Event.subscribe('edge.create', function (targetUrl) {
      trackSocialInteraction('Facebook', 'like', targetUrl);
    });
    window.FB.Event.subscribe('edge.remove', function (targetUrl) {
      trackSocialInteraction('Facebook', 'unlike', targetUrl);
    });
    window.FB.Event.subscribe('message.send', function (targetUrl) {
      trackSocialInteraction('Facebook', 'send', targetUrl);
    });
  }

  function addTwitterListeners() {
    window.twttr.ready(function (twttr) {
      window.twttr.events.bind('tweet', function () {
        trackSocialInteraction('Twitter', 'tweet', window.location.href);
      });
      window.twttr.events.bind('retweet', function () {
        trackSocialInteraction('Twitter', 'retweet', window.location.href);
      });
      window.twttr.events.bind('favorite', function () {
        trackSocialInteraction('Twitter', 'favorite', window.location.href);
      });
      window.twttr.events.bind('follow', function () {
        trackSocialInteraction('Twitter', 'follow', window.location.href);
      });
    });
  }

  $(window).on('load', function () {
    var hasFacebookIntegration = hasTwitterIntegration = false;
    var delay = 1000;
    var counter = 0;

    var loop = setInterval(function () {
      if (!hasFacebookIntegration && window.FB && window.FB.Event && window.FB.Event.subscribe) {
        hasFacebookIntegration = true;
        addFacebookListeners();
      }
      if (!hasTwitterIntegration && window.twttr && window.twttr.ready) {
        hasTwitterIntegration = true;
        addTwitterListeners();
      }

      if (hasFacebookIntegration && hasTwitterIntegration || (++counter > 10)) {
        clearInterval(loop);
      }
    }, delay)
  });

}(jQuery));
