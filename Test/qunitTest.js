<!-- with jquery: -->
<!-- $(document).ready(function(){ -->
<!-- without jquery: -->
window.onload = (function(){
/*
module("name");
  test("name", function() {
    ok( arg, "commentToOK"
        + " | ok( arg ) |" );
    deepEqual( 2args, "commentToDeepEqual"
               + " | deepEqual( 2args ) |" );
  });
*/
module("QUnit test infrastructure");

  test("array comparisons", function() {
    var arg1 = "one", arg2 = "two", arg3 = "three";
    deepEqual ( [ arg1, arg2, arg3 ], [ arg1, arg2, arg3 ],
                "different array ptrs, but *same* element ptrs: "
                + "| deepEqual( [ arg1, arg2, arg3 ], [ arg1, arg2, arg3 ] ) | " );
    // but
    notStrictEqual ( [ arg1, arg2, arg3 ], [ arg1, arg2, arg3 ],
                     "but: | notStrictEqual( [ arg1, arg2, arg3 ], [ arg1, arg2, arg3 ] ) | " );
    notEqual (       [ arg1, arg2, arg3 ], [ arg1, arg2, arg3 ],
                     "and: | notEqual( [ arg1, arg2, arg3 ], [ arg1, arg2, arg3 ] ) | " );
  });
  test("type conversion or not", function() {
    equal( '', false,
           "type conversion"
           + " | equal ( '' , false ) |");
    // but
    notStrictEqual( '', false,
                    "naturally: no type conversion"
                    + " | notStrictEqual ( '' , false ) |");
    notDeepEqual( '', false,
                  "interesting: *no* type conversion for *DeepEqual"
                  + " | notDeepEqual ( '' , false ) |");
  });


module("QUnit problems -> solved");

  test("not*Equal behavior", function () {
    strictEqual( "aString", "aString",
                 "[pseudo test] solved: same strings, and both will be shown"
                 + ': | strictEqual( "aString", "aString" ) |' );
    notStrictEqual( "aString", "aString",
                    "[pseudo test] solved: same strings, and both will be shown"
                    + ': | notStrictEqual( "aString", "aString" ) |' );
  });

}); // window.onload()
