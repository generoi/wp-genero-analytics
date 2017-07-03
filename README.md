# wp-genero-analytics

> A Wordpress plugin with a few Analytics integrations.

## Features

- Add Analytics event options to Gravityforms
- Detects GTM and tracks both to Google Analytics and GTM if available.
- Provides logging for each event for easier debugging
- [WP Hubspot](https://github.com/generoi/wp-hubspot) integration that tracks CTA's and Form submissions automatically.

_Note as GTM has a different set of event attributes they're submitted as `<category>.<action>`, eg `Outbound.Click`, or `ContactForm.Send`._

### Submit an event with JavaScript

```js
window.Gevent('Category', 'Action', 'Label', function() {
  // callback once event is submitted.
});
```

### Track an arbitrary link

```html
<a href="/foo" data-category="Outbound" data-action="Click" data-label="Foo">Foo</a>
```
