Roll Your Tasks (RYT)
=====================

License
-------
Licensed AGPL: see agpl_short.txt (copyright and reference to license)
and agpl.txt (referenced full license).


Install
-------

Needed: a local web server.

0. Repository: Use HEAD of master branch; git pull origin master, if not cloned just now.

1. Config web server to work with PHP5 scripts: examples are in
  ConfigExamples/
.

2. Create your own config.src:
  cp ConfigExamples/config.src.example config.src
and edit at least its 'Mandatory' section (explanations therein).
Note: you *have* to edit it!

3. Use Makefile:
  make install
. If all goes OK, you should see URLs for starting RYT.

4. Have fun!

More info is available via
  http://www.evolgo.de/RYT/app.html?key=1395a3b3-c006-4f9e-9359-b073e2eb455b&project=[installation]&element=sr_1330290330348_1_3
.


Problems and Feedback
---------------------
If there are problems or not, RYT developer may be contacted via starting RYT
  http://www.evolgo.de/RYT/app.html
and selecting menu entry
  '?'->'Feedback', or
  '?'->'About'
.
Feedback can help to improve the documentation.
