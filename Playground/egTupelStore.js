//  Copyright (C) 2012  Stephan Rudlof

// top level namespace objects: ensure their existence
var EvolGo = EvolGo || { };

(function(eg) { // namespace args at end, exports before them

  function createTupelS() {
    var tupels = {};
    var tupelCount = 0;
    var slotMaps = {};
    var slotNames = []; // for fast iteration about
    function addTuple(t, id) {
      eg.assert(! (id in tuples));
      t.TS_id = id; //THINK
      tupels[id] = t;
      this.addToSlotMaps(t);
      return t;
    }
    function computeSlotMap(name) {
      var map = {};
      eg.forEach(tupels, function(t, id) {
        if (name in t) {
          map[id] = t;
        }
      });
      return map;
    }
    function addToSlotMaps(t) {
      eg.forEach(slotMaps, function(map, sn) {
        if (sn in t) {
          map[t.id] = t;
        }
      });
    }
    function removeFromSlotMaps(t) {
      eg.forEach(slotMaps, function(map, sn) {
        if (sn in t) {
          delete map[t.id];
        }
      });
    }
    var tupelS = {
      generateId: function () {
        return ++tupelCount;
      },
      createTuple: function (props) {
        var t = eg.cloneProps(props);
        var id = generateId();
        addTuple(t, id);
        return t;
      },
      addSlotMap: function (name) {
        eg.assert(! name in slotMaps);
        slotMaps[name] = computeSlotMap(name);
        slotNames.push(name); // unclear if needed
      }
    };
    return tupelS;
  }

  // exports
  eg.createTupelS = createTupelS;

}(EvolGo));
