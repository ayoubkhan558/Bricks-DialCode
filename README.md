# Bricks DialCode

Adds a country flag and dial-code dropdown to Bricks Builder phone fields.

## How it works

- Enhances Bricks form fields using `input[type="tel"]`.
- Shows country flags and separate dial codes.
- Converts the field value to an international number before the form submits.
- Handles dynamically loaded Bricks content.

## Usage

1. Put this folder in `wp-content/plugins/`.
2. Activate **Bricks DialCode** in WordPress.
3. In Bricks Builder, add a form phone field or set a field type to `tel`.
4. Open the Form element settings, go to **Dial code phone**, and set **Phone country dropdown** to **Enable**.

## Bricks controls

The plugin adds a **Dial code phone** group to the Bricks Form element.

- **Phone country dropdown**: Enable or disable the dropdown for this form.
- **Favorite countries**: Comma-separated ISO country codes shown first in the dropdown, for example `pk,us,gb,ae`. Common names like `Pakistan`, `United States`, `UK`, and `UAE` are also accepted, but ISO codes are safest.
- **Show flags**: Show or hide country flags in the selected country button and dropdown list.
- **Default country**: Use `auto`, leave empty, or enter one ISO country code like `pk`.

To enhance a custom phone input outside a Bricks form, add this class:

```html
bricks-dialcode-phone
```

## Developer filters

```php
add_filter( 'bricks_dialcode_initial_country', fn() => 'pk' );
add_filter( 'bricks_dialcode_country_order', fn() => array( 'pk', 'us', 'gb', 'ae' ) );
```

Available filters:

- `bricks_dialcode_selector`
- `bricks_dialcode_initial_country`
- `bricks_dialcode_fallback_country`
- `bricks_dialcode_country_order`
- `bricks_dialcode_only_countries`
- `bricks_dialcode_exclude_countries`
- `bricks_dialcode_initial_country_lookup`
