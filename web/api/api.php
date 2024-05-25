<?php
date_default_timezone_set("Europe/Stockholm");
if (isset($_GET['comp']) && !is_numeric($_GET['comp']))
{
  insertHeader(60,false);
	$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
  header($protocol . ' ' . 400 . ' Bad Request');
	echo("{ \"status\": \"ERR\", \"message\": \"Wrong comp id\"}");
  return;
}
else if(isset($_GET['comp']))
	$compid = $_GET['comp'];

$lang = "no";
if (isset($_GET['lang']))
	$lang = $_GET['lang'];
	
$hightime = 60;
if (!isset($_GET['method']))
    $_GET['method'] = null;
if ($_GET['method'] == 'getplainresults' || $_GET['method'] == 'getstartlist' || $_GET['method'] == 'getclasscoursesplits')
	$refreshTime = 120;
else if ($_GET['method'] == 'getclasses' || $_GET['method'] == 'getclubresults' || $_GET['method'] == 'getrelayresults')
	$refreshTime = 60;
else if ($_GET['method'] == 'getsplitcontrols')
	$refreshTime = 0;
else
	$refreshTime = 5;

include_once("../templates/emmalang_en.php");
include_once("../templates/emmalang_$lang.php");
include_once("../templates/classEmma.class.php");

$RunnerStatus = Array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED,"0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "", "13" => $_STATUSFINISHED);

$pretty = isset($_GET['pretty']);
$br = $pretty ? "\n" : "";

