function Y (F) {
  return (function(x) {
    return F(function(y) {
      return x(x)(y);
    });
  })(function(x) {
    return F(function(y) {
      return x(x)(y);
    });
  });
}

var FactGen = function (fact) {
  return (function(n) {
    return (n == 0) ? 1 : n*fact(n-1);
  });
} ;

var res = Y(FactGen)(5);
console.log(res);


function(le) {
  return function(f) {
    return f(f);
  }(function(f) {
    return le(
      function(x) { return (f(f))(x); }
    );
  });
};
