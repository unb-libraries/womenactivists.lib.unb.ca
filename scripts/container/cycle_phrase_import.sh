#!/usr/bin/env sh
DRUSH_COMMAND="drush --root=${DRUPAL_ROOT} --uri=default --yes"
$DRUSH_COMMAND cache-rebuild
/scripts/import_example_phrases.sh
