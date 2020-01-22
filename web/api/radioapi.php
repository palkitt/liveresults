<?php
date_default_timezone_set("Europe/Stockholm");
$lang = "no";
$compid   = $_GET['comp'];
$hightime = 60;
$refreshTime = 5;


if (isset($_GET['lang']))
 $lang = $_GET['lang'];

include_once("../templates/emmalang_en.php");
include_once("../templates/emmalang_$lang.php");
include_once("../templates/classEmma.class.php");


$RunnerStatus = Array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED,"0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "", "13" => $_STATUSFINISHED);

header('content-type: application/json; charset='.$CHARSET);
header('Access-Control-Allow-Origin: *');
header('cache-control: max-age='+($refreshTime-1));
header('Expires: '.gmdate('D, d M Y H:i:s \G\M\T', time() + ($refreshTime-1)));

if (!isset($_GET['method']))
    $_GET['method'] = null;

$pretty = isset($_GET['pretty']);
$br = $pretty ? "\n" : "";

if ($_GET['method'] == 'getradiopassings')
{
		$currentComp = new Emma($_GET['comp']);
		$code = $_GET['code'];
		$calltime = $_GET['calltime'];
		
		if (isset($_GET['last_hash']))
			$lastUpdate = $_GET['last_hash']; // Use last hash to contain last update time
		else
			$lastUpdate = "";
		if ($code != 0 && $code !=-2 && $lastUpdate == "")
			$maxNum = 10; 
		else
			$maxNum = 30; 

		$lastPassings = $currentComp->getRadioPassings($code,$calltime,$lastUpdate,$maxNum);

		$first = true;
		$num = 0;
		$ret = "";
		$firstStarted = false;
		$lasttime = 0;
		$changedTime = "";
		foreach ($lastPassings as $pass)
		{
			$num += 1;
			$age = time()-strtotime($pass['Changed']);
			$modified = $age < $hightime ? 1:0;
			
			$status = $pass['Status'];
			$time   = $pass['Time'];
			$control = $pass['Control'];
			
			if($first)
				$changedTime = $pass['changedRaw'];
			else
				$ret .=",$br";
			
			if ($status==1 && $control=100)
			{
				$pre = "<del>";
			    $post = "</del>";
			}
			else
			{
				$pre = "";
			    $post = "";
			}
			
			$ret .= "{\"passtime\": \"".date("H:i:s",strtotime($pass['Changed']))."\",
					\"runnerName\": \"".$pre.$pass['Name'].$post."\",
					\"club\": \"".$pre.$pass['Club'].$post."\",
					\"class\": \"".$pre.$pass['class'].$post."\",
					\"control\": ".$pass['Control'].",
					\"controlName\" : \"".$pass['pname']."\",
					\"time\": \"".$pre.formatTime($time,$status,$code,$RunnerStatus).$post."\", 
					\"compName\": \"".$pass['compName']."\"";
			
			if ($code==0) // Start	
			{
				$currTime = (date('H')*3600 + date('i')*60 + date('s'))*100;
				$timeToStart = $time - $currTime;
				
				if ($pass['class']=="NOCLAS") // Unknown ecard
					$ret .= ",$br \"DT_RowClass\": \"red_row\"";
				elseif ($status == 9)        // Registered at start 
				{
					if ($timeToStart >= 0 && ($lasttime - $time > 5900))
						$ret .= ",$br \"DT_RowClass\": \"green_row_new\"";
					elseif ($timeToStart < 0 && $firstStarted == false)
					{
						$firstStarted = true; 
						$ret .= ",$br \"DT_RowClass\": \"green_row_new\"";
					}
					else
						$ret .= ",$br \"DT_RowClass\": \"green_row\"";
				}
				elseif ($timeToStart >= 0)   // In call zone, code 1 or 10
				{
					if ($lasttime - $time > 5900)
						$ret .= ",$br \"DT_RowClass\": \"yellow_row_new\"";
					else
						$ret .= ",$br \"DT_RowClass\": \"yellow_row\"";
				}
				elseif ($timeToStart < 0 && $firstStarted == false) 
				{
					$firstStarted = true;
					$ret .= ",$br \"DT_RowClass\": \"firstnonqualifier\"";
				}
			    $lasttime = $time;
			}
			elseif ($code == -2) // Left in forest	
			{
				$timeDiff = -2;
				$rank = -1;
				$ret .= ",\"rank\": ".$rank.",\"timeDiff\": ".$timeDiff;
			}
			else // New result, all but start. Use hash as last updated time
			{	
				if (($status == 0) || ($status == 9) || ($status == 10))
				{
					$rankTime = $currentComp->getRankForSplitInClass($pass['class'],$pass['Control'],$time);
					$rank = $rankTime['rank']+1;
					if ($rank>1)
						$timeDiff = $time-$rankTime['bestTime'];
					else if ($rank==1)
					{
						// Query for second best time
						$secondBest = $currentComp->getSecondBestSplitInClass($pass['class'],$pass['Control']);
						if (count($secondBest)<2)
							$timeDiff = -1;
						else
							$timeDiff = $time-$secondBest[1]['Time'];
					}	
				}
				else
				{
					$rank = -1;
					$timeDiff = -1;
				}
				$ret .= ",\"rank\": ".$rank.",\"timeDiff\": ".$timeDiff;
			}
			$ret .= "$br}";
			$first = false;
		}
				
		if ($code == 0 || $code == -2)
		{
			$hash = MD5($ret);
			if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
				echo("{ \"status\": \"NOT MODIFIED\"}");
			else
			    echo("{ \"status\": \"OK\", $br\"passings\" : [$br$ret$br],$br \"hash\": \"$hash\"}");
		}
		else
		{
			if ($num == 0)
				echo("{ \"status\": \"NOT MODIFIED\"}");
			else
				echo("{ \"status\": \"OK\", $br\"passings\" : [$br$ret$br],$br \"hash\": \"$changedTime\"}");
		}
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
