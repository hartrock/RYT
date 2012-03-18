=====================
Roll Your Tasks (RYT)                  Time-stamp: "2012-03-18 00:41:20 CET sr"
=====================

Purpose
=======

RYT is a browser-based task management app for individuals and small groups.
More info:
  http://www.evolgo.de/RYT/
.

Features
========

For features from a user POV see
  http://www.evolgo.de/RYT/#SomeFeatures
  http://www.evolgo.de/RYT/app.html?project=[info]
.

Very few more technical ones
----------------------------
- the server is only used for storing Project data, all other computations are made solely in the browser -> this scales very well;
- data storage:
  - JSON format,
  - user data at server will be separated by automatically generated UUID keys for each project area (so there is no need for server-side user management),
  - data cached in local browser storage:
    -> reloading after save (needed for changed project name) does not involve server interaction;
- encryption (optional): if using an encrypted project area, data will be encrypted by browser *before* pushing it onto the server:
  -> no server load,
  -> data encrypted on the way to server.


License
=======

Licensed AGPL: see agpl_short.txt (copyright and reference to license)
and agpl.txt (referenced full license).


Install
=======

Needed: a local web server with PHP5.

0. Repository: Use HEAD of master branch; git pull origin master, if not cloned just now.

1. Config web server to work with PHP5 scripts and to have access to install
directories: examples are in
  ConfigExamples/
; some info about used dirs is in
  ConfigExamples/config.src.example
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
  http://www.evolgo.de/RYT/app.html?project=[installation]&element=sr_1330290330348_1_3
.


Problems and Feedback
=====================

If there are problems or not, RYT developer may be contacted via starting RYT
  http://www.evolgo.de/RYT/app.html
and selecting menu entry
  '?'->'Feedback', or
  '?'->'About'
.
Feedback can help to improve the documentation.
