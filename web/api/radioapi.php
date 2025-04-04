<?php
date_default_timezone_set("Europe/Oslo");
if (isset($_GET['comp']) && !is_numeric($_GET['comp'])) {
	insertHeader(60, false);
	$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
	header($protocol . ' ' . 400 . ' Bad Request');
	echo ("{ \"status\": \"ERR\", \"message\": \"Wrong comp id\"}");
	return;
} else if (isset($_GET['comp']))
	$compid = $_GET['comp'];

$hightime = 60;
if ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost')
	$refreshTime = 2;
else
	$refreshTime = 5;
$lang = "no";
if (isset($_GET['lang']))
	$lang = $_GET['lang'];

include_once("../templates/emmalang_en.php");
include_once("../templates/emmalang_$lang.php");
include_once("../templates/classEmma.class.php");

$RunnerStatus = array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED, "0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "", "13" => $_STATUSFINISHED);

if (!isset($_GET['method']))
	$_GET['method'] = null;

$pretty = isset($_GET['pretty']);
$br = $pretty ? "\n" : "";

if ($_GET['method'] == 'getradiopassings') {
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$isActive = $currentComp->IsCompActive();
	$code = $_GET['code'];
	$maxNum = 100;

	if (isset($_GET['last_hash']))
		$lastUpdate = $_GET['last_hash']; // Use last hash to contain last update time
	else
		$lastUpdate = "";

	if (isset($_GET['minbib']))
		$minBib = $_GET['minbib']; // Use last hash to contain last update time
	else
		$minBib = "-99999999";

	if (isset($_GET['maxbib']))
		$maxBib = $_GET['maxbib']; // Use last hash to contain last update time
	else
		$maxBib = "99999999";

	$lastPassings = $currentComp->getRadioPassings($code, $lastUpdate, $maxNum);

	$first = true;
	$num = 0;
	$ret = "";
	$firstStarted = false;
	$lasttime = 0;
	$changedTime = "";
	foreach ((array)$lastPassings as $pass) {
		$num += 1;
		$age = time() - strtotime($pass['Changed']);
		$modified = $age < $hightime ? 1 : 0;

		$status = $pass['Status'];
		$time   = $pass['Time'];
		$control = $pass['Control'];

		if ($first)
			$changedTime = $pass['changedRaw'];
		else
			$ret .= ",$br";

		if ($status == 1 && $control = 100) {
			$pre = "<del>";
			$post = "</del>";
		} else {
			$pre = "";
			$post = "";
		}

		$ret .= "{\"passtime\": \"" . date("H:i:s", strtotime($pass['Changed'])) . "\",
				\"runnerName\": \"" . $pre . $pass['Name'] . $post . "\",
				\"dbid\": \"" . $pre . $pass['dbid'] . $post . "\",
				\"bib\": \"" . $pre . $pass['bib'] . $post . "\",
				\"club\": \"" . $pre . $pass['Club'] . $post . "\",
				\"class\": \"" . $pre . $pass['class'] . $post . "\",
				\"control\": " . $pass['Control'] . ",
				\"controlName\" : \"" . $pass['pname'] . "\",
				\"time\": \"" . $pre . formatTime($time, $status, $code, $RunnerStatus) . $post . "\",
				\"status\" : \"" . $pass['Status'] . "\",
				\"compName\": \"" . $pass['compName'] . "\"";

		// Left in forest
		if ($code == -2) {
			$timeDiff = -2;
			$rank = -1;
			$ret .= ",\"rank\": " . $rank . ",\"timeDiff\": " . $timeDiff;
			$ret .= ",\"checked\": " . ($pass["ecardchecked"] == 1 ? 1 : 0);
		}

		// All cases exept from left in forest. Use hash as last updated time
		else {
			if (($status == 0) || ($status == 9) || ($status == 10)) {
				$rankTime = $currentComp->getRankForSplitInClass($pass['class'], $pass['Control'], $time);
				$rank = $rankTime['rank'] + 1;
				if ($rank > 1)
					$timeDiff = $time - $rankTime['bestTime'];
				else if ($rank == 1) {
					// Query for second best time
					$secondBest = $currentComp->getSecondBestSplitInClass($pass['class'], $pass['Control']);
					if (count($secondBest) < 2)
						$timeDiff = -1;
					else
						$timeDiff = $time - $secondBest[1]['Time'];
				}
			} else {
				$rank = -1;
				$timeDiff = -1;
			}
			$ret .= ",\"rank\": " . $rank . ",\"timeDiff\": " . $timeDiff;
		}
		$ret .= "$br}";
		$first = false;
	}

	if ($code == -2) {
		$hash = MD5($ret);
		if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
			echo ("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT, \"active\": $isActive}");
		else
			echo ("{ \"status\": \"OK\", $br\"passings\" : [$br$ret$br],$br \"hash\": \"$hash\", \"rt\": $RT, \"active\": $isActive}");
	} else {
		if ($num == 0)
			echo ("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT, \"active\": $isActive}");
		else
			echo ("{ \"status\": \"OK\", $br\"passings\" : [$br$ret$br],$br \"hash\": \"$changedTime\", \"rt\": $RT, \"active\": $isActive}");
	}
} else {
	insertHeader($refreshTime, false);
	$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
	header($protocol . ' ' . 400 . ' Bad Request');
	echo ("{ \"status\": \"ERR\", \"message\": \"No method given\"}");
}

