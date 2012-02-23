function testIt() {
  var eg = EvolGo;
  var os = eg.createObjectStore();
  var transactionS = [];
  var props_one = { name: "one", first: 1, second: 2, third: 3 };
  var props_two = { name: "two", first: 1, second: 2, third: 3 };
  os.openBatch();
  os.create("one", props_one);
  os.create("two", props_two);
  os.closeBatch();
  transactionS.push(os.pullTransaction());
  os.openBatch();
  os.change("one", { name: "one_changed", first: "one" });
  os.closeBatch();
  transactionS.push(os.pullTransaction());
  os.openBatch();
  os.change("one", { first: undefined });
  os.closeBatch();
  transactionS.push(os.pullTransaction());
  os.openBatch();
  os.delete("two");
  os.closeBatch();
  transactionS.push(os.pullTransaction());

  return { os: os, transactionS: transactionS };
}


/*
var eg = EvolGo;
var res = testIt();
var os = res.os;
var transactionS = res.transactionS;
var om = os.getObjectMap();
//eg.log(om, om.one);
eg.log((JSON.stringify(om)));

os.undoTransaction(transactionS[transactionS.length - 1]);
eg.log((JSON.stringify(om)));

var os2 = eg.createObjectStore();
var trans = os2.sumTransactions(transactionS);
os2.doTransaction(trans);
//os2.getObjectMap()
eg.log("os2:", (JSON.stringify(os2.getObjectMap())));
os2.undoTransaction(transactionS[transactionS.length - 1]);
eg.log("os2:", (JSON.stringify(os2.getObjectMap())));
os2.doTransaction(transactionS[transactionS.length - 1]);
eg.log("os2:", (JSON.stringify(os2.getObjectMap())));
*/
