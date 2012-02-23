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

  // geometrics
  function Point(x, y) { // NaN visible in Point
    this.x = x;
    this.y = y;
  };
  Point.xy = function (x, y) {
    return new Point(x,y);
  };
  Point._zero = new Point(0,0);
  Point.zero = function () {
    return this._zero;
  };
  var protoPoint = Point.prototype;
  protoPoint.toString = function () {
    return "Point(" + this.x + "," + this.y + ")";
  };
  protoPoint.reversed = function (p) {
    return new Point(-this.x, -this.y);
  };
  protoPoint.max = function (p) {
    return new Point(Math.max(this.x, p.x), Math.max(this.y, p.y));
  };
  protoPoint.min = function (p) {
    return new Point(Math.min(this.x, p.x), Math.min(this.y, p.y));
  };
  protoPoint.equals = function (other) {
    return this === other || (this.x === other.x && this.y === other.y);
  };
  protoPoint.add = function (p) {
    return new Point(this.x + p.x, this.y + p.y);
  };
  protoPoint.sub = function (p) {
    return new Point(this.x - p.x, this.y - p.y);
  };
  protoPoint.abs = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };
  protoPoint.absSquared = function () { // cheaper for just knowing which is shorter
    return this.x * this.x + this.y * this.y;
  };
  protoPoint.unit = function () {
    var len = this.abs();
    return new Point(this.x/len, this.y/len);
  };
  protoPoint.orthogonal = function () {
    return new Point(-this.y, this.x); // math left turn; or right: (y, -x)
  };
  protoPoint.mul = function (factor) { // changes vec len by factor
    return new Point(this.x * factor, this.y * factor);
  };
  protoPoint.scalarProd = function (other) {
    return this.x * other.x + this.y * other.y;
  };
  protoPoint.toFixed = function (num) { // for path expressions
    return this.x.toFixed(num) + " " + this.y.toFixed(num);
  };
  protoPoint.lessEqual2 = function (aPoint) {
    return this.x <= aPoint.x && this.y <= aPoint.y;
  };
  protoPoint.greaterEqual2 = function (aPoint) {
    return this.x >= aPoint.x && this.y >= aPoint.y;
  };
  protoPoint.quadrant = function () { // http://de.wikipedia.org/wiki/Quadrant
    /*
    Quadrant		I	II	III	IV
    x-Koordinate	> 0	< 0	< 0	> 0
    y-Koordinate	> 0	> 0	< 0	< 0
    */
    // gives also quadrants for points at axes
    return (this.x > 0
            ? (this.y > 0 ? 1 : 4)
            : (this.y > 0 ? 2 : 3));
  };
  // worse in profiler (probably arr to small)
  protoPoint.toFixedAlt = function (num) { // for path expressions
    return [this.x.toFixed(num), this.y.toFixed(num)].join(" ");
  };
  // SVG path conversions
  protoPoint.to_SVG = function (prefix) {
    return prefix+this.x+' '+this.y;
  };
  protoPoint.to_M = function () {
    return this.to_SVG('M');
  };
  protoPoint.to_L = function () {
    return this.to_SVG('L');
  };
  // computes center of (0,0) touching circle in direction of this
  protoPoint.centerOfTouchingCircle = function (radius) {
    return this.unit().mul(radius);
  };

  function Rect(origin, extent) {
    this._origin = origin;
    this._extent = extent;
  };
  Rect.originExtent = function(origin, extent) {
    return new Rect(origin, extent);
  };
  Rect.originCorner = function(origin, corner) {
    return new Rect(origin, corner.sub(origin));
  };
  var protoRect = Rect.prototype;
  protoRect.toString = function () {
    return "Rect(" + "origin: " + this._origin + ", extent: " + this._extent + ")";
  };
  protoRect.equals = function (other) { // comparison with null -> false
    return (this === other // shortcut
            || (other // guard (may be null)
                && this._origin.equals(other._origin) && this._extent.equals(other._extent)));
  };
  protoRect.top = function () {
    return this._origin.y;
  };
  protoRect.bottom = function () {
    return this._origin.y + this._extent.y;
  };
  protoRect.left = function () {
    return this._origin.x;
  };
  protoRect.right = function () {
    return this._origin.x + this._extent.x;
  };
  protoRect.origin = function () {
    return this._origin;
  };
  protoRect.extent = function () {
    return this._extent;
  };
  protoRect.corner = function () {
    return this._origin.add(this._extent);
  };
  protoRect.topLeft = protoRect.origin;
  protoRect.topRight = function () {
    return new Point(this.right(), this.top());
  };
  protoRect.bottomLeft = function () {
    return new Point(this.left(), this.bottom());
  };
  protoRect.bottomRight = protoRect.corner;
  protoRect.center = function () {
    return new Point(this._origin.x + this._extent.x/2, this._origin.y + this._extent.y/2);
  };
  protoRect.centerTop = function() {
    return new Point(this._origin.x + this._extent.x/2, this._origin.y);
  };
  protoRect.centerBottom = function() {
    return new Point(this._origin.x + this._extent.x/2, this._origin.y + this._extent.y);
  };
  protoRect.centerLeft = function() {
    return new Point(this._origin.x, this._origin.y + this._extent.y/2);
  };
  protoRect.centerRight = function() {
    return new Point(this._origin.x + this._extent.x, this._origin.y + this._extent.y/2);
  };
  protoRect.width = function() {
    return this._extent.x;
  };
  protoRect.height = function() {
    return this._extent.y;
  };

  protoRect.containsPoint = function (point) {
    return point.greaterEqual2(this._origin) && point.lessEqual2(this.corner());
  };
  protoRect.containsRect = function (rect) {
    return this.containsPoint(rect.origin()) && this.containsPoint(rect.corner());
  };
  protoRect.corner = function (point) {
    return this._origin.add(this._extent);
  };
  protoRect.intersection = function (other) {
    var origin = this._origin.max(other._origin);
    var extent = this.corner().min(other.corner()).sub(origin);
    return (extent.x < 0 || extent.y < 0) ? null : new Rect(origin, extent);
  };
  protoRect.intersects = function (other) {
    return this.intersection(other) !== null;
  };
  protoRect.intersectsArea = function (other, minArea) {
    var intersection = this.intersection(other);
    return intersection && intersection.area() > (minArea ? minArea : 0);
  };
  protoRect.union = function (other) {
    var origin = this._origin.min(other._origin);
    return new Rect(origin, this.corner().max(other.corner()).sub(origin));
  };
  protoRect.area = function () {
    return this._extent.x * this._extent.y;
  };
  protoRect.withBorderAround = function (border) {
    return new Rect(new Point(this._origin.x - border, this._origin.y - border),
                    new Point(this._extent.x + 2 * border, this._extent.y + 2 * border));
  };

  // screen coordinate system is different from maths one!
  protoRect.borderLinesOfQuadrant = function (quadrant) {
    var loc, dirV, dirH; // direction vecs
    switch (quadrant) {
    case 1:
      loc = this.bottomRight(); // corner of quadrant
      dirH = loc.sub(this.bottomLeft());
      dirV = loc.sub(this.topRight());
      break;
    case 2:
      loc = this.bottomLeft(); // corner of quadrant
      dirH = loc.sub(this.bottomRight());
      dirV = loc.sub(this._origin); // _origin: topLeft()
      break;
    case 3:
      loc = this._origin; // corner of quadrant (topLeft())
      dirH = loc.sub(this.topRight());
      dirV = loc.sub(this.bottomLeft());
      break;
    case 4:
      loc = this.topRight(); // corner of quadrant
      dirH = loc.sub(this._origin); // _origin: topLeft()
      dirV = loc.sub(this.bottomRight());
      break;
    default:
      return null; // something has been wrong
    }
    return { horizontal: Line.locDir(loc, dirH), vertical: Line.locDir(loc, dirV) };
  };

  // Line computations (http://www.macfunktion.ch/mathe/geraden/koordinatengl.html)
  // The general A,B,C representation is good for easy handling of special cases - e.g. intersection of lines in parallel -:
  // therfore a way to come from loc/dir representation to the equation coefficients A,B,C had to be found
  // (especially the - now easy and efficient - computation of C has taken a while).
  function Line(A,B,C) {
    this.A = A; this.B = B; this.C = C;
  };
  Line.equationABC = function (A, B, C) {
    return new Line(A, B, C);
  };
  Line.locDir = function (locV, directionV) { // line goes through locV in directionV vec
    if (directionV.equals(Point._zero)) {
      return null; // not suited as direction vec
    }
    var normVec = directionV.orthogonal();
    var C = -locV.scalarProd(normVec); // negated scalar product; C becomes zero for lines through origin
    return new Line(normVec.x, normVec.y, C);
  };
  Line.dir = function (dir) { // line goes along (Point interpreted as) direction vec through origin
    return this.locDir(Point._zero, dir);
  };
  var protoLine = Line.prototype;
  protoLine.toString = function () {
    return "Line(A:" + this.A + ",B:" + this.B + ",C:" + this.C + ")";
  };
  protoLine.intersection = function (other) {
    var divisor = this.A * other.B - other.A * this.B;
    if (divisor === 0) { // no intersection
      return null;
    }
    return new Point((this.B * other.C - other.B * this.C) / divisor,
                     (this.C * other.A - other.C * this.A) / divisor);
  };

  function rectBehindRectTranslation(rFixed, rToBeMoved, dir) {
    var fixedLines = rFixed.borderLinesOfQuadrant(dir.quadrant());
    var moveLines = rToBeMoved.borderLinesOfQuadrant(dir.reversed().quadrant());
    var dirLine = Line.locDir(Point._zero, dir); // line crossing other ones in move direction
    var iF_H = dirLine.intersection(fixedLines.horizontal);
    var iF_V = dirLine.intersection(fixedLines.vertical);
    var iM_H = dirLine.intersection(moveLines.horizontal);
    var iM_V = dirLine.intersection(moveLines.vertical);
    var translationH = iF_H && iF_H.sub(iM_H);
    var translationV = iF_V && iF_V.sub(iM_V);
    // a translation may be null for move dir in parallel to an axis
    return (!translationH
            ? translationV
            : (!translationV
               ? translationH
               : (translationH.absSquared() < translationV.absSquared()
                  ? translationH
                  : translationV)));
  };


  // exports

  eg.Point = Point;
  eg.Rect = Rect;
  eg.Line = Line;
  eg.rectBehindRectTranslation = rectBehindRectTranslation; // better name?

}(EvolGo));
