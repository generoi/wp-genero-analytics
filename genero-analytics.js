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
    else if (callback) {
      fireCallback();
    }

    if (console && console.log) {
      console.log('track event in: ' + script, args);
    }
  };

  /**
   * Trigger an event when form is being submitted and store the form data for
   * later.
   */
  $('form').one('submit', function (e) {
    var $form = $(this);
    var data = $form.data();
    if (data.hasOwnProperty('generoAnalytics') && data.category) {
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
    if (formList.hasOwnProperty(id)) {
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
  $(document.body).bind('mousedown keyup touchstart', function(event) {
    $(event.target).closest('a, area').each(function() {
      var $this = $(this);
      var category, action, label;

      if (!(category = $this.data('category'))) {
        return;
      }
      if (!(action = $this.data('action'))) {
        return;
      }
      label = $this.data('label');

      window.Gevent(category, action, label);
    });
  });

}(jQuery));
