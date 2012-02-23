/*!
 *  Roll Your Tasks (RYT)
 *  - mobile task management in the browser for individuals and small groups.
 *  Copyright (C) 2010-2012  Stephan Rudlof
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// top level namespace objects: ensure their existence
var EvolGo = EvolGo || { };

(function(eg) { // namespace args at end, exports before them

  // This is based on:
  //   http://www.cs.zju.edu.cn/people/yedeshi/Alinearspace-p341-hirschberg.pdf
  // .
  // Modifications:
  // - algos switched to zero-based matrix (instead of one-based one);
  // - errors fixed.

  // Algo B
  function BF(m, n, A, B) {
    var K1 = new Array(n+1);
    var K0 = new Array(n+1);
    var i, j;
    // 1. one more than matrix cols
    for (j = 0; j <= n; ++j) {
      K1[j] = 0;
    }
    // 2. matrix rows
    for (i = 0; i < m; ++i) { // Hirschfeld fixed: m, not n!
      // 3. one more than matrix cols
      for (j = 0; j <= n; ++j) {
        K0[j] = K1[j];
      }
      // 4.
      for (j = 0; j < n; ++j) { // matrix cols
        if (A[i] === B[j]) {
          K1[j+1] = K0[j] + 1;
        } else {
          K1[j+1] = Math.max(K1[j], K0[j+1]);
        }
      }
    }
    return K1; // LL
  }
  // Algo C
  function CF(m, n, A, B) {
    var i, j;
    var aStr;
    // 1.
    if (n === 0 || m === 0) { // H. fixed: m checked, too.
      return []; // C
    } else if (m === 1) {
      aStr = A[0];
      for (j = 0; j < n; ++j) {
        if (aStr === B[j]) {
          return [aStr]; // C
        }
      }
      return []; // C
    }
    // 2.
    i = (m / 2) >>> 0; // integer division
    // 3.
    var newA, newB;
    newA = A.slice(0, i);
    newB = B.slice(0, n);
    var L1 = BF(i, n, newA, newB);
    newA = A.slice(i, m).reverse();
    newB = B.slice(0, n).reverse();
    var L2 = BF(m - i, n, newA, newB);
    // 4. // find some max M and its first pos
    var M = 0, k = 0; // min
    var nextM;
    for (j = 0; j <= n; ++j) {
      nextM = Math.max(M, L1[j] + L2[n-j]);
      if (nextM > M) {
        M = nextM;
        k = j;
      }
    }
    //eg.log("L1:", L1, "L2:", L2, "k:", k);
    // 5.
    newA = A.slice(0, i);
    newB = B.slice(0, k);
    var first = CF(i, k, newA, newB);
    newA = A.slice(i, m);
    newB = B.slice(k, n);
    var second = CF(m-i, n-k, newA, newB); //clear until
    // 6.
    return first.concat(second); // C
  }

  function diffStringArrays(minus, plus) {
    var lcsStr, mStr, pStr;
    var chunks = [];
    var diffMinus = [], diffPlus = [];
    var equalMinus, equalPlus; // inited below
    var chunkCount = 0;
    var lcsIx = 0, mIx = 0, pIx = 0;
    var mLen = minus.length, pLen = plus.length;
    var lcs = CF(mLen, pLen, minus, plus);
    //eg.log(lcs);
    var lcsLen = lcs.length;
    lcsStr = lcs[0]; // may be undefined here, but not if entering while loop
    while (lcsIx < lcsLen) {
      // compute additional elems not in lcs
      for (; mIx < mLen && (mStr = minus[mIx]) !== lcsStr; ++mIx) {
        diffMinus.push([mStr, mIx]);
      }
      for (; pIx < pLen && (pStr = plus[pIx]) !== lcsStr; ++pIx) {
        diffPlus.push([pStr, pIx]);
      }
      if (diffMinus.length || diffPlus.length) {
        chunks.push({type: '!=', count: ++chunkCount,
                     '-': diffMinus, '+': diffPlus});
        diffMinus = []; diffPlus = [];
      }
      // add chunk of equal elems
      equalMinus = [], equalPlus = [];
      // one equal elem has to be there at least, otherwise we woudn't be here
      equalMinus.push([lcsStr, mIx]);
      equalPlus.push([lcsStr, pIx]);
      ++lcsIx; ++mIx; ++pIx; // inc here ..
      // add remaining equal ones with incrementing
      for (; lcsIx < lcsLen; ++lcsIx, ++mIx, ++pIx) { // .. or here, but ..
        lcsStr = lcs[lcsIx];
        if (lcsStr == minus[mIx] && lcsStr == plus[pIx]) {
          equalMinus.push([lcsStr, mIx]);
          equalPlus.push([lcsStr, pIx]);
          // .. only if equal in *both* arrs.
        } else {
          break; // does *not* increment indices, which is what we want
        }
      }
      chunks.push({type: '==', count: ++chunkCount,
                   '-': equalMinus, '+': equalPlus});
    } // while(): check for additional elems after entering loop again
    // add remaining elems after last or if none lcs entry (lcs may be empty)
    for (; mIx < mLen; ++mIx) {
      diffMinus.push([minus[mIx], mIx]);
    }
    for (; pIx < pLen; ++pIx) {
      diffPlus.push([plus[pIx],  pIx]);
    }
    if (diffMinus.length || diffPlus.length) {
      chunks.push({type: '!=', count: ++chunkCount,
                   '-': diffMinus, '+': diffPlus});
    }
    return chunks;
  } // diffStringArrays()
/* test:
var eg = EvolGo;
var a1 = ['foo', 'eins', 'zwei', 'drei'];
var a2 = ['bar', 'eins', 'zwei', 'dreie', 'drei', 'extra'];
eg.diffStringArrays(a1, a2)
*/

  var lineSepRE = /\r\n|\r|\n/;
  function lineDiff(text_1, text_2, sep) {
    var sep = (sep !== undefined && sep !== null
               ? sep // may be ''
               : lineSepRE
              );
    var arr_1 = text_1 ? text_1.split(sep) : [];
    var arr_2 = text_2 ? text_2.split(sep) : [];
    return diffStringArrays(arr_1, arr_2);
  } // lineDiff()
/* test:
var eg = EvolGo;
var t1 = 'foo\neins\nzwei\ndrei';
var t2 = 'bar\neins\nzwei\ndreie\ndrei\nextra';
eg.lineDiff(t1, t2)
*/

  function strDiff(s1, s2) {
    return lineDiff(s1, s2, '');
  }
/*
var eg = EvolGo;
var s1 = 'foo einser zweisam drei';
var s2 = 'foo eins zweier dreie drei extra';
eg.strDiff(s1, s2)
*/

  // exports
  eg.diffStringArrays = diffStringArrays;
  eg.lineDiff = lineDiff;
  eg.strDiff = strDiff;

}(EvolGo));