///Method returns all competitions available
if ($_GET['method'] == 'getcompetitions')
{
		$comps = Emma::GetCompetitions();
		insertHeader($refreshTime,false);
		echo("{ \"competitions\": [$br");
		$first = true;
		foreach ((array)$comps as $comp)
		{
			if (!$first)
				echo(",");
			echo("{\"id\": ".$comp["tavid"].", \"name\": \"".$comp["compName"]."\", \"organizer\": \"".$comp["organizer"]."\"");
      echo(", \"date\": \"".date("Y-m-d",strtotime($comp['compDate']))."\", \"timediff\": ".$comp["timediff"]);
      echo(", \"sport\": \"".$comp["sport"]."\", \"livecenterurl\": \"".$comp["livecenterurl"]."\"");
      echo(", \"lastactive\": \"".$comp["changed"]."\"");
      if ($comp["multidaystage"] != "")
		    echo(", \"multidaystage\": ".$comp["multidaystage"].", \"multidayfirstday\": ".$comp["multidayparent"]);
      echo("}$br");
			$first = false;
		}
		echo("]}");
}
else if ($_GET['method'] == 'setcompetitioninfo')
{
    	$tenths = 0;
		$compid = $_POST['comp'];
		Emma::UpdateCompetition($compid,$_POST["compName"],$_POST["organizer"],$_POST["date"],$tenths,$_POST["public"],$_POST["timediff"]);
		insertHeader($refreshTime,false);
		echo("{\"status\": \"OK\"}");
}
else if ($_GET['method'] == 'setlastactive')
{
		Emma::SetLastActive($compid);
		insertHeader($refreshTime,false);
		echo("{\"status\": \"OK\"}");
}
else if ($_GET['method'] == 'createcompetition')
{
		$data = json_decode($HTTP_RAW_POST_DATA);
		insertHeader($refreshTime,false);
		if (!isset($data->name))
			echo("{\"status\": \"Error\", \"message\": \"name not set\"}");
		if (!isset($data->organizer))
			echo("{\"status\": \"Error\", \"message\": \"organizer not set\"}");
		if (!isset($data->date))
			echo("{\"status\": \"Error\", \"message\": \"date not set\"}");
		if (!isset($data->country))
			echo("{\"status\": \"Error\", \"message\": \"country not set\"}");
		if (!isset($data->email))
			echo("{\"status\": \"Error\", \"message\": \"email not set\"}");
		if (!isset($data->password))
			echo("{\"status\": \"Error\", \"message\": \"password not set\"}");

		$id = Emma::CreateCompetitionFull($data->name,$data->organizer,$data->date,$data->email,$data->password,$data->country);
		if ($id > 0)
			echo("{\"status\": \"OK\", \"competitionid\": ".$id." }");
		else
			echo("{\"status\": \"Error\", \"message\": \"Error adding competition\" }");
}
else if ($_GET['method'] == 'getcompetitioninfo')
{
        $compid = $_GET['comp'];
		$comp = Emma::GetCompetition($compid);
		insertHeader($refreshTime,false);
          if (isset($comp["tavid"]))
          {
                echo("{\"id\": ".$comp["tavid"].", \"name\": \"".$comp["compName"]."\", \"organizer\": \"".$comp["organizer"]."\", \"date\": \"".date("Y-m-d",strtotime($comp['compDate']))."\"");
                echo (", \"timediff\": ".$comp["timediff"]);
				echo (", \"timezone\": \"".$comp["timezone"]."\"");
				echo (", \"isPublic\": ".(isset($comp["public"]) ? $comp["public"] : false));
                if ($comp["multidaystage"] != "")
                    echo(", \"multidaystage\": ".$comp["multidaystage"].", \"multidayfirstday\": ".$comp["multidayparent"]);
                echo("}");
          }
          else
             echo("{\"id\": ".$_GET["comp"]."}");
}
elseif ($_GET['method'] == 'getlastpassings')
{
		$currentComp = new Emma($_GET['comp']);
		$RT = insertHeader($refreshTime);
		$lastPassings = $currentComp->getLastPassings(5);
		$first = true;
		$ret = "";
		foreach ((array)$lastPassings as $pass)
		{
			if (!$first)
				$ret .=",$br";
			$ret .= "{\"passtime\": \"".date("H:i:s",strtotime($pass['Changed']))."\",
					\"runnerName\": \"".$pass['Name']."\",
					\"bib\": \"".$pass['bib']."\",
					\"class\": \"".$pass['class']."\",
					\"control\": ".$pass['Control'].",
					\"controlName\" : \"".$pass['pname']."\",
					\"status\" : ".$pass['Status'].", 
					\"time\": \"" .formatTime($pass['Time'],$pass['Status'],$RunnerStatus)."\" }";
			$first = false;
		}

		$hash = MD5($ret);
		if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
			echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
		else
			echo("{ \"status\": \"OK\",$br \"passings\": [$br$ret$br],$br \"hash\": \"". $hash."\", \"rt\": $RT}");
}
elseif ($_GET['method'] == 'getclasses')
{
		$currentComp = new Emma($_GET['comp']);
		$RT = insertHeader($refreshTime);	
		$classNames = classesSorted($currentComp);
		$numberOfRunners = $currentComp->numberOfRunners();
		$numberOfStartedRunners = $currentComp->numberOfStartedRunners();
		$numberOfFinishedRunners = $currentComp->numberOfFinishedRunners();
		$infoText = $currentComp->InfoText();
		$courseNames = $currentComp->CourseNames();
		
		$ret = "";
		$first = true;
		foreach ((array)$classNames as $class)
		{
			$className = $class->name;
			$firstCourse = true;
			$courses = $currentComp->Courses($className);
			if (!$first)
				$ret.=",$br";
			$ret .="{\"className\": \"".$className."\", \"courses\": [";
			foreach ((array)$courses as $course)
			{
				if (!$firstCourse)
					$ret.=",";
				$ret.=$course;
				$firstCourse = false;					
			}
			$ret.="]}";			
			$first = false;
		}

		$retcourses = "";
		$first = true;
		foreach ((array)$courseNames as $course)
		{
			$No = $course['courseno'];
			$Name = isset($course['coursename']) ? $course['coursename'] : "Løype ".$No;
			if (!$first)
				$retcourses.= ",$br";
			$retcourses.= "{\"No\": ".$No.", \"Name\": \"".$Name."\"}";		
			$first = false;
		}

		$retnum = "";
		foreach ($numberOfRunners as $numrun)
			$retnum ="\"numberOfRunners\": \"".$numrun['num']."\"";
		foreach ($numberOfStartedRunners as $numstartrun)
			$retnum .=",\"numberOfStartedRunners\": \"".$numstartrun['num']."\"";
		foreach ($numberOfFinishedRunners as $numfinrun)
			$retnum .=",\"numberOfFinishedRunners\": \"".$numfinrun['num']."\"";
			
		$hash = MD5($ret.$retnum.$infoText);

		if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
			echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
		else
		{
			echo("{ \"status\": \"OK\", \"classes\" : [$br$ret$br], \"courses\": [".$retcourses."], \"infotext\" : \"".$infoText."\"");
			echo(",$retnum");
			echo(",$br \"hash\": \"". $hash."\", \"rt\": $RT}");
		}
}
elseif ($_GET['method'] == 'getclubresults')
{
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$club = $_GET['club'];
	$results = $currentComp->getClubResults($_GET['comp'], $club);
	$ret = "";
	$unformattedTimes = false;
	$first = true;

	if (isset($_GET['unformattedTimes']) && $_GET['unformattedTimes'] == "true")
		$unformattedTimes = true;

	foreach ((array)$results as $res)
	{
		$time = $res['Time'];
		$status = $res['Status'];
		$length = ($res['Length'] == null? 0 : $res['Length'] );
		$pace = ($length>0 && $time>0 ? round(1000*$time/$length) : 0);

		if ($time == "")
			$status = 9;
		$cp = $res['Place'];
		if ($status == 9 || $status == 10)
			$cp = "";
		elseif ($status == 13)
			$cp = "F";
		elseif ($status != 0 || $time < 0)
			$cp = "-";

		$timeplus = $res['TimePlus'];
		$age = time()-strtotime($res['Changed']);
		$modified = ( ($age < $hightime && $status != 9) ? 1 : 0);

		if (!$unformattedTimes)
		{
			$time = formatTime($res['Time'],$res['Status'],$RunnerStatus);
			$timeplus = "+".formatTime($timeplus,$res['Status'],$RunnerStatus);
		}

		if (!$first)
			$ret .= ",$br";
		$ret .= "{\"place\": \"$cp\", \"name\": \"".$res['Name']."\", \"bib\": \"".$res['Bib']."\", \"club\": \"".$res['Club']."\",\"class\": \"".$res['Class']."\", \"pace\": \"".$pace."\", \"result\": \"".$time."\",\"status\" : ".$status.", \"timeplus\": \"$timeplus\"";

		if (isset($res["start"]))
			$ret .= ",$br \"start\": ".$res["start"];
		else
			$ret .= ",$br \"start\": \"\"";

		if ($modified)
			$ret .= ",$br \"DT_RowClass\": \"red_row\"";
		$ret .= "$br}";

		$first = false;
	}

	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
	{
		echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
	}
	else
	{
		echo("{ \"status\": \"OK\",$br \"clubName\": \"".$club."\", $br\"results\": [$br$ret$br]");
		echo(",$br \"hash\": \"". $hash."\", \"rt\": $RT}");
	}
}
elseif ($_GET['method'] == 'getsplitcontrols')
{
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$splits = $currentComp->getAllSplitControls();
	$splitJSON = "[$br";
	$first = true;
	foreach ((array)$splits as $split)
	{
		if (!$first)
			$splitJSON .=",$br";
		$splitJSON .= "{ \"class\": \"".$split['classname']."\", \"code\": ".$split['code'] .", \"name\": \"".$split['name']."\", \"order\": \"".$split['corder']."\"}";
		$first = false;
	}
	$splitJSON .="$br]";
	$hash = MD5($splitJSON);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
	{
		echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
	}
	else
	{
		echo("{ \"status\": \"OK\",$br \"splitcontrols\": $splitJSON");
		echo(",$br \"hash\": \"". $hash."\", \"rt\": $RT}");
	}
}
elseif ($_GET['method'] == 'deleteradiocontrol')
{
	insertHeader(1,false);
	if (!isset($_GET['comp']))
		echo("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	elseif (!isset($_GET['code']))
		echo("{\"status\": \"Error\", \"message\": \"code not set\"}");
	elseif (!isset($_GET['classname']))
		echo("{\"status\": \"Error\", \"message\": \"classname not set\"}");
	else
	{
    $compid = $_GET['comp'];
    $currentComp = new Emma($compid);
	  $code = $_GET['code'];
    $classname = $_GET['classname'];
    $currentComp->DelRadioControl($compid,$code,$classname);
		echo("{\"status\": \"OK\"}");
  }
}
elseif ($_GET['method'] == 'addradiocontrol')
{
	insertHeader(1,false);
	if (!isset($_GET['comp']))
		echo("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	elseif (!isset($_GET['code']))
		echo("{\"status\": \"Error\", \"message\": \"code not set\"}");
	elseif (!isset($_GET['classname']))
		echo("{\"status\": \"Error\", \"message\": \"classname not set\"}");
  	elseif (!isset($_GET['name']))
		echo("{\"status\": \"Error\", \"message\": \"name not set\"}");
  	else
	{
		$compid = $_GET['comp'];
		$currentComp = new Emma($compid);
		$code = $_GET['code'];
		$classname = $_GET['classname'];
		$name = $_GET['name'];
		if (isset($_GET['order']))
		{
			$order = $_GET['order'];
			$currentComp->AddRadioControl($compid,$classname,$name,$code,$order);
		}
		else
			$currentComp->AddRadioControl($compid,$classname,$name,$code);
		echo("{\"status\": \"OK\"}");
  }	
}
elseif ($_GET['method'] == 'addradiocontrolforallclasses')
{
	insertHeader(1,false);
	if (!isset($_GET['comp']))
		echo("{\"status\": \"Error\", \"message\": \"comp not set\"}");
	elseif (!isset($_GET['code']))
		echo("{\"status\": \"Error\", \"message\": \"code not set\"}");
	elseif (!isset($_GET['order']))
		echo("{\"status\": \"Error\", \"message\": \"order not set\"}");
  	elseif (!isset($_GET['name']))
		echo("{\"status\": \"Error\", \"message\": \"name not set\"}");
  	else
	{
		$compid = $_GET['comp'];
		$currentComp = new Emma($compid);
		$code = $_GET['code'];
		$order = $_GET['order'];
		$name = $_GET['name'];
		$currentComp->AddRadioControlsForAllClasses($compid,$name,$code,$order);
		echo("{\"status\": \"OK\"}");
  	}
}
elseif ($_GET['method'] == 'getclassresults')
{
	$class = $_GET['class'];
	$currentComp = new Emma($_GET['comp']);
	$isActive = $currentComp->IsCompActive();
	$RT = insertHeader($refreshTime);
	$courseName = "";
	if (strpos($class, 'course::') === 0)
	{
		$course = substr($class, 8);
		$res = courseResults($course);
		$courseNames = $currentComp->CourseNames($course);
		$courseName = $courseNames[0]['coursename'];
		if ($courseName == "")
			$courseName = "Løype ".$course;
	}
	else
		$res = classresults($class,false);
	
	$ret = $res[0];
	$splitJSON = $res[1];
	$lengthMin = $res[2];
	$lengthMax = $res[3];
	$lengthStr = lengthToStr($lengthMin,$lengthMax);
	$infoText = $currentComp->InfoText();

	$hash = MD5($ret.$infoText);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
	{
		echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT, \"active\": $isActive}");
	}
	else
	{
		echo("{ \"status\": \"OK\",$br \"className\": \"".$class."\",$br \"distance\": \"".$lengthStr."\",$br \"splitcontrols\": $splitJSON,$br ");
		if ($courseName != "")
			echo("\"courseName\": \"".$courseName."\",$br ");
		echo("\"results\": [$br$ret$br],$br \"infotext\": \"$infoText\",$br \"hash\": \"". $hash."\", \"rt\": $RT, \"active\": $isActive}");
	}
}
elseif ($_GET['method'] == 'getrelayresults')
{
	$class = $_GET['class'];
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$leg = 0;
	$ret = "";
    do {
		$leg += 1;
		$relayClass = $class."-".$leg;
		$res = classresults($relayClass,false,true);
		if ($res[0] != "")
		{
			if($leg>1)
				$ret .= ",".$br;
			$ret .= "$br{\"leg\": ".$leg.", \"results\": [" .$res[0]. "]}";
		}
	} while ($res[0] != "");

	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
	{
		echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT}");
	}
	else
	{
		echo("{ \"status\": \"OK\",$br \"className\": \"".$class."\",$br \"legs\": ".($leg-1).", \"relayresults\": [$br$ret$br]");
		echo(",$br \"hash\": \"". $hash."\", \"rt\": $RT}");
	}
}
elseif ($_GET['method'] == 'getclasscoursesplits')
{
	$class = $_GET['class'];
	$course = $_GET['course'];
	$currentComp = new Emma($_GET['comp']);
	
	$RT = insertHeader($refreshTime);
	$res = courseSplitResults($class,$course);
	$ret = $res[0];
	$splitJSON = $res[1];
	
	echo("{ \"status\": \"OK\",$br \"className\": \"".$class."\",$br \"splitcontrols\": $splitJSON, $br\"results\": [$br$ret$br],$br ");
	echo("\"rt\": $RT}");
	
}
elseif ($_GET['method'] == 'getrunners')
{
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
	$runners = $currentComp->getRunners();
	$isActive = $currentComp->IsCompActive();
	$ret = "";
	$first = true;
	foreach ((array)$runners as $runner)
	{
		if (!$first)
			$ret .=",$br";
		$ret .= "{ \"dbid\": ".$runner['dbid'].", \"bib\": ".$runner['bib'].", \"status\": ".$runner['status'].", \"name\": \"".$runner['name']."\"";
    	$ret .= ", \"club\": \"".$runner['club']."\", \"start\": \"".formatTime($runner['start'],0,$RunnerStatus)."\"";
    	$ret .= ", \"class\": \"".$runner['class']."\", \"ecard1\": ".$runner['ecard1'].", \"ecard2\": ".$runner['ecard2'];
		$ret .= ", \"starttime\": ".$runner['start'].",\"checked\": ".($runner["ecardchecked"] == 1 ? 1 : 0)."}";
		$first = false;
	}
	$hash = MD5($ret);
	if (isset($_GET['last_hash']) && $_GET['last_hash'] == $hash)
		echo("{ \"status\": \"NOT MODIFIED\", \"rt\": $RT, \"active\": $isActive}");
	else
		echo("{ \"status\": \"OK\",$br \"runners\": [$br$ret$br],$br \"hash\": \"". $hash."\", \"rt\": $RT, \"active\": $isActive}");

}
elseif ($_GET['method'] == 'getracesplitter')
{
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime); //
	$runners = $currentComp->getRunners();
	$interval = $_GET['interval'];
	$firststart = $_GET['firststart']; 

	$ret = "Wave number,Racer bib number,First name,Last name,Email,Compensation,Category,Team";
	foreach ((array)$runners as $runner)
	{
		$bib = $runner['bib'];
		$start = $runner['start'];
		$wave = 1 + round(($start - $firststart)/$interval);
		if ($wave > 0 && $bib > 0)
			$ret .= "\n".$wave.",".$bib.",,".$runner['name'].",,,".$runner['class'].",".$runner['club'];
	}
	echo($ret);
 }
 elseif ($_GET['method'] == 'getnumconnect')
 {
	insertHeader($refreshTime,false);
	$nums = Emma::GetNumConnect();	
	foreach ($nums as $num)
	{
		$n = $num["num"]; // Number of connects in buffer
		$UF = $num["UF"]; // Update factor
    $nH = $n*60*10;   // Number of connects per hour
	}
	echo("Number of connections to server\n[#/min]      : ".$n."\n[#/hour]     : ".$nH."\nUpdate factor: ".$UF);
 }
 elseif ($_GET['method'] == 'getplainresults')
 {
	$currentComp = new Emma($_GET['comp']);
	$RT = insertHeader($refreshTime);
  if (isset($_GET['classmask']))
  {
	  $classNames = classesSorted($currentComp,$_GET['classmask']);
    $classNameAdd = "class_".$_GET['classmask'];
  }
  else
  {
    $classNames = classesSorted($currentComp);
    if (isset($_GET['includetotal']) && $_GET['includetotal'] == "true")
      $classNameAdd = "total";
    else
      $classNameAdd = "";
  }
	$ret = "";
	$first = true;
	foreach ((array)$classNames as $class)
	{
		if (!$first)
			$ret .= ", ";
		$first = false;
		$className = $class->name;
		$res = classresults($className,true);
		$lengthMin = $res[2];
		$lengthMax = $res[3];
		$lengthStr = lengthToStr($lengthMin,$lengthMax);
		$ret .= "{\"className\": \"$className\", \"distance\": \"".$lengthStr."\", \"results\": [".$res[0]."]}";
	}
	$hash = MD5($ret);
	echo("{ \"status\": \"OK\",$br \"className\": \"plainresults".$classNameAdd."\",$br \"results\": [$br$ret$br]");
	echo(",$br \"hash\": \"". $hash."\", \"rt\": $RT}");
}
elseif ($_GET['method'] == 'getstartlist')
{
   $currentComp = new Emma($_GET['comp']);
   $RT = insertHeader($refreshTime);
   $classNames = classesSorted($currentComp);
   $ret = "";
   $first = true;
   foreach ((array)$classNames as $class)
   {
	   if (!$first)
		   $ret .= ", ";
	   $first = false;
	   $className = $class->name;

	   $runners = $currentComp->getStartlist($className);
	   $retClass = "";
	   $lengthMin = 0;
	   $lengthMax = 0;  
	   $firstInClass = true;
	   foreach ((array)$runners as $runner)
	   {
			$length = ($runner['length'] == null ? 0 : $runner['length']);
			if ($firstInClass || $length>$lengthMax)
		   		$lengthMax = $length;
			if ($firstInClass || $length<$lengthMin)
		   		$lengthMin = $length;
		   if (!$firstInClass)
			   $retClass .=",$br";
		   $retClass .= "{ \"bib\": ".$runner['bib'].", \"status\": ".$runner['status'].", \"name\": \"".$runner['name']."\", \"club\": \"".$runner['club']."\", \"start\": \"".$runner['start']."\", \"ecard1\": ".$runner['ecard1'].", \"ecard2\": ".$runner['ecard2']."}";
		   $firstInClass = false;
	   }
	   $lengthStr = lengthToStr($lengthMin,$lengthMax);
	   $ret .= "{\"className\": \"$className\", \"distance\": \"".$lengthStr."\", \"results\": [".$retClass."]}";
   }
   $hash = MD5($ret);
   echo("{ \"status\": \"OK\",$br \"className\": \"startlist\",$br \"results\": [$br$ret$br]");
   echo(",$br \"hash\": \"". $hash."\", \"rt\": $RT}");
}
elseif ($_GET['method'] == 'gettestresults')
{
	$RT = insertHeader($refreshTime,false);
	if (isset($_GET['name']))
		$name = $_GET['name'];
	else
		$name = "";
	if (isset($_GET['races']))
		$races = $_GET['races'];
	else
		$races = "";
	$results = Emma::getTestResultsForRunner($name,$races);
	$first = true;
	$ret = "";
	foreach ((array)$results as $result)
	{
		if (!$first)
			$ret .= ",$br";
		$ret .= "{\"name\": \"".$result['name']."\", \"result\": ".$result['time'].", \"status\": ".$result['status'].", \"class\": \"".$result['class']."\"";
		$ret .= ", \"date\": \"".date("Y-m-d",strtotime($result['compdate']))."\", \"compid\": ".$result['tavid']."}";
		$first = false;
	}
	
	$hash = MD5($ret);
	echo("{ \"status\": \"OK\", \"results\": [$ret]");
	echo(", \"hash\": \"". $hash."\", \"rt\": $RT}");
}
else
{
	insertHeader($refreshTime,false);
	$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
    header($protocol . ' ' . 400 . ' Bad Request');
	echo("{ \"status\": \"ERR\", \"message\": \"No method given\"}");
}

