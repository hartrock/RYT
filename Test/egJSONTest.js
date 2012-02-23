<!-- with jquery: -->
<!-- $(document).ready(function(){ -->
<!-- without jquery: -->
window.onload = (function(){
/*
module("name");
  test("name", function() {
    ok( arg, "commentToOK"
        + " | ok( arg ) |" );
    strictEqual( 2args, "commentToStrictEqual"
                 + " | strictEqual( 2args ) |" );
  });
*/
  var eg = EvolGo;

module("EvolGo.JSON");

  test("eg.JSON", function() {
    ok ( eg.isObjectNotNull(eg.JSON) && eg.isFunction(eg.JSON.stringify) && eg.isFunction(eg.JSON.parse),
         " | ok( eg.isObjectNotNull(eg.JSON) && eg.isFunction(eg.JSON.stringify) && eg.isFunction(eg.JSON.parse)" );
  });
  test("eg.JSON.stringify() with replacer", function() {
    var undef;
    var foo = { one:1, two:2, three:undef };
    function replacer(key, value) {
      if (key === 'one') {
        return true;
      }
      if (typeof value === 'undefined') {
        return null;
      }
      return value;
    }
    var res = eg.JSON.stringify(foo, replacer);
    var expectedStr = '{"one":true,"two":2,"three":null}';
    strictEqual( res, expectedStr, "replacer func works (bug for JSON object in FF 3.6.10)"
                 + " | strictEqual( res, " + JSON.stringify(expectedStr) + " ) |" );
  });

}); // window.onload()
