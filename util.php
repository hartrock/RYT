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

// from http://de3.php.net/manual/en/function.filectime.php#88670
// depth: if dir, go into it as long as depth > 0
// if there is no file, ret dir mtime; if there is no dir, ret 0
function mtime_fileOrDir($path, $depth)
{
  if (! file_exists($path)) {
    return 0;
  }
  $ret = filemtime($path); // get mtime of dir for deleted files in it
  if (is_file($path) || ! $depth) {
    return $ret; // 0 if not existing
  }
  foreach (glob($path."/*") as $fn) {
    $mtime = mtime_fileOrDir($fn, $depth - 1);
    if ($mtime > $ret) {
      $ret = $mtime;   
    }
  }
  return $ret;   
}
// from http://de3.php.net/manual/en/function.header.php#85146
function try304_file($filePath)
{
  $last_modified_time = mtime_fileOrDir($filePath, 1);
  if ($last_modified_time) {
    header("Last-Modified: ".gmdate("D, d M Y H:i:s", $last_modified_time)
           ." GMT");
  } else {
    $last_modified_time = 'undefined';
  }
  /*
  $etag = md5_file($filePath);
  if ($etag) {
    header("Etag: $etag");
  } else {
    $etag = 'undefined';
  }
  */
  if (@strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) == $last_modified_time) {
    // does not work well with dirs:
    //   || trim($_SERVER['HTTP_IF_NONE_MATCH']) == $etag) {
    header("HTTP/1.1 304 Not Modified");
    exit;
  } 
}

function getTimezone($offset)
{
  /* taken from:
     http://de.php.net/manual/de/function.date-default-timezone-set.php#107297
  */
  /*
    var d = new Date()
    var offset= -d.getTimezoneOffset()/60;
    location.href = "<?php echo $_SERVER['PHP_SELF']; ?>?offset="+offset;
  */
  $zonelist = array('Kwajalein' => -12.00, 'Pacific/Midway' => -11.00, 'Pacific/Honolulu' => -10.00, 'America/Anchorage' => -9.00, 'America/Los_Angeles' => -8.00, 'America/Denver' => -7.00, 'America/Tegucigalpa' => -6.00, 'America/New_York' => -5.00, 'America/Caracas' => -4.30, 'America/Halifax' => -4.00, 'America/St_Johns' => -3.30, 'America/Argentina/Buenos_Aires' => -3.00, 'America/Sao_Paulo' => -3.00, 'Atlantic/South_Georgia' => -2.00, 'Atlantic/Azores' => -1.00, 'Europe/Dublin' => 0, 'Europe/Belgrade' => 1.00, 'Europe/Minsk' => 2.00, 'Asia/Kuwait' => 3.00, 'Asia/Tehran' => 3.30, 'Asia/Muscat' => 4.00, 'Asia/Yekaterinburg' => 5.00, 'Asia/Kolkata' => 5.30, 'Asia/Katmandu' => 5.45, 'Asia/Dhaka' => 6.00, 'Asia/Rangoon' => 6.30, 'Asia/Krasnoyarsk' => 7.00, 'Asia/Brunei' => 8.00, 'Asia/Seoul' => 9.00, 'Australia/Darwin' => 9.30, 'Australia/Canberra' => 10.00, 'Asia/Magadan' => 11.00, 'Pacific/Fiji' => 12.00, 'Pacific/Tongatapu' => 13.00);
  $index = array_keys($zonelist, $offset);
  return $index[0];
}
function setDefaultTimezone($offset) {
  date_default_timezone_set(getTimezone($offset));
}

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
