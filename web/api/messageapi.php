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

if ($_GET['method'] == 'sendmessage') {
	insertHeader(1, false);
	if (!isset($_GET['comp']))
		echo ("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	elseif (!isset($_GET['dbid']))
		echo ("{\"status\": \"Error\", \"message\": \"dbid not set\"}");
	elseif (!isset($_GET['message']))
		echo ("{\"status\": \"Error\", \"message\": \"message not set\"}");
	else {
		$changed = time();
		$DNS = 0;
		$ecardChange = 0;
		$completed = 0;
		$newentry = 0;
		if (isset($_GET['dns']))
			$DNS = $_GET['dns'];
		if (isset($_GET['ecardchange']))
			$ecardChange = $_GET['ecardchange'];
		if (isset($_GET['completed']))
			$completed = $_GET['completed'];
		if (isset($_GET['newentry']))
			$newentry = $_GET['newentry'];
		$ret = Emma::SendMessage($_GET['comp'], $_GET['dbid'], $changed, $_GET['message'], $DNS, $ecardChange, $completed, $newentry);

		if ($ret > 0 && $ecardChange && isset($_GET['bib']))
			$ret = Emma::SetMessageEcardChecked($_GET['comp'], 0, $_GET['bib']);

		if ($ret > 0)
			echo ("{\"status\": \"OK\"}");
		else
			echo ("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
	}
} else if ($_GET['method'] == 'setcompleted') {
	insertHeader(1, false);
	if (!isset($_GET['messid']))
		echo ("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	if (!isset($_GET['completed']))
		echo ("{\"status\": \"Error\", \"message\": \"completed not set\"}");
	$ret = Emma::SetMessageCompleted($_GET['messid'], $_GET['completed']);

	if ($ret > 0)
		echo ("{\"status\": \"OK\"}");
	else
		echo ("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
} else if ($_GET['method'] == 'setdns') {
	insertHeader(1, false);
	if (!isset($_GET['messid']))
		echo ("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	if (!isset($_GET['dns']))
		echo ("{\"status\": \"Error\", \"message\": \"dns not set\"}");

	$ret = Emma::SetMessageDNS($_GET['messid'], $_GET['dns']);

	if ($ret > 0)
		echo ("{\"status\": \"OK\"}");
	else
		echo ("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
} else if ($_GET['method'] == 'setecardchange') {
	insertHeader(1, false);
	if (!isset($_GET['messid']))
		echo ("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	elseif (!isset($_GET['ecardchange']))
		echo ("{\"status\": \"Error\", \"message\": \"ecardchange not set\"}");
	else {
		$ret = Emma::SetMessageEcardChange($_GET['messid'], $_GET['ecardchange']);
		if ($ret > 0)
			echo ("{\"status\": \"OK\"}");
		else
			echo ("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
	}
} else if ($_GET['method'] == 'setecardchecked') {
	insertHeader(1, false);
	if (!isset($_GET['dbid']) && !isset($_GET['bib']))
		echo ("{\"status\": \"Error\", \"message\": \"dbid or bib not set\"}");
	elseif (!isset($_GET['comp']))
		echo ("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	else {
		$dbid = (isset($_GET['dbid']) ? $_GET['dbid'] : 0);
		$bib  = (isset($_GET['bib'])  ? $_GET['bib']  : 0);

		$ret = Emma::SetMessageEcardChecked($_GET['comp'], $dbid, $bib);
		if ($ret > 0)
			echo ("{\"status\": \"OK\"}");
		else
			echo ("{\"status\": \"Error\", \"message\": \"Error setting ecard change\" }");
	}
} else if ($_GET['method'] == 'setecardnotchecked') {
	insertHeader(1, false);
	if (!isset($_GET['dbid']) && !isset($_GET['bib']))
		echo ("{\"status\": \"Error\", \"message\": \"dbid or bib not set\"}");
	elseif (!isset($_GET['comp']))
		echo ("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	else {
		$dbid = (isset($_GET['dbid']) ? $_GET['dbid'] : 0);
		$bib  = (isset($_GET['bib'])  ? $_GET['bib']  : 0);

		$ret = Emma::SetMessageEcardNotChecked($_GET['comp'], $dbid, $bib);
		if ($ret > 0)
			echo ("{\"status\": \"OK\"}");
		else
			echo ("{\"status\": \"Error\", \"message\": \"Error setting ecard change\" }");
	}
} else if ($_GET['method'] == 'setnewentry') {
	insertHeader(1, false);
	if (!isset($_GET['messid']))
		echo ("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	elseif (!isset($_GET['newentry']))
		echo ("{\"status\": \"Error\", \"message\": \"newentry not set\"}");
	else {
		$ret = Emma::SetMessageNewEntry($_GET['messid'], $_GET['newentry']);
		if ($ret > 0)
			echo ("{\"status\": \"OK\"}");
		else
			echo ("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
	}
} else if ($_GET['method'] == 'setmessagedbid') {
	insertHeader(1, false);
	if (!isset($_GET['messid']))
		echo ("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	elseif (!isset($_GET['dbid']))
		echo ("{\"status\": \"Error\", \"message\": \"dbid not set\"}");
	else {
		$ret = Emma::SetMessageDBID($_GET['messid'], $_GET['dbid']);
		if ($ret > 0)
			echo ("{\"status\": \"OK\"}");
		else
			echo ("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
	}
} else if ($_GET['method'] == 'getmessages') {
	$currentComp = new Emma($_GET['comp']);
	$messages = $currentComp->getMessages();
	$RT = insertHeader($refreshTime);
	$isActive = $currentComp->IsCompActive();
	$ret = "";
	$first = true;
	$lastID = null;
	$groupCompleted = false;
	foreach ((array)$messages as $message) {
		$dbid      = $message['dbid'];
		$completed = $message['completed'];
		$changed   = $message['changed'];

		if ($dbid != $lastID || $dbid == 0) // New group 
		{
			$groupCompleted = $completed;
			$groupChanged   = $changed;
		}
		$bib     = ($message['bib']    != null ? $message['bib'] : 0);
		$ecard1  = ($message['ecard1'] != null ? $message['ecard1'] : 0);
		$ecard2  = ($message['ecard2'] != null ? $message['ecard2'] : 0);
		$start   = ($message['time']   != null ? formatTime($message['time'], 0, 0, $RunnerStatus) : "");
		$status  = ($message['status'] != null ? $message['status'] : 0);
		$name    = ($dbid == 0 ? "Generell melding" : ($message['name'] != null ? $message['name'] : ""));
		$club    = $message['club'];
		$class   = $message['class'];
		$msgtext = str_replace("\"", "\\\"", $message['message']);

		if ($dbid < 0 && $name == "")
			$name = strval(-$dbid) . " UKJENT";

		$lastID = $dbid;

		if (!$first)
			$ret .= ",$br";
		$ret .= "{\"messid\": " . $message['messid'] . ", \"dbid\": " . $dbid . ", \"changed\": \"" . $changed . "\", ";
		$ret .= "\"groupchanged\": \"" . $groupChanged . "\", \"message\": \"" . $msgtext . "\", ";
		$ret .=	"\"dns\": " . $message['dns'] . ", \"completed\": " . $completed . ", \"groupcompleted\": " . $groupCompleted . ", \"name\": \"" . $name . "\"";
		$ret .= ", \"bib\": " . $bib . ", \"club\": \"" . $club . "\", \"start\": \"" . $start . "\", \"status\": " . $status . ", \"class\": \"";
		$ret .= $class . "\", \"ecard1\": " . $ecard1 . ", \"ecard2\": " . $ecard2 . "}";

		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo ("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT, \"active\": $isActive}");
	else
		echo ("{ \"status\": \"OK\",$br \"messages\": [$br$ret$br],$br \"hash\": \"" . $hash . "\", \"rt\":$RT, \"active\": $isActive}");
} else if ($_GET['method'] == 'getdns') {
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$runners = $currentComp->getDNS();
	$ret = "";
	$first = true;
	foreach ((array)$runners as $runner) {
		$messid    = $runner['messid'];
		$dbid      = $runner['dbid'];
		$changed   = $runner['changed'];
		if (!$first)
			$ret .= ",$br";
		$ret .= "{\"messid\": " . $messid . ", \"dbid\": " . $dbid . ", \"changed\": \"" . $changed . "\"}";
		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo ("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
	else
		echo ("{ \"status\": \"OK\",$br \"dns\": [$br$ret$br],$br \"hash\": \"" . $hash . "\", \"rt\": $RT}");
} else if ($_GET['method'] == 'getecardchange') {
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$runners = $currentComp->getEcardChange();
	$ret = "";
	$first = true;
	foreach ((array)$runners as $runner) {
		$messid    = $runner['messid'];
		$dbid      = $runner['dbid'];
		$changed   = $runner['changed'];
		$name      = $runner['name'];
		$message   = str_replace("\\", "", $runner['message']);
		$message   = str_replace("\"", "", $message);

		if ($name != null)
			$ecard = (int) filter_var($name, FILTER_SANITIZE_NUMBER_INT);
		else if ($dbid < 0)
			$ecard = -$dbid;

		$bib   = (int) filter_var($message, FILTER_SANITIZE_NUMBER_INT);
		if (!$ecard || !$bib)
			continue;

		if (!$first)
			$ret .= ",$br";
		$ret .= "{\"messid\": " . $messid . ", \"dbid\": " . $dbid . ", \"changed\": \"" . $changed . "\", \"ecard\": \"" . $ecard . "\", \"bib\": \"" . $bib . "\"}";
		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo ("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
	else
		echo ("{ \"status\": \"OK\",$br \"ecardchange\": [$br$ret$br],$br \"hash\": \"" . $hash . "\", \"rt\": $RT}");
} else if ($_GET['method'] == 'getchanges') {
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);

	// Runners with ecard change
	$runnersEcard = $currentComp->getEcardChange();
	$retEcard = "";
	$first = true;
	foreach ((array)$runnersEcard as $runner) {
		$messid    = $runner['messid'];
		$dbid      = $runner['dbid'];
		$changed   = $runner['changed'];
		$name      = $runner['name'];
		$message   = str_replace("\\", "", $runner['message']);
		$message   = str_replace("\"", "", $message);

		if ($name != null)
			$ecard = (int) filter_var($name, FILTER_SANITIZE_NUMBER_INT);
		else if ($dbid < 0)
			$ecard = -$dbid;

		$bib   = (int) filter_var($message, FILTER_SANITIZE_NUMBER_INT);
		if (!$ecard || !$bib)
			continue;

		if (!$first)
			$retEcard .= ", ";
		$retEcard .= "{\"messid\": " . $messid . ", \"dbid\": " . $dbid . ", \"changed\": \"" . $changed . "\", \"ecard\": \"" . $ecard . "\", \"bib\": \"" . $bib . "\"}";
		$first = false;
	}

	// Runners with DNS
	$runnersDNS = $currentComp->getDNS();
	$retDNS = "";
	$first = true;
	foreach ((array)$runnersDNS as $runner) {
		$messid    = $runner['messid'];
		$dbid      = $runner['dbid'];
		$changed   = $runner['changed'];
		if (!$first)
			$retDNS .= ", ";
		$retDNS .= "{\"messid\": " . $messid . ", \"dbid\": " . $dbid . ", \"changed\": \"" . $changed . "\"}";
		$first = false;
	}

	// New entries
	$entries = $currentComp->getNewEntries();
	$retEntries = "";
	$first = true;
	foreach ((array)$entries as $entry) {
		$messid    = $entry['messid'];
		$dbid      = $entry['dbid'];
		$changed   = $entry['changed'];
		$message   = $entry['message'];
		if (!$first)
			$retEntries .= ", ";
		$retEntries .= "{\"messid\": " . $messid . ", \"dbid\": " . $dbid . ", \"entry\": " . $message . ", \"changed\": \"" . $changed . "\"}";
		$first = false;
	}

	// Return results
	$hash = MD5($retEcard . $retDNS . $retEntries);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo ("{\"status\": \"NOT MODIFIED\", \"rt\": $RT}");
	else
		echo ("{\"status\": \"OK\", \"ecardchange\": [$retEcard], \"dns\": [$retDNS], \"entry\": [$retEntries], \"hash\": \"" . $hash . "\", \"rt\": $RT}");
} else if ($_GET['method'] == 'getentrydata') {
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$isActive = $currentComp->IsCompActive();

	$clubs = $currentComp->getClubs();
	$first = true;
	$retClubs = "";
	foreach ((array)$clubs as $club) {
		$clubname  = str_replace("\\", "", $club['club']);
		$clubname  = str_replace("\"", "", $clubname);
		if (!$first)
			$retClubs .= ",";
		$retClubs .= "{\"name\": \"" . $clubname . "\"}";
		$first = false;
	}

	$vacants = $currentComp->getVacants();
	$first = true;
	$retVacants = "";
	foreach ((array)$vacants as $vacant) {
		$dbid	   = $vacant['dbid'];
		$bib	   = $vacant['bib'];
		$classname = $vacant['class'];
		$classid   = $vacant['classid'];
		if (!$first)
			$retVacants .= ",";
		$retVacants  .= "{\"dbid\": " . $dbid . ", \"bib\": " . $bib . ", \"class\": \"" . $classname . "\", \"classid\": \"" . $classid . "\"}";
		$first = false;
	}

	$ecards = $currentComp->getEcards();
	$first = true;
	$retEcards = "";
	foreach ((array)$ecards as $ecard) {
		$number = $ecard['ecard'];
		if (!$first)
			$retEcards .= ",";
		$retEcards .= "{$number}";
		$first = false;
	}

	// Return results
	$hash = MD5($retClubs . $retVacants . $retEcards);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo ("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT, \"active\": $isActive}");
	else
		echo ("{ \"status\": \"OK\", \"clubs\": [$retClubs], \"vacants\": [$retVacants], \"ecards\": [$retEcards], \"hash\": \"" . $hash . "\", \"rt\": $RT, \"active\": $isActive}");
} else if ($_GET['method'] == 'reservevacant') {
	$currentComp = new Emma($_GET['comp']);
	$classNameURI = $_GET['class'];
	$cancelID = $_GET['cancelid'];
	$className = urldecode($classNameURI);
	$RT = insertHeader(1);

	$reservedID = $currentComp->reserveVacant($className, $cancelID);
	if ($reservedID > 0)
		echo ("{\"status\": \"OK\", \"reservedID\": $reservedID}");
	else
		echo ("{\"status\": \"Error\", \"message\": \"Could not reserve vacant\"}");
} else if ($_GET['method'] == 'getnamefromecard') {
	$currentComp = new Emma($_GET['comp']);
	$ecard = $_GET['ecard'];
	$RT = insertHeader(1);
	$res = $currentComp->getnamefromecard($ecard);

	if ($res) {
		$res = $res[0];
		echo ("{\"status\": \"OK\", \"name\": \"" . $res['name'] . "\", \"comp\": \"" . $res['compname'] . "\", \"date\": \"" . $res['compdate'] . "\"}");
	} else
		echo ("{\"status\": \"Error\", \"message\": \"Could not get name\"}");
} else {
	insertHeader(1, false);
	$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
	header($protocol . ' ' . 400 . ' Bad Request');
	echo ("{ \"status\": \"ERR\", \"message\": \"No method given\"}");
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

function formatTime($time, $status, $code, &$RunnerStatus)
{
	global $lang;
	global $_FREESTART;

	if (($code != 0) && ($status != "0") && ($status != "9") && ($status != "10"))
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
	return urlRawDecode($raw_url_encoded);
}
