<?php
$is = NULL;
$os = NULL;
function cleanup() {
  if ($is) {
    fclose($is);
  }
  if ($os) {
    fclose($os);
  }
}
function httpError($msg, $httpCode) {
  header('X-Error: '.$msg, true, $httpCode);
  cleanup();
  die();
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  /* Access control does not work as expected... */
  if ($_SERVER['HTTP_ORIGIN'] == 'null'
      || $_SERVER['HTTP_ORIGIN'] == 'http://klara') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: X-data-ident, Content-Type');
    header('Access-Control-Max-Age: 3600000');
    header('Content-Length: 0');
    header('Content-Type: text/plain');
  } else {
    /* header('HTTP/1.1 403 Access Forbidden'); */
    /*header('Content-Type: text/plain');*/
    httpError('You cannot repeat this request', 403);
  }
  return;
 }
$fn = $_SERVER['HTTP_X_DATA_IDENT'];
if (! $fn) {
  httpError('data identifier missing', 400);
  return;
 }
header('X-data-ident: '.$fn);
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  header('Content-Type: application/json; charset=UTF-8');
  /* header('Content-Type: text/plain; charset=UTF-8'); */
  $is = @fopen('Data/'.$fn,'r');
  if (! $is) {
    httpError('cannot open input stream', 500);
  }
  $os = @fopen('php://output','w');
  if (! $os) {
    httpError('cannot open output stream', 500);
  }
  $writtenBytes = @stream_copy_to_stream($is, $os);
  /* cannot change headers from here: switch to buffered output? */
 } else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $is = @fopen('php://input','r');
  if (! $is) {
    httpError('cannot open input stream', 500);
  }
  $os = @fopen('Data/'.$fn,'w');
  if (! $os) {
    httpError('cannot open output stream', 500);
  }
  $writtenBytes = @stream_copy_to_stream($is, $os);
  header('X-stored-bytes: '.$writtenBytes);
  cleanup();
 } else {
  httpError('request method not allowed', 400);
 }
?>
