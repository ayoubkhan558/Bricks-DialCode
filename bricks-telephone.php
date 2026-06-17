<?php
/**
 * Plugin Name: Bricks DialCode
 * Plugin URI:  https://example.com/bricks-dialcode
 * Description: Adds a country flag and dial-code dropdown to Bricks Builder phone fields.
 * Version:     1.0.0
 * Author:      Your Name
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bricks-dialcode
 *
 * @package Bricks_DialCode
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BRICKS_DIALCODE_VERSION', '1.0.0' );
define( 'BRICKS_DIALCODE_FILE', __FILE__ );
define( 'BRICKS_DIALCODE_URL', plugin_dir_url( __FILE__ ) );

/**
 * Normalizes a comma-separated country list to lowercase ISO2 country codes.
 *
 * @param string|array $countries Country codes.
 * @return array
 */
function bricks_dialcode_normalize_countries( $countries ) {
	$aliases = array(
		'america'              => 'us',
		'australia'            => 'au',
		'canada'               => 'ca',
		'emirates'             => 'ae',
		'greatbritain'         => 'gb',
		'pakistan'             => 'pk',
		'uae'                  => 'ae',
		'uk'                   => 'gb',
		'unitedarabemirates'   => 'ae',
		'unitedkingdom'        => 'gb',
		'unitedstates'         => 'us',
		'unitedstatesofamerica'=> 'us',
		'usa'                  => 'us',
	);

	if ( is_string( $countries ) ) {
		$countries = explode( ',', $countries );
	}

	if ( ! is_array( $countries ) ) {
		return array();
	}

	$countries = array_map(
		function( $country ) use ( $aliases ) {
			$country = strtolower( preg_replace( '/[^a-z]/i', '', (string) $country ) );

			return isset( $aliases[ $country ] ) ? $aliases[ $country ] : $country;
		},
		$countries
	);

	return array_values(
		array_filter(
			array_unique( $countries ),
			function( $country ) {
				return strlen( $country ) === 2;
			}
		)
	);
}

/**
 * Adds Bricks Builder controls to the Form element.
 *
 * @param array $groups Existing control groups.
 * @return array
 */
function bricks_dialcode_add_form_control_group( $groups ) {
	$groups['bricksDialcode'] = array(
		'title' => esc_html__( 'Dial code phone', 'bricks-dialcode' ),
	);

	return $groups;
}
add_filter( 'bricks/elements/form/control_groups', 'bricks_dialcode_add_form_control_group' );

/**
 * Adds Bricks Builder form controls.
 *
 * @param array $controls Existing controls.
 * @return array
 */
function bricks_dialcode_add_form_controls( $controls ) {
	$controls['bricksDialcodeEnabled'] = array(
		'tab'         => 'content',
		'group'       => 'bricksDialcode',
		'label'       => esc_html__( 'Phone country dropdown', 'bricks-dialcode' ),
		'type'        => 'select',
		'options'     => array(
			'yes' => esc_html__( 'Enable', 'bricks-dialcode' ),
			'no'  => esc_html__( 'Disable', 'bricks-dialcode' ),
		),
		'inline'      => true,
		'clearable'   => false,
		'default'     => 'yes',
		'description' => esc_html__( 'Adds flags, country names, and dial codes to telephone fields in this form.', 'bricks-dialcode' ),
	);

	$controls['bricksDialcodeFavorites'] = array(
		'tab'         => 'content',
		'group'       => 'bricksDialcode',
		'label'       => esc_html__( 'Favorite countries', 'bricks-dialcode' ),
		'type'        => 'text',
		'placeholder' => 'pk,us,gb,ae',
		'required'    => array( 'bricksDialcodeEnabled', '!=', 'no' ),
		'description' => esc_html__( 'Comma-separated ISO country codes shown first. Example: pk,us,gb,ae.', 'bricks-dialcode' ),
	);

	$controls['bricksDialcodeShowFlags'] = array(
		'tab'      => 'content',
		'group'    => 'bricksDialcode',
		'label'    => esc_html__( 'Show flags', 'bricks-dialcode' ),
		'type'     => 'checkbox',
		'default'  => true,
		'required' => array( 'bricksDialcodeEnabled', '!=', 'no' ),
	);

	$controls['bricksDialcodeInitialCountry'] = array(
		'tab'         => 'content',
		'group'       => 'bricksDialcode',
		'label'       => esc_html__( 'Default country', 'bricks-dialcode' ),
		'type'        => 'text',
		'placeholder' => 'auto, pk, us',
		'required'    => array( 'bricksDialcodeEnabled', '!=', 'no' ),
		'description' => esc_html__( 'Use "auto" for IP lookup, leave empty for browser/library default, or enter an ISO country code.', 'bricks-dialcode' ),
	);

	return $controls;
}
add_filter( 'bricks/elements/form/controls', 'bricks_dialcode_add_form_controls' );

