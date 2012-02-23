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

function printbr($str)
{
  print($str."<br />");
}
function dirPathForKey($key, $prefix, $depth)
{
  if (strlen($key) < $depth) {
    die("length of key < depth");
  }
  $dir = $prefix ? $prefix : ".";
  for($i = 0; $i < $depth; ++$i) {
    $nextDirChar = $key[$i];
    $dir .= "/".$nextDirChar;
  }
  return $dir;
}

// Arg locked gets locked file handle: it has to be unlocked later.
// Funcs call httpError(), if lock fails.
function openLockedForRead($filePath, &$locked)
{
  $fh = @fopen($filePath,'rb');
  if ($fh) {
    if (flock($fh, LOCK_SH)) { // do a shared lock
      $locked = $fh;
    } else {
      httpError('cannot create lock', 500);
    }
  }
  return $fh;
}
function openLockedForReadWriteTruncated($filePath, &$locked)
{
  $fh = @fopen($filePath,'a+b');
  if ($fh) {
    if (flock($fh, LOCK_EX)) { // do an exclusive lock
      $locked = $fh;
      ftruncate($fh, 0); // truncate file
    } else {
      httpError('cannot create lock', 500);
    }
  }
  return $fh;
}
function openLockedForWrite($filePath, &$locked)
{
  return openLockedForReadWriteTruncated($filePath, $locked);
}
function openLockedForReadCreate($filePath, &$locked)
{
  return openLockedForReadWriteTruncated($filePath, $locked);
}
?>