function cmp($a, $b) {
	return strcmp($a->sortKey, $b->sortKey);
}	

function classesSorted($currentComp,$classMask=null){
	class sort
	{	
		public $sortKey;
		public $name;
	}
	
	$classes = $currentComp->Classes($classMask);
	$classNames = [];

	foreach ((array)$classes as $class)
	{
		$classSort = new sort();
		$classSort->name = $class['Class'];
		$sortKey = strtolower($class['Class']);

		if (stripos($sortKey,'Åpen') !== false || stripos($sortKey,'åpen') !== false || stripos($sortKey,'open') !== false || 
        stripos($sortKey,'gjest') !== false || stripos($sortKey,'dir') !== false || stripos($sortKey,'utv') !== false)
			$sortKey = 'z'.$sortKey;
		if (preg_match("/(-e| e|\d+e|elite|wre)(\s*\d*)$/", $sortKey))
			$sortKey = "A" . $sortKey;
							
		$sortKey = preg_replace('/(^|[^\d])(\d)($|[^\d])/','$1 00 $2 $3',$sortKey);       // Add 00 ahead of single digits
		$sortKey = preg_replace('/(^|[^\d])(\d)(\d)($|[^\d])/','$1 0 $2 $3 $4',$sortKey); // Add 0 ahead of double digits
		$sortKey = str_replace(' ','',$sortKey);
		$sortKey = str_replace('-','',$sortKey);
		$sortKey = str_replace('+','',$sortKey);
		$sortKey = str_replace('prolog','a',$sortKey);
		$sortKey = str_replace('kvart' ,'b',$sortKey);
		$sortKey = str_replace('semi'  ,'c',$sortKey);
		$sortKey = str_replace('finale','d',$sortKey);
		$classSort->sortKey = $sortKey;
		$classNames[] = $classSort;
	}
	
	usort($classNames, "cmp");
	return $classNames;
}

