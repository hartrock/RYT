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
module("moduleName");

  test("name", function() {
    ok( true, "commentToOK"
        + " | ok( true ) |" );
    strictEqual( 'eins', 'eins', "commentToDeepEqual"
                 + " | strictEqual( 'eins', 'eins' ) |" );
  });

}); // window.onload()
