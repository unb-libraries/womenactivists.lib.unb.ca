FROM unblibraries/drupal:alpine-nginx-php7-8.x
MAINTAINER Jacob Sanford <jsanford@unb.ca>

LABEL name="womenactivists.lib.unb.ca"
LABEL vcs-url="https://github.com/unb-libraries/womenactivists.lib.unb.ca"

# Universal environment variables.
ENV DEPLOY_ENV prod
ENV DRUPAL_DEPLOY_CONFIGURATION TRUE
ENV DRUPAL_REVERT_FEATURES TRUE
ENV DRUPAL_SITE_ID womacti
ENV DRUPAL_SITE_URI womenactivists.lib.unb.ca
ENV DRUPAL_SITE_UUID 2a45ae15-13ee-480c-8389-177be66b8d67
ENV DRUPAL_CONFIGURATION_EXPORT_SKIP devel

# Add nginx and PHP conf.
COPY package-conf/nginx/app.conf /etc/nginx/conf.d/app.conf
COPY package-conf/php/app-php.ini /etc/php7/conf.d/zz_app.ini
COPY package-conf/php/app-php-fpm.conf /etc/php7/php-fpm.d/zz_app.conf

# Remove upstream build and replace it with ours.
RUN rm -rf ${TMP_DRUPAL_BUILD_DIR} && \
  mkdir -p ${TMP_DRUPAL_BUILD_DIR}
COPY build/ ${TMP_DRUPAL_BUILD_DIR}

# Deploy the generalized profile and makefile into our specific one.
RUN mv ${TMP_DRUPAL_BUILD_DIR}/profile/profile.info.yml ${TMP_DRUPAL_BUILD_DIR}/profile/${DRUPAL_SITE_ID}.info.yml && \
  mv ${TMP_DRUPAL_BUILD_DIR}/profile/profile.install ${TMP_DRUPAL_BUILD_DIR}/profile/${DRUPAL_SITE_ID}.install && \
  mv ${TMP_DRUPAL_BUILD_DIR}/profile/profile.profile ${TMP_DRUPAL_BUILD_DIR}/profile/${DRUPAL_SITE_ID}.profile && \
  find ${TMP_DRUPAL_BUILD_DIR}/profile/ -type f -print0 | xargs -0 sed -i "s/PROFILE_SLUG/$DRUPAL_SITE_ID/g" && \
  mv ${TMP_DRUPAL_BUILD_DIR}/profile ${TMP_DRUPAL_BUILD_DIR}/${DRUPAL_SITE_ID}

# Drush-make the site.
ENV DRUSH_MAKE_TMPROOT ${TMP_DRUPAL_BUILD_DIR}/webroot
RUN drush make --concurrency=${DRUSH_MAKE_CONCURRENCY} --yes ${DRUSH_MAKE_OPTIONS} "${TMP_DRUPAL_BUILD_DIR}/make.yml" ${DRUSH_MAKE_TMPROOT} && \
  mv ${TMP_DRUPAL_BUILD_DIR}/${DRUPAL_SITE_ID} ${DRUSH_MAKE_TMPROOT}/profiles/ && \
  mkdir -p ${DRUSH_MAKE_TMPROOT}/sites/all && \
  mv ${TMP_DRUPAL_BUILD_DIR}/settings ${DRUSH_MAKE_TMPROOT}/sites/all/ && \
  rm -rf ~/.drush/*

# NewRelic
ENV NEWRELIC_PHP_VERSION 6.5.0.166
ENV NEWRELIC_PHP_ARCH musl
ENV NEWRELIC_PHP_BASE_FILE newrelic-php5-${NEWRELIC_PHP_VERSION}-linux
ENV NEWRELIC_DOWNLOAD_FILE ${NEWRELIC_PHP_BASE_FILE}-musl.tar.gz
ENV NEWRELIC_DOWNLOAD_URI http://download.newrelic.com/php_agent/release/${NEWRELIC_DOWNLOAD_FILE}
ENV NR_INSTALL_SILENT true
RUN mkdir -p /opt/newrelic && \
  cd /opt/newrelic && \
  wget ${NEWRELIC_DOWNLOAD_URI} -O /opt/newrelic/${NEWRELIC_DOWNLOAD_FILE} && \
  tar -zxf ${NEWRELIC_DOWNLOAD_FILE} && \
  cd /opt/newrelic/${NEWRELIC_PHP_BASE_FILE}-${NEWRELIC_PHP_ARCH} && \
  sh newrelic-install install

# Scripts
COPY ./scripts/container /scripts

# Configuration
COPY ./config-yml ${TMP_DRUPAL_BUILD_DIR}/config-yml

# Custom modules not tracked in github.
COPY ./custom/modules ${TMP_DRUPAL_BUILD_DIR}/custom_modules
COPY ./custom/themes ${TMP_DRUPAL_BUILD_DIR}/custom_themes

# Tests
COPY ./tests/behat.yml ${TMP_DRUPAL_BUILD_DIR}/behat.yml
COPY ./tests/features ${TMP_DRUPAL_BUILD_DIR}/features