function classResults($class,$plain,$relay=false)
{
	global $RunnerStatus;
	global $currentComp;
	$results = $currentComp->getAllSplitsForClass($class);
	if (isset($_GET['nosplits']) && $_GET['nosplits'] == "true" || $plain)
		$splits = null;
	else if ($relay)
	{
		$splits[0]['code']="999";
		$splits[0]['name']="leg";
	}
	else
		$splits = $currentComp->getSplitControlsForClass($class);

	$total = null;
	$retTotal = false;
	if (isset($_GET['includetotal']) && $_GET['includetotal'] == "true")
	{		
		if (!$plain)
			$retTotal = true;
		$total = $currentComp->getTotalResultsForClass($class);
		foreach ((array)$results as $key=>$res)
		{
			$id = $res['DbId'];
      		if ($plain) // Replace todays results with total results
			{
				$results[$key]["Time"] = $total[$id]["Time"];
				$results[$key]["Status"] = $total[$id]["Status"];
				$results[$key]["Length"] = null;
			}
			else
			{
				$results[$key]["totaltime"] = $total[$id]["Time"];
				$results[$key]["totalstatus"] = $total[$id]["Status"];
				$results[$key]["totalplace"] = $total[$id]["Place"];
				$results[$key]["totalplus"] = $total[$id]["TotalPlus"];
			}
		}
	}
	$ret = "";
	$first = true;
	$place = 1;
	$count = 1;
	$lastTime = -9999;
	$winnerTime = 0;
	$unformattedTimes = false;

	if (isset($_GET['unformattedTimes']) && $_GET['unformattedTimes'] == "true")
		$unformattedTimes = true;

	$splitJSON = "[";
	foreach ((array)$splits as $split)
	{
		if (!$first)
			$splitJSON .=",";
		$splitJSON .= "{ \"code\": ".$split['code'] .", \"name\": \"".$split['name']."\"}";
		$first = false;

		usort($results, function ($a,$b) use($split)
		{
			if (!isset($a[$split['code']."_time"]) && isset($b[$split['code']."_time"]))
				return 1;
			if (isset($a[$split['code']."_time"]) && !isset($b[$split['code']."_time"]))
				return -1;
			if (!isset($a[$split['code']."_time"]) && !isset($b[$split['code']."_time"]))
				return 0;
			if (isset($a[$split['code']."_time"]) && isset($b[$split['code']."_time"]))
			{
				if ($b[$split['code']."_time"] == $a[$split['code']."_time"])
					return 0;
				else
					return $a[$split['code']."_time"] < $b[$split['code']."_time"] ? -1 : 1;
			}
		});
		$splitplace = 1;
		$cursplitplace = 1;
		$cursplittime = "";
		$bestsplittime = -1;
		$bestsplitkey = -1;
		$secondbest = false;

		foreach ((array)$results as $key => $res)
		{
			$sp_time = "";
			$raceTime = $res['Time'];
			$raceStatus = $res['Status'];
			if ($raceTime == "")
				$raceStatus = 9;
			if (isset($res[$split['code']."_time"]))
			{
				$sp_time = $res[$split['code']."_time"];
				if ($bestsplittime < 0 && ($raceStatus == 0 || $raceStatus == 9 || $raceStatus == 10))
				{
					$bestsplittime = $sp_time;
					$bestsplitkey = $key;
				}
			}
			if ($sp_time != "")
			{
				$results[$key][$split['code']."_timeplus"] = $sp_time - $bestsplittime;
				if (!$secondbest && $bestsplitkey>-1 && $key != $bestsplitkey && ($raceStatus == 0 || $raceStatus == 9 || $raceStatus == 10))
				{
					$results[$bestsplitkey][$split['code']."_timeplus"] = $bestsplittime - $sp_time;
					$secondbest = true;
				}
			}
			else
				$results[$key][$split['code']."_timeplus"] = -1;

			if ($cursplittime != $sp_time)
				$cursplitplace = $splitplace;
				
			if ($raceStatus == 0 || $raceStatus == 9 || $raceStatus == 10)
			{
				$results[$key][$split['code']."_place"] = $cursplitplace;
				$splitplace++;
				if (isset($res[$split['code']."_time"]))
					$cursplittime = $res[$split['code']."_time"];
			}
			elseif ($raceStatus == 13)
				$results[$key][$split['code']."_place"] = "\"F\"";
			else
				$results[$key][$split['code']."_place"] = "\"-\"";
		}
	}

	usort($results,"sortByResult");

	$splitJSON .= "]";
	$first = true;
	$lengthMin = 0;
	$lengthMax = 0;
	$keys = array_keys($results);
	foreach ((array)$results as $res)
	{
		$length = ($res['Length'] == null? 0 : $res['Length'] );
		if ($first || $length>$lengthMax)
			$lengthMax = $length;
		if ($first || $length<$lengthMin)
			$lengthMin = $length;	
		if (!$first && !$plain)
			$ret .=",";

		$paceTime = 0;
		if ($relay && isset($res["999_time"]))
			$paceTime = $res["999_time"];
		else
			$paceTime = $res['Time']; 
		$pace = ($length>0 && $paceTime>0 ? round(1000*$paceTime/$length) : 0); 
		
		$time = $res['Time']; 
		if ($first)
			$winnerTime = $time;

		$status = $res['Status'];
		$progress = 0;

		if ($time == "")
			$status = 9;

		if ($status == 9 || $status == 10)
		{
			$cp = "";

			if (count((array)$splits) == 0)
			{
				$progress = 0;
			}
			else
			{
				$passedSplits = 0;
				$splitCnt = 0;
				foreach ((array)$splits as $split)
				{
					$splitCnt++;
					if (isset($res[$split['code']."_time"]))
						$passedSplits = $splitCnt;
				}
				$progress = ($passedSplits * 100.0) / (count($splits)+1);
			}
		}
		elseif ($status == 13)
		{
			$cp = "F";
			$progress = 100;
		}
		elseif ($status != 0 || $time < 0)
		{
			$cp = "-";
			$progress = 100;
		}
		elseif ($time == $lastTime)
		{
			$cp = $place;
			$progress = 100;
		}
		else
		{
			$place = $count;
			$cp = $place;
		}

		$timeplus = "";

		if ($time > 0 && $status == 0)
		{
			if ( $first && sizeof($keys)>1 && $results[$keys[1]]['Time'] > 0 && $results[$keys[1]]['Status'] == 0 ) 
				$timeplus = $time - $results[$keys[1]]['Time'];
			else
				$timeplus = $time-$winnerTime;
			$progress = 100;
		}

		if (!$unformattedTimes)
		{
			$time = formatTime($res['Time'],$res['Status'],$RunnerStatus);
			$timeplus = "+".formatTime($timeplus,$res['Status'],$RunnerStatus);
		}

		$tot = "";
		if ($retTotal)
			$tot = ", \"totalresult\": ".($res['totaltime']). ", \"totalstatus\": ".$res['totalstatus']. ", \"totalplace\": \"".$res['totalplace']."\", \"totalplus\": ".($res['totalplus']);
		
		if ($res['Changed']>0)
			$changed = strtotime($res['Changed']);
		else
			$changed = "0";
		if ($plain)
		{
			if ($progress<100)
				continue;
			if (!$first)
				$ret .=",";
			$ret .= "{\"place\": \"$cp\", \"name\": \"".$res['Name']."\", \"club\": \"".str_replace("\"","'",$res['Club'])."\", \"pace\": ".$pace.", \"result\": \"".$time."\", \"status\" : ".$status.", \"timeplus\": "; 
			if (!$first && $res['Status']==0)
				$ret .= "\"$timeplus\"";
			else
				$ret .= "\"\"";
			$ret .= "}";
		}
		else
			$ret .= "{\"place\": \"$cp\", \"dbid\": ".$res['DbId'].", \"bib\": ".$res['Bib'].", \"name\": \"".$res['Name']."\", \"club\": \"".str_replace("\"","'",$res['Club'])."\", \"pace\": ".$pace.", \"result\": \"".$time."\", \"status\" : ".$status.", \"timeplus\": \"$timeplus\", \"changed\": $changed, \"progress\": $progress $tot"; 

		if (count((array)$splits) > 0)
		{
			$ret .= ", \"splits\": {";
			$firstspl = true;
			foreach ((array)$splits as $split)
			{
				if (!$firstspl)
					$ret .=",";
				if (isset($res[$split['code']."_time"]))
				{
					$splitStatus = $status;
					if ($status == 9 || $status == 10)
						$splitStatus = 0;
					if ($res[$split['code'].'_changed']>0)
						$changed = strtotime($res[$split['code'].'_changed']);
					else
						$changed = "0";
					$ret .= "\"".$split['code']."\": ".$res[$split['code']."_time"].",\"".$split['code']."_status\": ".$splitStatus.",\"".$split['code']."_place\": ".$res[$split['code']."_place"].",\"".$split['code']."_timeplus\": ".$res[$split['code']."_timeplus"].",\"".$split['code']."_changed\": $changed";
				}
				else
					$ret .= "\"".$split['code']."\": \"\",\"".$split['code']."_status\": 1,\"".$split['code']."_place\": \"\"";
				$firstspl = false;
			}
			$ret .="}";
		}
		
		if (!$plain)
		{
			if (isset($res["start"]))
				$ret .= ", \"start\": ".$res["start"];
			else
				$ret .= ", \"start\": \"\"";
			$ret .= "}";
		}
			
		$first = false;
		$count++;
		$lastTime = $time;
	}
	$res[0] = $ret;
	$res[1] = $splitJSON;
	$res[2] = $lengthMin;
	$res[3] = $lengthMax;
	return $res;
}

