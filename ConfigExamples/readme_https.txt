# [sr] mem how to enable https at some Debian system

# create self-signed certificate (avoid umlauts)
# - 10 years, no PW
openssl req -new -x509 -days 3650 -nodes -out ryt_server.crt -keyout ryt_server.key
chmod go-rwx ryt_server.key # priv key
mv ryt_server.crt /etc/ssl/certs/
mv ryt_server.key /etc/ssl/private/

# create ryt-ssl
cp /etc/apache2/sites-available/default-ssl.conf \
   /etc/apache2/sites-available/ryt-ssl.conf
# change in ryt-ssl:
	SSLCertificateFile    /etc/ssl/certs/ryt_server.crt
	SSLCertificateKeyFile /etc/ssl/private/ryt_server.key

a2ensite ryt-ssl
a2enmod ssl

systemctl restart apache2 # better than 'apachectl restart' (one PID left!)



#####################################

# What's the usecase here?
#
# rewrites (omitted after www.evolgo.de)
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

# mod
a2enmod rewrite

systemctl restart apache2