function formatTime($time, $status, $code, &$RunnerStatus)
{
	global $lang;
	global $_FREESTART;

	if (($status != "0") && ($status != "9") && ($status != "10"))
		return $RunnerStatus[$status]; //$status;

	if ($time == -999)
		return $_FREESTART;

	if ($time == -1)
		return "";

	if ($time < 0)
		return "*";

	else {
		if ($lang == "no" or $lang == "fi") {
			$hours = floor($time / 360000);
			$minutes = floor(($time - $hours * 360000) / 6000);
			$seconds = floor(($time - $hours * 360000 - $minutes * 6000) / 100);

			if ($hours > 0)
				return $hours . ":" . str_pad("" . $minutes, 2, "0", STR_PAD_LEFT) . ":" . str_pad("" . $seconds, 2, "0", STR_PAD_LEFT);
			else
				return $minutes . ":" . str_pad("" . $seconds, 2, "0", STR_PAD_LEFT);
		} else {
			$minutes = floor($time / 6000);
			$seconds = floor(($time - $minutes * 6000) / 100);
			return str_pad("" . $minutes, 2, "0", STR_PAD_LEFT) . ":" . str_pad("" . $seconds, 2, "0", STR_PAD_LEFT);
		}
	}
}

function insertHeader($refreshTime, $update = true)
{
	global $CHARSET;
	if ($update) {
		global $currentComp;
		$UF = $currentComp->GetUpdateFactor();
		$RT = round($refreshTime / $UF + 0.4); // Updated refresh time
	} else
		$RT = $refreshTime;

	header('content-type: application/json; charset=' . $CHARSET);
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Expose-Headers: Date');
	header('cache-control: max-age=' . ($RT - 1));
	header('Expires: ' . gmdate('D, d M Y H:i:s \G\M\T', time() + ($RT - 1)));

	return $RT;
}

function urlRawDecode($raw_url_encoded)
{
	# Hex conversion table
	$hex_table = array(
		0 => 0x00,
		1 => 0x01,
		2 => 0x02,
		3 => 0x03,
		4 => 0x04,
		5 => 0x05,
		6 => 0x06,
		7 => 0x07,
		8 => 0x08,
		9 => 0x09,
		"A" => 0x0a,
		"B" => 0x0b,
		"C" => 0x0c,
		"D" => 0x0d,
		"E" => 0x0e,
		"F" => 0x0f
	);

	# Fixin' latin character problem
	if (preg_match_all("/\%C3\%([A-Z0-9]{2})/i", $raw_url_encoded, $res)) {
		$res = array_unique($res = $res[1]);
		$arr_unicoded = array();
		foreach ((array)$res as $key => $value) {
			$arr_unicoded[] = chr(
				(0xc0 | ($hex_table[substr($value, 0, 1)] << 4))
					| (0x03 & $hex_table[substr($value, 1, 1)])
			);
			$res[$key] = "%C3%" . $value;
		}

		$raw_url_encoded = str_replace(
			$res,
			$arr_unicoded,
			$raw_url_encoded
		);
	}

	# Return decoded  raw url encoded data
	return rawurldecode($raw_url_encoded);
}