function courseResults($course)
{
	global $RunnerStatus;
	global $currentComp;
	$results = $currentComp->getAllSplitsForCourse($course);
	
	$ret = "";
	$first = true;
	$place = 1;
	$count = 1;
	$lastTime = -9999;
	$winnerTime = 0;
	$unformattedTimes = false;
	if (isset($_GET['unformattedTimes']) && $_GET['unformattedTimes'] == "true")
		$unformattedTimes = true;

	usort($results,"sortByResult");

	$first = true;
	$lengthMin = 0;
	$lengthMax = 0;
	$keys = array_keys($results);
	foreach ((array)$results as $res)
	{
		$length = ($res['Length'] == null? 0 : $res['Length'] );
		if ($first || $length>$lengthMax)
			$lengthMax = $length;
		if ($first || $length<$lengthMin)
			$lengthMin = $length;

		if (!$first)
			$ret .=",";

		$time = $res['Time']; 
		$pace = ($length>0 && $time>0 ? round(1000*$time/$length) : 0); 	

		if ($first)
			$winnerTime = $time;

		$status = $res['Status'];
		$progress = 0;

		if ($time == "")
			$status = 9;

		if ($status == 9 || $status == 10)
		{
			$cp = "";
			$progress = 0;
		}
		elseif ($status == 13)
		{
			$cp = "F";
			$progress = 100;
		}
		elseif ($status != 0 || $time < 0)
		{
			$cp = "-";
			$progress = 100;
		}
		elseif ($time == $lastTime)
		{
			$cp = $place;
			$progress = 100;
		}
		else
		{
			$place = $count;
			$cp = $place;
		}

		$timeplus = "";
		if ($time > 0 && $status == 0)
		{
			if ( $first && sizeof($keys)>1 && $results[$keys[1]]['Time'] > 0 && $results[$keys[1]]['Status'] == 0 ) 
				$timeplus = $time - $results[$keys[1]]['Time'];
			else
				$timeplus = $time - $winnerTime;
			$progress = 100;
		}

		if (!$unformattedTimes)
		{
			$time = formatTime($res['Time'],$res['Status'],$RunnerStatus);
			$timeplus = "+".formatTime($timeplus,$res['Status'],$RunnerStatus);
		}
		
		if ($res['Changed'] > 0)
			$changed = strtotime($res['Changed']);
		else
			$changed = "0";
		
		$ret .= "{\"place\": \"$cp\", \"dbid\": ".$res['DbId'].", \"bib\": ".$res['Bib'].", \"name\": \"".$res['Name']."\",";
		$ret .= " \"club\": \"".str_replace("\"","'",$res['Club'])."\",\"class\": \"".$res['Class']."\", \"pace\": ".$pace.",";
		$ret .= " \"result\": \"".$time."\", \"status\" : ".$status.", \"timeplus\": \"$timeplus\", \"changed\": $changed, \"progress\": $progress";  
		if (isset($res["Start"]))
			$ret .= ", \"start\": ".$res["Start"];
		else
			$ret .= ", \"start\": \"\"";
		$ret .= "}";
		
		$first = false;
		$count++;
		$lastTime = $time;
	}
	$res[0] = $ret;
	$res[1] = "[]";
	$res[2] = $lengthMin;
	$res[3] = $lengthMax;
	return $res;
}

