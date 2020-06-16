FROM unblibraries/drupal:dockworker-2.x
MAINTAINER UNB Libraries <libsupport@unb.ca>

ARG COMPOSER_DEPLOY_DEV=no-dev
ENV DRUPAL_SITE_ID womacti
ENV DRUPAL_SITE_URI womenactivists.lib.unb.ca
ENV DRUPAL_SITE_UUID 2a45ae15-13ee-480c-8389-177be66b8d67

# Override upstream scripts with those from this repository.
COPY ./scripts/container /scripts

# Install additional OS packages.
ENV ADDITIONAL_OS_PACKAGES rsyslog postfix php7-ldap php7-redis
RUN /scripts/addOsPackages.sh && \
  echo "TLS_REQCERT never" > /etc/openldap/ldap.conf && \
  /scripts/initRsyslog.sh

# Add package configuration, build webtree.
COPY ./package-conf /package-conf
RUN /scripts/setupStandardConf.sh
COPY ./build /build
RUN /scripts/build.sh ${COMPOSER_DEPLOY_DEV} ${DRUPAL_BASE_PROFILE}

# Deploy repository assets.
COPY ./tests/ ${DRUPAL_TESTING_ROOT}/
COPY ./config-yml ${DRUPAL_CONFIGURATION_DIR}
COPY ./custom/themes ${DRUPAL_ROOT}/themes/custom
COPY ./custom/modules ${DRUPAL_ROOT}/modules/custom

# Metadata.
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
LABEL ca.unb.lib.generator="drupal8" \
      com.microscaling.docker.dockerfile="/Dockerfile" \
      com.microscaling.license="MIT" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.description="womenactivists.lib.unb.ca honours the work of Atlantic Canadian elder women activists in various societal arenas." \
      org.label-schema.name="womenactivists.lib.unb.ca" \
      org.label-schema.schema-version="1.0" \
      org.label-schema.url="https://womenactivists.lib.unb.ca" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/unb-libraries/womenactivists.lib.unb.ca" \
      org.label-schema.vendor="University of New Brunswick Libraries" \
      org.label-schema.version=$VERSION
