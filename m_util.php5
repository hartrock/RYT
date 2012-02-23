<?php
/*
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

include 'util.php5';
function isMaintainanceForbidden()
{
  return ! is_file("maintenanceAllowed.flag");
}
function _createDirPaths($prefix, $currentLevel, $chars, $depth, $makeMissingDirsFlag)
{
  for($i = 0; $i < strlen($chars); ++$i) {
    $nextChar = substr($chars, $i, 1);
    $dir = $prefix."/".$nextChar;
    printbr($dir);
    if ($makeMissingDirsFlag && ! is_dir($dir)) {
      if (! mkdir($dir)) {
        die("mkdir failed");
      }
    }
    if ($currentLevel < $depth) {
      _createDirPaths($dir, $currentLevel+1, $chars, $depth, $makeMissingDirsFlag);
    }
  }
}
function createDirPaths($prefix, $chars, $depth, $makeMissingDirsFlag)
{
  printbr("prefix: ".$prefix.", chars: '".$chars."'");
  printbr("depth: ".$depth.", makeMissingDirsFlag: ".$makeMissingDirsFlag);
  if ($depth < 1 || $depth > 4) {
    die("invalid depth");
  }
  _createDirPaths($prefix ? $prefix : ".", 1, $chars, $depth, $makeMissingDirsFlag);
}
?>