function courseSplitResults($class,$course)
{
	global $RunnerStatus;
	global $currentComp;
	
	$ret = $currentComp->getEcardTimesForClassCourse($class,$course);
	$results = $ret[0];
	$controls = $ret[1];
	
	$ret = "";
	$first = true;
	$place = 1;
	$count = 1;
	$lastTime = -9999;
	$winnerTime = 0;
	
	$splitJSON = "[";
	for ($split = 1; $split < sizeof($controls)+2; $split++)
	{
		if (!$first)
			$splitJSON .=",";
		$splitJSON .= ($split<sizeof($controls)+1? $controls[$split-1]: 999);
		$first = false;
		
		foreach (["_pass","_split"] as $type)
		{
			usort($results, function ($a,$b) use($split, $type)
			{
				if (!isset($a[$split.$type."_time"]) && isset($b[$split.$type."_time"]))
					return 1;
				if (isset($a[$split.$type."_time"]) && !isset($b[$split.$type."_time"]))
					return -1;
				if (!isset($a[$split.$type."_time"]) && !isset($b[$split.$type."_time"]))
					return 0;
				if (isset($a[$split.$type."_time"]) && isset($b[$split.$type."_time"]))
				{
					if ($a[$split.$type."_time"] == $b[$split.$type."_time"])
						return 0;
					else
						return $a[$split.$type."_time"] < $b[$split.$type."_time"] ? -1 : 1;
				}
			});
			$splitplace = 1;
			$cursplitplace = 1;
			$lastsplittime = -1;
			$bestsplittime = -1;

			foreach ((array)$results as $key => $res)
			{
				$sp_time = -1;
				$raceTime = $res['Time'];
				$raceStatus = $res['Status'];
				
				if (isset($res[$split.$type."_time"]))
				{
					$sp_time = $res[$split.$type."_time"];
					if ($raceStatus == 0 && $sp_time > 0 && $bestsplittime < 0)
						$bestsplittime = $sp_time;
				}

				if ($sp_time > 0)
					$results[$key][$split.$type."_plus"] = $sp_time - $bestsplittime;
				else
					$results[$key][$split.$type."_plus"] = -1;

				if ($sp_time != $lastsplittime)
					$cursplitplace = $splitplace;

				if ($raceStatus != 0 || $sp_time <= 0)
					$results[$key][$split.$type."_place"] = -1;
				else
				{
					$results[$key][$split.$type."_place"] = $cursplitplace;
					$splitplace++;
					$lastsplittime = $res[$split.$type."_time"];
				}			
			}
		}
	}
	$splitJSON .= "]";

	usort($results,"sortByResult");
 	$first = true;
	$keys = array_keys($results);
	foreach ((array)$results as $res)
	{
		if (!$first)
			$ret .=",";
		$time = $res['Time'];
		$status = $res['Status'];
		$length = ($res['Length'] == null? 0 : $res['Length'] );
		$pace = ($length>0 && $time>0 ? round(1000*$time/$length) : 0);

		if ($first)
			$winnerTime = $time;				
		
		if ($status == 13)
			$cp = "F";
		elseif ($status != 0 || $time < 0)
			$cp = "-";
		elseif ($time == $lastTime)
			$cp = $place;
		else
		{
			$place = $count;
			$cp = $place;
		}
		$timeplus = -1;

		if ($time > 0 && $status == 0)
			$timeplus = $time-$winnerTime;
		
		$ret .= "{\"place\": \"$cp\", \"dbid\": ".$res['DbId'].", \"bib\": ".$res['Bib'].", \"name\": \"".$res['Name']."\", \"club\": \"".str_replace("\"","'",$res['Club'])."\", \"result\": \"".$time."\", \"status\" : ".$status.", \"timeplus\": \"$timeplus\", \"pace\": ".$pace; 

		if (count($controls) > 0)
		{	
			$first = true;
			$pass_time   = "[";
			$pass_place  = "[";
			$pass_plus   = "[";
			$split_time  = "[";
			$split_place = "[";
			$split_plus  = "[";
			for ($split = 1; $split < sizeof($controls)+2; $split++)
			{
				if (!$first)
				{
					$pass_time   .= ",";
					$pass_place  .= ",";
					$pass_plus   .= ",";
					$split_time  .= ",";
					$split_place .= ",";
					$split_plus  .= ",";
				}
				if (isset($res[$split."_pass_time"]) && $res[$split."_pass_time"]>0)
				{
					$pass_time  .= $res[$split."_pass_time"];
					$pass_place .= $res[$split."_pass_place"];
					$pass_plus  .= $res[$split."_pass_plus"];
				}
				else
				{
					$pass_time  .= "-1";
					$pass_place .= "-1";
					$pass_plus  .= "-1";
				}
				if (isset($res[$split."_split_time"]) && $res[$split."_split_time"]>0)
				{
					$split_time  .= $res[$split."_split_time"];
					$split_place .= $res[$split."_split_place"];
					$split_plus  .= $res[$split."_split_plus"];
				}
				else
				{
					$split_time  .= "-1";
					$split_place .= "-1";
					$split_plus  .= "-1";
				}
				$first = false;
			}
			$pass_time   .= "]";
			$pass_place  .= "]";
			$pass_plus   .= "]";
			$split_time  .= "]";
			$split_place .= "]";
			$split_plus  .= "]";
			$ret .= ", \"pass_time\": ".$pass_time.", \"pass_place\": ".$pass_place.", \"pass_plus\": ".$pass_plus.", \"split_time\": ".$split_time.", \"split_place\": ".$split_place.", \"split_plus\": ".$split_plus;
		}
		$ret .= "}";
			
		$first = false;
		$count++;
		$lastTime = $time;
	}
	$res[0] = $ret;
	$res[1] = $splitJSON;
	return $res;
}

