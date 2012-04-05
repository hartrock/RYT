# [sr] mem how to enable https at some Debian system

# create self-signed certificate (avoid umlauts)
# - 10 years, no PW
openssl req -new -x509 -days 3650 -nodes -out ryt_server.crt -keyout ryt_server.key
chmod go-rwx ryt_server.key # priv key
mv ryt_server.crt /etc/ssl/certs/
mv ryt_server.key /etc/ssl/private/

# create ryt-ssl
cp /etc/apache2/sites-available/default-ssl \
   /etc/apache2/sites-available/ryt-ssl
# change in ryt-ssl:
	SSLCertificateFile    /etc/ssl/certs/ryt_server.crt
	SSLCertificateKeyFile /etc/ssl/private/ryt_server.key
cd /etc/apache2/sites-enabled
ln -s ../sites-available/ryt-ssl

# mods
cd /etc/apache2/mods-enabled
ln -s ../mods-available/ssl.load 
ln -s ../mods-available/ssl.conf
# rewrite engine
ln -s ../mods-available/rewrite.load


# rewrites
#

# create /etc/apache2/config.d/rewrite_SSL_NOSSL
+++
RewriteEngine on
RewriteRule ^/(.*)_SSL$ https://%{SERVER_NAME}/$1 [R,L]
RewriteRule ^/(.*)_NOSSL$ http://%{SERVER_NAME}/$1 [R,L]
+++
# add the following to <VirtualHost> configs in /etc/apache2/sites-enabled/*
+++
RewriteEngine On
RewriteOptions Inherit 
+++


apachectl restart



#####################################

# not needed (and read comments there!):
  # add to <IfModule mod_ssl.c> in /etc/apache2/ports.conf
      NameVirtualHost *:443
