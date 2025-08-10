FROM nginx:1.25.3-alpine

LABEL maintainer="ft_transcendence"

# Installer les dépendances nécessaires
RUN apk add --no-cache git build-base libxml2-dev pcre-dev curl-dev \
    linux-headers autoconf automake libtool zlib-dev cmake \
    libmaxminddb-dev yajl-dev geoip-dev

# Télécharger et compiler ModSecurity v3
WORKDIR /opt
RUN git clone --depth 1 -b v3.0.10 https://github.com/SpiderLabs/ModSecurity \
 && cd ModSecurity \
 && git submodule init \
 && git submodule update \
 && ./build.sh \
 && ./configure \
 && make \
 && make install

# Télécharger et compiler le connecteur ModSecurity-nginx
RUN git clone --depth 1 https://github.com/SpiderLabs/ModSecurity-nginx.git

# Télécharger nginx
RUN curl -O http://nginx.org/download/nginx-1.25.3.tar.gz \
 && tar zxvf nginx-1.25.3.tar.gz

# Recompiler nginx avec le module ModSecurity
RUN cd nginx-1.25.3 \
 && ./configure --with-compat --add-dynamic-module=../ModSecurity-nginx \
 && make modules \
 && cp objs/ngx_http_modsecurity_module.so /etc/nginx/modules/

# Configuration de base
COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY conf/modsecurity.conf /opt/ModSecurity/modsecurity.conf
RUN git clone --depth=1 https://github.com/coreruleset/coreruleset.git /opt/owasp-crs \
 && cp /opt/owasp-crs/crs-setup.conf.example /opt/owasp-crs/crs-setup.conf
RUN mkdir -p /var/log/modsecurity && \
    touch /var/log/modsecurity/modsec_audit.log /var/log/modsecurity/debug.log

RUN mkdir -p /usr/share/nginx/html

