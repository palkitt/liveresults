<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";
$compid   = $_GET['comp'];


if (isset($_GET['lang']))
	$lang = $_GET['lang'];

include_once("../templates/emmalang_en.php");
include_once("../templates/emmalang_$lang.php");
include_once("../templates/classEmma.class.php");

$RunnerStatus = Array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED,"0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "", "13" => $_STATUSFINISHED);

header('content-type: application/json; charset='.$CHARSET);
header('Access-Control-Allow-Origin: *');

if (!isset($_GET['method']))
    $_GET['method'] = null;

$pretty = isset($_GET['pretty']);
$br = $pretty ? "\n" : "";

if ($_GET['method'] == 'sendmessage')
{
	$changed = time();
	$DNS = 0;
	$ecardChange = 0;
	if (!isset($_GET['comp']))
		echo("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	if (!isset($_GET['dbid']))
		echo("{\"status\": \"Error\", \"message\": \"dbid not set\"}");
	if (!isset($_GET['message']))
		echo("{\"status\": \"Error\", \"message\": \"message not set\"}");
	if (isset($_GET['dns']))
		$DNS = $_GET['dns'];
	if (isset($_GET['ecardchange']))
		$ecardChange = $_GET['ecardchange'];
	$ret = Emma::SendMessage($_GET['comp'],$_GET['dbid'],$changed,$_GET['message'],$DNS,$ecardChange);

	if ($ret > 0)
		echo("{\"status\": \"OK\"}");
	else
		echo("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
}
else if ($_GET['method'] == 'setmessagecompleted')
{
	if (!isset($_GET['messid']))
		echo("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	if (!isset($_GET['completed']))
		echo("{\"status\": \"Error\", \"message\": \"completed not set\"}");
	$ret = Emma::SetMessageCompleted($_GET['messid'],$_GET['completed']);

	if ($ret > 0)
		echo("{\"status\": \"OK\"}");
	else
		echo("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
}
else if ($_GET['method'] == 'setmessagedns')
{
	if (!isset($_GET['messid']))
		echo("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	if (!isset($_GET['dns']))
		echo("{\"status\": \"Error\", \"message\": \"dns not set\"}");

	$ret = Emma::SetMessageDNS($_GET['messid'],$_GET['dns']);

	if ($ret > 0)
		echo("{\"status\": \"OK\"}");
	else
		echo("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
}
else if ($_GET['method'] == 'setmessageecardchange')
{
	if (!isset($_GET['messid']))
		echo("{\"status\": \"Error\", \"message\": \"messid not set\"}");
	if (!isset($_GET['ecardchange']))
		echo("{\"status\": \"Error\", \"message\": \"ecardchange not set\"}");

	$ret = Emma::SetMessageEcardChange($_GET['messid'],$_GET['ecardchange']);

	if ($ret > 0)
		echo("{\"status\": \"OK\"}");
	else
		echo("{\"status\": \"Error\", \"message\": \"Error adding message\" }");
}
else if ($_GET['method'] == 'getmessages')
{
	$currentComp = new Emma($_GET['comp']);
	$messages = $currentComp->getMessages();
	$ret = "";
	$first = true;
	$lastId = null;
	$groupCompleted = false;
	foreach ($messages as $message)
	{
		$dbid      = $message['dbid'];
		$completed = $message['completed'];
		$changed   = $message['changed'];
		
		if ($dbid != $lastID) // New runner 
		{
			$groupCompleted = $completed;
			$groupChanged   = $changed;
		}
		$bib    = ($message['bib']    != null ? $message['bib'] : 0);
		$ecard1 = ($message['ecard1'] != null ? $message['ecard1'] : 0);
		$ecard2 = ($message['ecard2'] != null ? $message['ecard2'] : 0);
		$start  = ($message['time']   != null ? formatTime($message['time'],0,0,$RunnerStatus) : "");
		$status = ($message['status'] != null ? $message['status'] : 0);
		$name   = ($dbid == 0 ? "Generell melding" : ($message['name'] != null ? $message['name'] : ""));
		$club   = $message['club'];
		$class  = $message['class'];

		if ($dbid<0 && $name=="")
			$name = -$dbid + " UKJENT";
		
		$lastID = $dbid;

		if (!$first)
			$ret .=",$br";
		$ret .= "{\"messid\": ".$message['messid'].", \"dbid\": ".$dbid.", \"changed\": \"".$changed."\", ";
		$ret .= "\"groupchanged\": \"".$groupChanged."\", \"message\": \"".$message['message']."\", ";
		$ret .=	"\"dns\": ".$message['dns'].", \"completed\": ".$completed.", \"groupcompleted\": ".$groupCompleted.", \"name\": \"".$name."\"";
		$ret .= ", \"bib\": ".$bib.", \"club\": \"".$club."\", \"start\": \"".$start."\", \"status\": ".$status.", \"class\": \"";
		$ret .= $class."\", \"ecard1\": ".$ecard1.", \"ecard2\": ".$ecard2."}";
		
		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo("{ \"status\": \"NOT MODIFIED\"}");
	else
		echo("{ \"status\": \"OK\",$br \"messages\": [$br$ret$br],$br \"hash\": \"". $hash."\"}");
}
else if ($_GET['method'] == 'getdns')
{
	$currentComp = new Emma($_GET['comp']);
	$runners = $currentComp->getDNS();
	$ret = "";
	$first = true;
	foreach ($runners as $runner)
	{
		$messid    = $runner['messid'];
		$dbid      = $runner['dbid'];
		$changed   = $runner['changed'];
		if (!$first)
			$ret .=",$br";
		$ret .= "{\"messid\": ".$messid.", \"dbid\": ".$dbid.", \"changed\": \"".$changed."\"}";
		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo("{ \"status\": \"NOT MODIFIED\"}");
	else
		echo("{ \"status\": \"OK\",$br \"dns\": [$br$ret$br],$br \"hash\": \"". $hash."\"}");
}
else if ($_GET['method'] == 'getecardchange')
{
	$currentComp = new Emma($_GET['comp']);
	$runners = $currentComp->getEcardChange();
	$ret = "";
	$first = true;
	foreach ($runners as $runner)
	{
		$messid    = $runner['messid'];
		$dbid      = $runner['dbid'];
		$changed   = $runner['changed'];
		$name      = $runner['name'];
		$message   = $runner['message'];

		$ecard = (int) filter_var($name, FILTER_SANITIZE_NUMBER_INT);
		$bib   = (int) filter_var($message, FILTER_SANITIZE_NUMBER_INT);
		if (!$ecard || !$bib)
			continue;

		if (!$first)
			$ret .=",$br";
		$ret .= "{\"messid\": ".$messid.", \"dbid\": ".$dbid.", \"changed\": \"".$changed."\", \"ecard\": \"".$ecard."\", \"bib\": \"".$bib."\"}";
		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo("{ \"status\": \"NOT MODIFIED\"}");
	else
		echo("{ \"status\": \"OK\",$br \"ecardchange\": [$br$ret$br],$br \"hash\": \"". $hash."\"}");
}
else
{
    $protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
    header($protocol . ' ' . 400 . ' Bad Request');
	echo("{ \"status\": \"ERR\", \"message\": \"No method given\"}");
}

function formatTime($time,$status,$code,& $RunnerStatus)
{
  global $lang;
  if ( ($code != 0) && ($status != "0") && ($status != "9") && ($status != "10"))
    return $RunnerStatus[$status]; //$status;

  if ($time < 0)
  	return "*";

  else 
  {
     if ($lang == "no" or $lang == "fi")
     {
        $hours = floor($time/360000);
        $minutes = floor(($time-$hours*360000)/6000);
        $seconds = floor(($time-$hours*360000 - $minutes*6000)/100);

        if ($hours > 0)
  	       return $hours .":" .str_pad("".$minutes,2,"0",STR_PAD_LEFT) .":".str_pad("".$seconds,2,"0",STR_PAD_LEFT);
        else
  	       return $minutes.":".str_pad("".$seconds,2,"0",STR_PAD_LEFT);
     }
	 else
     {
         $minutes = floor($time/6000);
         $seconds = floor(($time-$minutes*6000)/100);
         return str_pad("".$minutes,2,"0",STR_PAD_LEFT) .":".str_pad("".$seconds,2,"0",STR_PAD_LEFT);
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
        "A"=> 0x0a,
        "B"=> 0x0b,
        "C"=> 0x0c,
        "D"=> 0x0d,
        "E"=> 0x0e,
        "F"=> 0x0f
    );

    # Fixin' latin character problem
	if(preg_match_all("/\%C3\%([A-Z0-9]{2})/i", $raw_url_encoded,$res))
	{
		$res = array_unique($res = $res[1]);
		$arr_unicoded = array();
		foreach($res as $key => $value){
			$arr_unicoded[] = chr(
					(0xc0 | ($hex_table[substr($value,0,1)]<<4))
					| (0x03 & $hex_table[substr($value,1,1)])
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

?>
