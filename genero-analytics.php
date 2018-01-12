<?php
/*
Plugin Name:        Genero Analytics
Plugin URI:         http://genero.fi
Description:        Some small Google Analytics additions
Version:            1.3.2
Author:             Genero
Author URI:         http://genero.fi/

License:            MIT License
License URI:        http://opensource.org/licenses/MIT
*/

namespace Genero;

if (!defined('ABSPATH')) {
  exit;
}

class Analytics {
  private static $instance = null;
  public $plugin_name = 'wp-genero-analytics';
  public $github_url = 'https://github.com/generoi/wp-genero-analytics';

  public static function get_instance() {
    if ( null === self::$instance ) {
      self::$instance = new self();
    }

    return self::$instance;
  }

  public function __construct() {
    Puc_v4_Factory::buildUpdateChecker($this->github_url, __FILE__, $this->plugin_name);
    add_action('plugins_loaded', [$this, 'init']);
  }

  public function init() {
    add_action('wp_footer', array($this, 'enqueue_scripts'));
    add_filter('gform_form_settings', array($this, 'gform_settings'), 10, 2);
    add_filter('gform_pre_form_settings_save', array($this, 'gform_settings_save'), 10, 2);
    add_filter('gform_form_tag', array($this, 'gform_tag'), 10, 2);
    add_filter('gform_confirmation', array($this, 'gform_confirmation'), 10, 4);
  }

  public function enqueue_scripts() {
    wp_register_script('genero/analytics', plugin_dir_url(__FILE__) . 'genero-analytics.js', array(), '0.1', true);
    wp_enqueue_script('genero/analytics', plugin_dir_url(__FILE__) . 'genero-analytics.js');
  }

  /**
   * Attach two form options to GravityForm forms where users can set the GA
   * category and label for automatically tracking submissions.
   */
  public function gform_settings($settings, $form) {
    foreach (array(
      'analytics_category' => __('Event Category', 'genero-analytics'),
      'analytics_label' => __('Event Label', 'genero-analytics'),
    ) as $field => $label) {
      $settings['Analytics'][$field] = '
        <tr>
          <th><label for="' . $field . '">' . $label . '</label></th>
          <td><input value="' . rgar($form, $field) . '" name="' . $field . '"></td>
        </tr>
      ';
    }
    return $settings;
  }

  /**
   * Save the added form options.
   */
  public function gform_settings_save($form) {
    foreach (array('analytics_category', 'analytics_label') as $field) {
      $form[$field] = rgpost($field);
    }
    return $form;
  }

  /**
   * Attach the form options are data-attributes to the <form> tag.
   */
  public function gform_tag($form_tag, $form) {
    if (!empty($form['analytics_category'])) {
      $category = $form['analytics_category'];
      $label = !empty($form['analytics_label']) ? $form['analytics_label'] : '';
      $form_tag = str_replace("method='post'", "method='post' data-genero-analytics data-category='$category' data-label='$label'", $form_tag);
      wp_enqueue_script('genero/analytics', plugin_dir_url(__FILE__) . 'genero-analytics.js');
    }
    return $form_tag;
  }

  public function gform_confirmation($confirmation, $form, $entry, $is_ajax) {
    if (is_string($confirmation) && !empty($form['analytics_category'])) {
      $category = $form['analytics_category'];
      $label = !empty($form['analytics_label']) ? $form['analytics_label'] : '';
      $confirmation .= '<script>window.generoAnalyticsForm = {"category": "' . $category . '", "label": "' . $label . '", "id": "' . $form['id'] . '"};</script>';
    }
    return $confirmation;
  }

}

if (file_exists($composer = __DIR__ . '/vendor/autoload.php')) {
    require_once $composer;
}

Analytics::get_instance();
