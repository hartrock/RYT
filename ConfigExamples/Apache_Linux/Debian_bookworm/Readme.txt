Debian bookworm
---------------
Files:
  /etc/apache2/mods-available/php8.2.conf
  /etc/apache2/mods-available/php8.2.load (unchanged)
,
  /etc/apache2/mods-available/userdir.conf
,
  /etc/apache2/sites-available/000-default.conf
  /etc/apache2/sites-available/ryt-ssl.conf
.

a2query -s
a2ensite ryt-ssl

a2enmod ssl