function insertHeader($refreshTime,$update=true)
{
	global $CHARSET;
	if ($update)
	{
		global $currentComp;
		$UF = $currentComp->GetUpdateFactor();
		$RT = round($refreshTime/$UF + 0.4); // Updated refresh time
	}
	else
		$RT = $refreshTime;
		
	header('content-type: application/json; charset='.$CHARSET);
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Expose-Headers: Date');
	header('Cache-Control: max-age='.($RT-1));
	header('Expires: '.gmdate('D, d M Y H:i:s \G\M\T', time() + ($RT-1)));

	return $RT;
}

function lengthToStr($lengthMin,$lengthMax)
{
		if ($lengthMin == null || $lengthMin == 0)
		   return "";
		elseif (abs($lengthMin-$lengthMax)<50)
		   return str_replace('.',',',sprintf("%01.1f", $lengthMin/1000));  
		else
		   return str_replace('.',',',sprintf("%01.1f", $lengthMin/1000)." - ".sprintf("%01.1f", $lengthMax/1000));  
}

function sortByResult($a,$b)
{
	$aStatus = $a["Status"];
	$bStatus = $b["Status"];
    if ($aStatus == 13)	
		$aStatus = -$a["DbId"];
	else if ($aStatus == 1)
		$aStatus = 100;
	if ($bStatus == 13)	
		$bStatus = -$b["DbId"];
	else if ($bStatus == 1)
		$bStatus = 100;
	
	if ($aStatus == 0 && $bStatus != 0)
     	return -1;
  	else if ($aStatus != 0 && $bStatus == 0)
     	return 1;
  	else if ($aStatus != $bStatus)
     	return $aStatus - $bStatus;
  	else if ($a["Time"] == $b["Time"])
	 	return $a["DbId"] - $b["DbId"];
  	else
     	return $a["Time"] - $b["Time"];
}


function formatTime($time,$status,& $RunnerStatus)
{
  global $lang;
  global $_FREESTART;

  if ($status != "0")
    return $RunnerStatus[$status]; //$status;

  if ($time == -999)
	return $_FREESTART;
  
  if ($time == -1)
	return "";

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
		foreach((array)$res as $key => $value){
			$arr_unicoded[] = chr(
					(0xc0 | ($hex_table[substr($value,0,1)]<<4))
					| (0x03 & $hex_table[substr($value,1,1)])
			);
			$res[$key] = "%C3%" . $value;
		}

		$raw_url_encoded = str_replace(
								$res,
								$arr_unicoded,
								$raw_url_encoded);
	}

	# Return decoded  raw url encoded data
	return rawurldecode($raw_url_encoded);
}
?>