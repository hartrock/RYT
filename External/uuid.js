// Author: George V. Reilly
// http://blogs.cozi.com/tech/2010/04/generating-uuids-in-javascript.html
// 'This code is licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php'

var UUID = {
 // Return a randomly generated v4 UUID, per RFC 4122
 uuid4: function()
 {
  return this._uuid(
    this.randomInt(), this.randomInt(),
    this.randomInt(), this.randomInt(), 4);
 },

 // Create a versioned UUID from w1..w4, 32-bit non-negative ints
 _uuid: function(w1, w2, w3, w4, version)
 {
  var uuid = new Array(36);
  var data = [
   (w1 & 0xFFFFFFFF),
   (w2 & 0xFFFF0FFF) | ((version || 4) << 12), // version (1-5)
   (w3 & 0x3FFFFFFF) | 0x80000000,    // rfc 4122 variant
   (w4 & 0xFFFFFFFF)
  ];
  for (var i = 0, k = 0; i < 4; i++)
  {
   var rnd = data[i];
   for (var j = 0; j < 8; j++)
   {
    if (k == 8 || k == 13 || k == 18 || k == 23) {
     uuid[k++] = '-';
    }
    var r = (rnd >>> 28) & 0xf; // Take the high-order nybble
    rnd = (rnd & 0x0FFFFFFF) << 4;
    uuid[k++] = this.hex.charAt(r);
   }
  }
  return uuid.join('');
 },

 hex: '0123456789abcdef',

 // Return a random integer in [0, 2^32).
 randomInt: function()
 {
  return Math.floor(0x100000000 * Math.random());
 }
};
