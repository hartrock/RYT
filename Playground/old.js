  // Because reversed path is seldom needed, it is not computed along with
  // standard path in Connector (whose computation happens very often).
  protoFE.reversePath = function (p) {
    var mp = p[0], cp = p[1];
    var rmp = ["M"];
    rmp.push(cp[cp.length-2], cp[cp.length-1]);
    var rcp = [cp[0]]; // more general as ["C"];
    for (var i = cp.length-2;
         i > 1; // ignore first: being "C" (or similar)
         --i, --i) { // reversed in 2-tuple
      rcp.push(cp[i-2], cp[i-1]);
    }
    rcp.push(mp[1], mp[2]);
    return [rmp, rcp];
  };
