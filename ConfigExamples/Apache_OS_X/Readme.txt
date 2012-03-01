OS X
----
Files
  sr.conf            from /etc/apache2/users/sr.conf ;
  httpd-userdir.conf from /etc/apache2/extra/httpd-userdir.conf
.


sr@klara:/etc/apache2$ diff httpd.conf.default httpd.conf
111c111
< #LoadModule php5_module libexec/apache2/libphp5.so
---
> LoadModule php5_module libexec/apache2/libphp5.so


System Preferences: Sharing -> Web Sharing : on
