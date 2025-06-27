Debian bookworm
---------------
Files:
  /etc/apache2/mods-available/php8.2.conf
  /etc/apache2/mods-available/php8.2.load (unchanged)
,
# contains specific RYT_UNAME user (to be adapted)
  /etc/apache2/mods-available/userdir.conf
,
# contain specific RYT_UNAME user (to be adapted)
  /etc/apache2/sites-available/000-default.conf
  /etc/apache2/sites-available/ryt-ssl.conf
.

mv /etc/apache2/mods-available/php8.2.conf \
   /etc/apache2/mods-available/php8.2.conf.orig
cp ./php8.2.conf \
   /etc/apache2/mods-available/php8.2.conf

mv /etc/apache2/mods-available/userdir.conf \
   /etc/apache2/mods-available/userdir.conf.orig
cp ./userdir.conf \
   /etc/apache2/mods-available/userdir.conf

mv /etc/apache2/sites-available/000-default.conf \
   /etc/apache2/sites-available/000-default.conf.orig
cp ./000-default.conf \
   /etc/apache2/sites-available/000-default.conf

#mv /etc/apache2/sites-available/ryt-ssl.conf \
#   /etc/apache2/sites-available/ryt-ssl.conf.orig
cp ./ryt-ssl.conf \
   /etc/apache2/sites-available/ryt-ssl.conf

# edit RYT_UNAME
emacs -nw /etc/apache2/mods-available/userdir.conf
emacs -nw /etc/apache2/sites-available/000-default.conf
emacs -nw /etc/apache2/sites-available/ryt-ssl.conf


a2query -s
a2ensite ryt-ssl

a2enmod userdir
a2enmod ssl
