// Timer
var Timer = function (name) {
  this.name = name;
};
Timer.prototype.start = function () {
  this.stopTime = null; // clear to avoid invalid measurements
  this.startTime = new Date();
  return this;
};
Timer.prototype.stop = function () {
  this.stopTime = new Date();
  return this;
};
Timer.prototype.diff = function () {
  return this.stopTime - this.startTime;
};
function stats(timers, deviationLimitOrNil) {
  var i, sum, average, deviation;
  sum = 0;
  for (i = 0; i < timers.length; ++i) {
    sum += timers[i].diff();
  }
  average = sum / timers.length;
  ok ( true, "average time: " + average.toFixed(0)
       + "ms (Note: there may be a 15ms granularity...).");
  for (i = 0; i < timers.length; ++i) {
    deviation = (timers[i].diff() - average) / average;
    ok ( deviationLimitOrNil ? deviation < deviationLimitOrNil : true,
         timers[i].name + " used " + Math.abs(timers[i].diff())
         + "ms; deviation from average: "
         + (deviation > 0 ? "+" : "") + (deviation * 100).toFixed(0) + "%"
         + (deviationLimitOrNil ? " (abs < "
            + (deviationLimitOrNil * 100).toFixed(0) + "%)" : "")
         + "." );
  }
}

// Too much overhead for hardcore speed tests; e.g. isUndefined(arg).
Timer.timedLoop = function (name, func, loops, timers) {
  var timer = new Timer(name);
  var i;
  timers.push(timer);
  timer.start();
  for (i = 0; i < loops; ++i) {
    func();
  }
  timer.stop();
}