/**
 * Adds frontend data attributes to enabled Bricks Form elements.
 *
 * @param array  $attributes Element attributes.
 * @param string $key        Attribute key being rendered.
 * @param object $element    Bricks element instance.
 * @return array
 */
function bricks_dialcode_add_render_attributes( $attributes, $key, $element ) {
	if ( $key !== '_root' || empty( $element->name ) || $element->name !== 'form' ) {
		return $attributes;
	}

	$settings = isset( $element->settings ) && is_array( $element->settings ) ? $element->settings : array();

	if ( isset( $settings['bricksDialcodeEnabled'] ) && $settings['bricksDialcodeEnabled'] === 'no' ) {
		return $attributes;
	}

	$favorites       = ! empty( $settings['bricksDialcodeFavorites'] ) ? $settings['bricksDialcodeFavorites'] : apply_filters( 'bricks_dialcode_country_order', array( 'us', 'gb', 'ca', 'au' ) );
	$favorites       = bricks_dialcode_normalize_countries( $favorites );
	$initial_country = isset( $settings['bricksDialcodeInitialCountry'] ) ? strtolower( trim( $settings['bricksDialcodeInitialCountry'] ) ) : '';

	if ( $initial_country && $initial_country !== 'auto' && strlen( $initial_country ) !== 2 ) {
		$initial_country = '';
	}

	$attributes['_root']['data-bricks-dialcode'] = '1';

	if ( $favorites ) {
		$attributes['_root']['data-bricks-dialcode-favorites'] = implode( ',', $favorites );
	}

	if ( $initial_country ) {
		$attributes['_root']['data-bricks-dialcode-initial-country'] = $initial_country;
	}

	if ( isset( $settings['bricksDialcodeShowFlags'] ) && ! $settings['bricksDialcodeShowFlags'] ) {
		$attributes['_root']['data-bricks-dialcode-show-flags'] = '0';
	}

	return $attributes;
}
add_filter( 'bricks/element/render_attributes', 'bricks_dialcode_add_render_attributes', 10, 3 );

/**
 * Enqueues frontend assets for Bricks phone fields.
 */
function bricks_dialcode_enqueue_assets() {
	if ( is_admin() ) {
		return;
	}

	$intl_tel_input_version = '29.1.0';
	$cdn_base               = "https://cdn.jsdelivr.net/npm/intl-tel-input@{$intl_tel_input_version}/dist";

	wp_enqueue_style(
		'intl-tel-input',
		"{$cdn_base}/css/intlTelInput.css",
		array(),
		$intl_tel_input_version
	);

	wp_enqueue_style(
		'bricks-dialcode',
		BRICKS_DIALCODE_URL . 'assets/css/bricks-dialcode.css',
		array( 'intl-tel-input' ),
		BRICKS_DIALCODE_VERSION
	);

	wp_enqueue_script(
		'intl-tel-input',
		"{$cdn_base}/js/intlTelInput.min.js",
		array(),
		$intl_tel_input_version,
		true
	);

	wp_enqueue_script(
		'bricks-dialcode',
		BRICKS_DIALCODE_URL . 'assets/js/bricks-dialcode.js',
		array( 'intl-tel-input' ),
		BRICKS_DIALCODE_VERSION,
		true
	);

	wp_localize_script(
		'bricks-dialcode',
		'BricksDialCodePhone',
		array(
			'selector'           => apply_filters( 'bricks_dialcode_selector', 'form[data-bricks-dialcode="1"] input[type="tel"], form input.bricks-dialcode-phone' ),
			'initialCountry'     => apply_filters( 'bricks_dialcode_initial_country', '' ),
			'fallbackCountry'    => apply_filters( 'bricks_dialcode_fallback_country', 'us' ),
			'countryOrder'       => bricks_dialcode_normalize_countries( apply_filters( 'bricks_dialcode_country_order', array( 'us', 'gb', 'ca', 'au' ) ) ),
			'onlyCountries'      => bricks_dialcode_normalize_countries( apply_filters( 'bricks_dialcode_only_countries', array() ) ),
			'excludeCountries'   => bricks_dialcode_normalize_countries( apply_filters( 'bricks_dialcode_exclude_countries', array() ) ),
			'initialCountryLookup'=> apply_filters( 'bricks_dialcode_initial_country_lookup', true ) ? '1' : '0',
			'utilsScript'        => "{$cdn_base}/js/utils.js",
		)
	);
}
add_action( 'wp_enqueue_scripts', 'bricks_dialcode_enqueue_assets' );
