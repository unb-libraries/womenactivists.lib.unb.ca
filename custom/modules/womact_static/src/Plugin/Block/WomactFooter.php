<?php

namespace Drupal\womact_static\Plugin\Block;

use Drupal\Core\Block\BlockBase;

/**
 * Provides a custom footer block.
 *
 * @Block(
 *   id = "womact_footer",
 *   admin_label = @Translation("WOMACT Footer"),
 *   category = @Translation("Misc"),
 * )
 */
class WomactFooter extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $year = date('Y');
    $text = "<p id='womact-footer'>© $year<br>This work is licensed under a Creative Commons
    Attribution-NonCommercial 2.5 Canada License.<br>Maintained by
    <a href='https://lib.unb.ca'>UNB Libraries</a>, <a href='https://unb.ca'>University
    of New Brunswick</a>.<br>For inquiries about licensing rights please contact
    us.</p>";

    return [
      '#markup' => $this->t($text),
    ];
  }

}
