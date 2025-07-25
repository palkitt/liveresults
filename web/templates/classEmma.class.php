<?php
$CHARSET = 'utf-8';

require_once('config.php');
class Emma
{
	public static $MYSQL_CHARSET = "utf8";
	var $m_CompId;
	var $m_CompName;
	var $m_CompDate;
	var $m_Organizer;
	var $m_RankedStartList;
	var $m_TimeDiff = 0;
	var $m_HighTime = 60;
	var $m_LiveloxID = 0;
	var $m_IsMultiDayEvent = false;
	var $m_UseMassStartSort = false;
	var $m_ShowTenthOfSeconds = false;
	var $m_ShowInfo = false;
	var $m_ShowEcardTimes = false;
	var $m_ShowFullView = false;
	var $m_ShowTimesInSprint = false;
	var $m_ShowCourseResults = false;
	var $m_NoEcardEntry = false;
	var $m_AllowNewClub = false;
	var $m_MultiDayStage = -1;
	var $m_MultiDayParent = -1;

	var $m_VideoFormat = "";
	var $m_VideoUrl = "";
	var $m_TwitterFeed = "";
	var $m_QualLimits = "";
	var $m_QualClasses = "";
	var $m_InfoText = "";
	var $m_LiveCenterURL = "";
	var $m_Sport = "";
	var $m_Conn;

	private static function openConnection()
	{
		$conn = mysqli_connect(DBConfig::$db_server, DBConfig::$db_user, DBConfig::$db_pw, DBConfig::$db_database);
		if (mysqli_connect_errno()) {
			printf("Connect failed: %s\n", mysqli_connect_error());
			exit();
		}
		mysqli_set_charset($conn, self::$MYSQL_CHARSET);

		$scale  = 10;    // Scaledown factor
		if (rand(1, $scale) == 1) // Use scaledown factor to reduce number of updates
		{
			// Keeps track of number of connects and provides data to returns update 
			// interval factor to ensure number of connects does not violate limit

			$target = 30000; // Connects per hour (limit)			
			$UFmin  = 0.01;  // Smallest update factor
			$UFmax  = 1.0;   // Largest update factor
			$window = 60;    // [s] Time window in which number of connects is counted
			$tFilt  = 300;   // [s] Filter constant for updating updateFactor

			$result = mysqli_query($conn, "SELECT numConnect, time, updateFactor FROM lastconnect");
			$last = mysqli_fetch_array($result);
			$num0  = $last["numConnect"];
			$UF0   = $last["updateFactor"];
			$time0 = $last["time"];
			mysqli_free_result($result);

			$time    = time();
			$timeOutdate = $time - $window;

			// Update this connect and delete outdated
			mysqli_query($conn, "INSERT INTO connecttimes VALUES (10001, $time)");
			mysqli_query($conn, "DELETE FROM connecttimes WHERE time < " . $timeOutdate);
			$result = mysqli_query($conn, "SELECT COUNT(*) AS num FROM connecttimes");
			$tmp = mysqli_fetch_array($result);
			$num = $tmp["num"];
			mysqli_free_result($result);

			$targetW = $target / 3600 * $window / $scale;         // Target value for current window
			$dt      = max(1, min($window, $time - $time0));    // Time since last update 
			$UFi     = min(1.01, $UF0 * $targetW / max(1, $num)); // Ideal update factor
			$UF      = max($UFmin, min($UFmax, $UF0 + ($UFi - $UF0) * $dt / $tFilt)); // New factor

			mysqli_query($conn, "UPDATE lastconnect SET numConnect=$num, updateFactor=$UF, time=$time WHERE ID = 0");
		}
		return $conn;
	}

	public static function GetCompetitions()
	{
		$conn = self::openConnection();
		$result = mysqli_query($conn, "SELECT L.compName, L.compDate, L.tavid, L.organizer, L.timediff, L.multidaystage,
    L.multidayparent, L.livecenterurl, L.sport, A.changed FROM login L LEFT JOIN lastactive A ON L.tavid = A.tavid
    WHERE public = 1 ORDER BY compDate DESC, compName");
		$ret = array();
		while ($tmp = mysqli_fetch_array($result))
			$ret[] = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function GetCompetitionsToday()
	{
		$conn = self::openConnection();
		$result = mysqli_query($conn, "SELECT L.compName, L.compDate, L.tavid, L.organizer, L.timediff, L.multidaystage,
     L.multidayparent, L.livecenterurl, L.sport, A.changed FROM login L LEFT JOIN lastactive A ON L.tavid = A.tavid
     WHERE public = 1 AND compDate = '" . date("Y-m-d") . "' ORDER BY compName");
		$ret = array();
		while ($tmp = mysqli_fetch_array($result))
			$ret[] = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function GetRadioControls($compid)
	{
		$conn = self::openConnection();
		$result = mysqli_query($conn, "select * from splitcontrols where tavid=$compid order by corder");
		$ret = array();
		while ($tmp = mysqli_fetch_array($result))
			$ret[] = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function DelRadioControl($compid, $code, $classname)
	{
		$conn = self::openConnection();
		mysqli_query($conn, "delete from splitcontrols where tavid=$compid and code=$code and classname='$classname'");
	}

	public static function DelAllRadioControls($compid)
	{
		$conn = self::openConnection();
		mysqli_query($conn, "delete from splitcontrols where tavid=$compid");
	}

	public static function CreateCompetition($name, $org, $date, $sport)
	{
		$conn = self::openConnection();
		$res = mysqli_query($conn, "select max(tavid)+1 from login");
		if ($sport == "Orientering" || $sport == "Skiorientering") {
			$showecardtimes = 1;
			$hightime = 60;
		} else {
			$showecardtimes = 0;
			$hightime = 30;
		}
		list($id) = mysqli_fetch_row($res);
		if ($id < 10000)
			$id = 10000;
		mysqli_query($conn, "insert into login(tavid,user,pass,compName,organizer,compDate,public,massstartsort,tenthofseconds,fullviewdefault,rankedstartlist,
		hightime,liveloxid,quallimits,qualclasses,multidaystage,multidayparent,showinfo,infotext,showecardtimes,showtimesinsprint,livecenterurl,sport)
		values($id,'" . md5($name . $org . $date) . "','" . md5("liveresultat") . "','$name','$org','$date',1,0,0,0,1,$hightime,0,'',
		'',0,0,0,'',$showecardtimes,0,'','$sport')") or die(mysqli_error($conn));
		return $id;
	}

	public static function CreateCompetitionFull($name, $org, $date, $email, $password, $country)
	{
		$conn = self::openConnection();
		$res = mysqli_query($conn, "select max(tavid)+1 from login");
		list($id) = mysqli_fetch_row($res);
		if ($id < 10000)
			$id = 10000;
		mysqli_query($conn, "insert into login(tavid,user,pass,compName,organizer,compDate,public, country) values(" . $id . ",'" . $email . "','" . md5($password) . "','" . $name . "','" . $org . "','" . $date . "',0,'" . $country . "')") or die(mysqli_error($conn));
		return $id;
	}

	public static function AddRadioControl($compid, $classname, $name, $code, $order = null)
	{
		$conn = self::openConnection();
		$res = mysqli_query($conn, "select max(corder)+1 from splitcontrols where classname='$classname' and tavid=$compid");
		list($id) = mysqli_fetch_row($res);
		$orderStr = ($order !== null && $order > 0 ? $order : ($id !== null ? $id : 1));
		mysqli_query($conn, "insert into splitcontrols(tavid,classname,name,code,corder) values($compid,'$classname','$name',$code,$orderStr)") or die(mysqli_error($conn));
	}

	public static function AddRadioControlsForAllClasses($compid, $name, $code, $order)
	{
		$ret = false;
		$conn = self::openConnection();
		$ret1 = mysqli_query($conn, "SELECT class From runners where tavid=$compid AND Class NOT LIKE 'NOCLAS' GROUP BY class");
		if ($ret1) {
			$classes = array();
			while ($tmp = mysqli_fetch_array($ret1))
				$classes[] = $tmp;
			mysqli_free_result($ret1);

			foreach ($classes as $classname) {
				$sql = "insert into splitcontrols(tavid,classname,name,code,corder) values($compid,'" . $classname[0] . "','$name',$code,$order)";
				$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
				if (!$ret) {
					die(mysqli_error($conn));
					break;
				}
			}
		} else
			die(mysqli_error($conn));
		return $ret;
	}

	public static function SetLastActive($id)
	{
		$conn = self::openConnection();
		$sql = "insert into lastactive (tavid,changed) values ($id,CURRENT_TIMESTAMP) on duplicate key update changed=CURRENT_TIMESTAMP";
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function UpdateCompetition(
		$id,
		$name,
		$org,
		$date,
		$public,
		$timediff,
		$massstartsort,
		$tenthofseconds,
		$fullviewdefault,
		$rankedstartlist,
		$hightime,
		$liveloxid,
		$quallimits,
		$qualclasses,
		$multidaystage,
		$multidayparent,
		$showinfo,
		$infotext,
		$showecardtimes,
		$showtimesinsprint,
		$showcourseresults,
		$noecardentry,
		$allownewclub,
		$livecenterurl,
		$sport
	) {
		$conn = self::openConnection();
		$sql = "update login set compName = '$name'
			, organizer='$org'
			, compDate ='$date'
			, timediff=$timediff
			, hightime=$hightime
			, liveloxid=$liveloxid
			, quallimits='$quallimits'
			, qualclasses='$qualclasses'
			, multidaystage='$multidaystage'
			, multidayparent='$multidayparent'
			, sport='$sport'
			, public=" . (!isset($public) ? "0" : "1") . "
			, massstartsort=" . (!isset($massstartsort) ? "0" : "1") . "
			, tenthofseconds=" . (!isset($tenthofseconds) ? "0" : "1") . "
			, fullviewdefault=" . (!isset($fullviewdefault) ? "0" : "1") . "
			, rankedstartlist=" . (!isset($rankedstartlist) ? "0" : "1") . "
			, showinfo=" . (!isset($showinfo) ? "0" : "1") . "
			, showecardtimes=" . (!isset($showecardtimes) ? "0" : "1") . "
			, showtimesinsprint=" . (!isset($showtimesinsprint) ? "0" : "1") . "
			, showcourseresults=" . (!isset($showcourseresults) ? "0" : "1") . "
			, noecardentry=" . (!isset($noecardentry) ? "0" : "1") . "
			, allownewclub=" . (!isset($allownewclub) ? "0" : "1") . "
			, infotext='$infotext'
			, livecenterurl='$livecenterurl' WHERE tavid=$id";
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function GetAllCompetitions()
	{
		$conn = self::openConnection();
		$result = mysqli_query($conn, "select compName,compDate,tavid,timediff,organizer,public,livecenterurl,sport from login order by compDate desc, compName");
		$ret = array();
		while ($tmp = mysqli_fetch_array($result))
			$ret[] = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function GetCompetition($compid)
	{
		$conn = self::openConnection();
		$result = mysqli_query($conn, "select compName, compDate, tavid, organizer, public, timediff, massstartsort, tenthofseconds, 
				fullviewdefault, rankedstartlist, hightime, liveloxid, quallimits, qualclasses, timezone, videourl, videotype, multidaystage, 
				multidayparent, showinfo, infotext, showecardtimes, showtimesinsprint, noecardentry, allownewclub, livecenterurl, showcourseresults, sport 
				from login WHERE tavid=$compid");
		$ret = null;
		while ($tmp = mysqli_fetch_array($result))
			$ret = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function GetAllRunnerData($compid)
	{
		$conn = self::openConnection();

		$q = "SELECT runners.tavid, runners.dbid, runners.bib, runners.name, runners.club, runners.class, runners.ecardchecked, results.time, results.status FROM runners, results ";
		$q .= "WHERE runners.tavid=" . $compid . " AND results.tavid=" . $compid . " AND results.dbid = runners.dbid AND results.control = 1000 order by bib";
		$result = mysqli_query($conn, $q);
		$ret = array();
		while ($tmp = mysqli_fetch_array($result))
			$ret[] = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function GetRunnerData($compid, $dbid)
	{
		$conn = self::openConnection();

		$q = "SELECT runners.tavid, runners.dbid, runners.bib, runners.name, runners.club, runners.class, runners.ecardchecked, results.time, results.status FROM runners, results ";
		$q .= "WHERE runners.tavid=" . $compid . " AND results.tavid=" . $compid . " AND results.dbid = runners.dbid AND results.control = 1000 AND runners.dbid=" . $dbid;

		$result = mysqli_query($conn, $q);
		$ret = null;
		while ($tmp = mysqli_fetch_array($result))
			$ret = $tmp;
		mysqli_free_result($result);
		return $ret;
	}

	public static function UpdateRunner($compid, $dbid, $bib, $name, $club, $class, $time, $status, $ecardchecked)
	{
		$conn = self::openConnection();
		$q1 = "UPDATE runners SET bib=" . $bib . ", name='" . $name . "', club='" . $club . "', class='" . $class . "', 
		       ecardchecked=" . (!isset($ecardchecked) ? "0" : "1") . " WHERE tavid=" . $compid . " AND dbid=" . $dbid;
		$ret1 = mysqli_query($conn, $q1) or die(mysqli_error($conn));

		$q2 = "UPDATE results SET time=" . $time . ", status=" . $status . " WHERE tavid=" . $compid . " AND dbid=" . $dbid . " AND control=1000";
		$ret2 = mysqli_query($conn, $q2) or die(mysqli_error($conn));

		return $ret1 + $ret2;
	}

	public static function DelRunner($compid, $dbid)
	{
		$conn = self::openConnection();
		$ret1 = mysqli_query($conn, "DELETE FROM runners WHERE tavid=$compid AND dbid=$dbid");
		$ret2 = mysqli_query($conn, "DELETE FROM results WHERE tavid=$compid AND dbid=$dbid");
		return ($ret1 && $ret2);
	}

	public static function SendMessage($compid, $dbid, $changed, $message, $dns, $ecardchange, $completed, $newentry)
	{
		$conn = self::openConnection();
		$res = mysqli_query($conn, "select max(messid)+1 from messages");
		list($messid) = mysqli_fetch_row($res);
		if ($messid < 1)
			$messid = 1;
		$ret = mysqli_query($conn, "insert into messages(messid,tavid,dbid,changed,message,dns,ecardchange,completed,newentry)
		  values(" . $messid . "," . $compid . "," . $dbid . ",FROM_UNIXTIME(" . $changed . "),'" . $message . "'," . $dns . "," . $ecardchange . "," . $completed . "," . $newentry . ")")
			or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageEcardChecked($compid, $dbid, $bib)
	{
		$conn = self::openConnection();
		if ($dbid > 0)
			$sql = "update runners set ecardchecked=1 where tavid=" . $compid . " AND dbid=" . $dbid;
		else
			$sql = "update runners set ecardchecked=1 where tavid=" . $compid . " AND (bib=" . $bib . " OR bib=-" . $bib . ")";
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageEcardNotChecked($compid, $dbid, $bib)
	{
		$conn = self::openConnection();
		if ($dbid > 0)
			$sql = "update runners set ecardchecked=0 where tavid=" . $compid . " AND dbid=" . $dbid;
		else
			$sql = "update runners set ecardchecked=0 where tavid=" . $compid . " AND (bib=" . $bib . " OR bib=-" . $bib . ")";
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageCompleted($messid, $completed)
	{
		$conn = self::openConnection();
		$sql = "update messages set completed = " . $completed . " where messid = " . $messid;
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageDBID($messid, $dbid)
	{
		$conn = self::openConnection();
		$sql = "update messages set dbid = " . $dbid . " where messid = " . $messid;
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageDNS($messid, $DNS)
	{
		$conn = self::openConnection();
		$sql = "update messages set dns = " . $DNS . " where messid = " . $messid;
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageEcardChange($messid, $ecardchange)
	{
		$conn = self::openConnection();
		$sql = "update messages set ecardchange = " . $ecardchange . " where messid = " . $messid;
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function SetMessageNewEntry($messid, $newentry)
	{
		$conn = self::openConnection();
		$sql = "update messages set newentry = " . $newentry . " where messid = " . $messid;
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}

	public static function GetNumConnect()
	{
		$conn = self::openConnection();
		$sql = "SELECT numConnect AS num, updateFactor AS UF FROM lastconnect";
		$ret = mysqli_query($conn, $sql) or die(mysqli_error($conn));
		return $ret;
	}
	public static function getTestResultsForRunner($name, $races)
	{
		$conn = self::openConnection();
		$ret = array();
		$sql = "SELECT runners.name, runners.class, runners.tavid, results.time, results.status, login.compdate FROM runners, results, login 
		WHERE runners.name LIKE '%$name%'
		AND results.dbid = runners.dbid AND results.tavid = runners.tavid AND login.tavid = runners.tavid AND results.tavid IN ($races) 
		AND results.control = 1000 ORDER BY login.compdate";
		if ($result = mysqli_query($conn, $sql)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($conn));
		return $ret;
	}

	function __construct($compID)
	{
		$this->m_CompId = $compID;
		$this->m_Conn = self::openConnection();
		$result = mysqli_query($this->m_Conn, "select * from login where tavid = $compID");
		if ($tmp = mysqli_fetch_array($result)) {
			$this->m_CompName = $tmp["compName"];
			$this->m_Organizer = $tmp["organizer"];
			$this->m_CompDate = date("Y-m-d", strtotime($tmp["compDate"]));
			$this->m_TimeDiff = $tmp["timediff"] * 3600;
			$this->m_HighTime = $tmp["hightime"];
			$this->m_LiveloxID = $tmp["liveloxid"];
			$this->m_UseMassStartSort = $tmp["massstartsort"];
			$this->m_ShowTenthOfSeconds = $tmp["tenthofseconds"];
			$this->m_ShowFullView = $tmp["fullviewdefault"];
			$this->m_RankedStartList = $tmp["rankedstartlist"];
			$this->m_QualLimits = $tmp["quallimits"];
			$this->m_QualClasses = $tmp["qualclasses"];
			$this->m_ShowInfo = $tmp["showinfo"];
			$this->m_InfoText = str_replace('"', '\"', $tmp["infotext"]);
			$this->m_ShowEcardTimes = $tmp["showecardtimes"];
			$this->m_ShowTimesInSprint = $tmp["showtimesinsprint"];
			$this->m_ShowCourseResults = $tmp["showcourseresults"];
			$this->m_NoEcardEntry = $tmp["noecardentry"];
			$this->m_AllowNewClub = $tmp["allownewclub"];
			$this->m_LiveCenterURL = $tmp["livecenterurl"];
			$this->m_Sport = $tmp["sport"];

			if (isset($tmp["videourl"]))
				$this->m_VideoUrl = $tmp["videourl"];
			if (isset($tmp["videotype"]))
				$this->m_VideoFormat = $tmp["videotype"];
			if (isset($tmp["twitter"]))
				$this->m_TwitterFeed = $tmp["twitter"];
			if (isset($tmp['multidaystage'])) {
				if ($tmp['multidaystage'] != null && $tmp['multidayparent'] != null && $tmp['multidaystage'] > 1) {
					$this->m_IsMultiDayEvent = true;
					$this->m_MultiDayStage = $tmp['multidaystage'];
					$this->m_MultiDayParent = $tmp['multidayparent'];
				}
			}
		}
	}

	function IsMultiDayEvent()
	{
		return $this->m_IsMultiDayEvent;
	}

	function HasVideo()
	{
		return $this->m_VideoFormat != "";
	}

	function HasTwitter()
	{
		return $this->m_TwitterFeed != "";
	}

	function GetVideoEmbedCode()
	{
		if ($this->m_VideoFormat == "bambuser") {
			return '<iframe src="http://embed.bambuser.com/channel/' . $this->m_VideoUrl . '" width="460" height="403" frameborder="0">Your browser does not support iframes.</iframe>';
		}
		return "";
	}

	function GetTwitterFeed()
	{
		return $this->m_TwitterFeed;
	}

	function CompName()
	{
		return $this->m_CompName;
	}

	function CompDate()
	{
		return $this->m_CompDate;
	}

	function Organizer()
	{
		return $this->m_Organizer;
	}

	function TimeZoneDiff()
	{
		return $this->m_TimeDiff / 3600;
	}

	function HighTime()
	{
		return $this->m_HighTime;
	}

	function LiveloxID()
	{
		return $this->m_LiveloxID;
	}

	function MassStartSorting()
	{
		return $this->m_UseMassStartSort;
	}

	function FullView()
	{
		return $this->m_ShowFullView;
	}

	function ShowTimesInSprint()
	{
		return $this->m_ShowTimesInSprint;
	}

	function ShowCourseResults()
	{
		return $this->m_ShowCourseResults;
	}

	function NoEcardEntry()
	{
		return $this->m_NoEcardEntry;
	}

	function AllowNewClub()
	{
		return $this->m_AllowNewClub;
	}

	function RankedStartlist()
	{
		return $this->m_RankedStartList;
	}

	function ShowTenthOfSeconds()
	{
		return $this->m_ShowTenthOfSeconds;
	}

	function QualLimits()
	{
		return $this->m_QualLimits;
	}

	function QualClasses()
	{
		return $this->m_QualClasses;
	}

	function ShowInfo()
	{
		return $this->m_ShowInfo;
	}

	function InfoText()
	{
		return $this->m_InfoText;
	}

	function ShowEcardTimes()
	{
		return $this->m_ShowEcardTimes;
	}

	function LiveCenterURL()
	{
		return $this->m_LiveCenterURL;
	}

	function Sport()
	{
		return $this->m_Sport;
	}

	function IsCompActive()
	{
		// Check if client is active on current competion
		$q = "SELECT changed from lastactive where TavId = " . $this->m_CompId;
		if ($result = mysqli_query($this->m_Conn, $q)) {
			$secondsDiff = 9999;
			$last = mysqli_fetch_array($result);
			if ($last) {
				$changed = $last["changed"];
				$secondsDiff = time() - strtotime($changed);
			}
			return ($secondsDiff < 120 ? 1 : 0);
		} else {
			die(mysqli_error($this->m_Conn));
			return 0;
		}
	}

	function GetUpdateFactor()
	{
		// Returns updated interval factor to ensure number of connects does not violate limit
		$q = "SELECT updateFactor FROM lastconnect";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			$last = mysqli_fetch_array($result);
			$UF   = $last["updateFactor"];
			return $UF;
		} else {
			die(mysqli_error($this->m_Conn));
			return 1;
		}
	}

	function Classes($firstPart = null)
	{
		$select = ($firstPart != null ? " AND Class LIKE '" . $firstPart . "%' " : "");
		$ret = array();
		$q = "SELECT Class FROM runners WHERE TavId = " . $this->m_CompId . " AND Class NOT LIKE 'NOCLAS' " . $select . " GROUP BY Class";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function Courses($className)
	{
		$ret = array();
		$q = "SELECT course FROM runners WHERE TavId = " . $this->m_CompId . " AND course >-1 AND Class = '" . mysqli_real_escape_string($this->m_Conn, $className) . "' GROUP BY course";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row[0];
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function CourseNames($courseNo = null)
	{
		$ret = array();
		$q = "SELECT runners.course AS courseno, coursedata.name AS coursename FROM runners ";
		$q .= "LEFT JOIN coursedata ON coursedata.tavid = runners.tavid AND coursedata.courseno = runners.course WHERE runners.tavid = " . $this->m_CompId;
		if ($courseNo != null)
			$q .= " AND course =" . $courseNo;
		else
			$q .= " AND course >-1";
		$q .= " GROUP BY course";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($tmp = mysqli_fetch_array($result))
				$ret[] = $tmp;
			mysqli_free_result($result);
		} else
			echo (mysqli_error($this->m_Conn));
		return $ret;
	}

	function numberOfRunners()
	{
		$ret = [];
		$q = "SELECT COUNT(*) AS num FROM runners WHERE TavId = " . $this->m_CompId . " AND Class NOT LIKE 'NOCLAS'";

		if ($result = mysqli_query($this->m_Conn, $q))
			$ret = $result;
		else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function numberOfStartedRunners()
	{
		$ret = [];
		$q = "SELECT COUNT(*) AS num FROM results, runners WHERE results.TavId =" . $this->m_CompId . " AND runners.TavID = " . $this->m_CompId . " AND results.dbid = runners.dbid ";
		$q .= "AND runners.Class NOT LIKE 'NOCLAS' AND results.control = 1000 AND results.Status != 1";

		if ($result = mysqli_query($this->m_Conn, $q))
			$ret = $result;
		else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function numberOfFinishedRunners()
	{
		$ret = [];
		$q = "SELECT COUNT(*) AS num FROM results, runners WHERE results.TavId =" . $this->m_CompId . " AND runners.TavID = " . $this->m_CompId . " AND results.dbid = runners.dbid ";
		$q .= "AND runners.Class NOT LIKE 'NOCLAS' AND results.control = 1000 AND results.Status != 1 AND results.Status != 9 AND results.Status != 10";
		if ($result = mysqli_query($this->m_Conn, $q))
			$ret = $result;
		else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getAllSplitControls()
	{
		$ret = array();
		$q = "SELECT code, name, classname, corder from splitcontrols where tavid = " . $this->m_CompId . " order by corder";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($tmp = mysqli_fetch_array($result))
				$ret[] = $tmp;
			mysqli_free_result($result);
		} else
			echo (mysqli_error($this->m_Conn));
		return $ret;
	}

	function getSplitControlsForClub($club)
	{
		$ret = array();
		$q = "SELECT DISTINCT splitcontrols.code, splitcontrols.name, splitcontrols.classname, splitcontrols.corder,";
		$q .= " (SELECT MIN(results.time) FROM results";
		$q .= " JOIN runners ON results.dbid = runners.dbid AND results.tavid = runners.tavid";
		$q .= " WHERE results.control = splitcontrols.code";
		$q .= " AND results.time > 0";
		$q .= " AND runners.tavid = splitcontrols.tavid";
		$q .= " AND runners.class = splitcontrols.classname";
		$q .= " AND runners.dbid IN (";
		$q .= "     SELECT dbid FROM results WHERE control = 1000 AND status IN (0, 9, 10)";
		$q .= "     AND tavid = splitcontrols.tavid";
		$q .= " )) AS besttime";
		$q .= " FROM splitcontrols JOIN runners ON splitcontrols.tavid = runners.tavid AND splitcontrols.classname = runners.class";
		$q .= " WHERE splitcontrols.tavid = " . $this->m_CompId;
		$q .= " AND runners.club = '" . mysqli_real_escape_string($this->m_Conn, $club) . "'";
		$q .= " AND splitcontrols.code > 1000 AND splitcontrols.code < 10999";
		$q .= " ORDER BY splitcontrols.classname, splitcontrols.corder";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($tmp = mysqli_fetch_array($result))
				$ret[] = $tmp;
			mysqli_free_result($result);
		} else
			echo (mysqli_error($this->m_Conn));
		return $ret;
	}


	function getSplitControlsForClass($className)
	{
		$ret = array();
		$q = "SELECT code, name from splitcontrols where tavid = " . $this->m_CompId . " and classname = '" . mysqli_real_escape_string($this->m_Conn, $className) . "' order by corder asc, code desc";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($tmp = mysqli_fetch_array($result))
				$ret[] = $tmp;
			mysqli_free_result($result);
		} else
			echo (mysqli_error($this->m_Conn));
		return $ret;
	}

	function getResultsForClass($className)
	{
		return $this->getSplitsForClass($className, 1000);
	}

	function getLastPassings($num)
	{
		$ret = array();
		$q = "SELECT 
				runners.Name, 
				runners.bib, 
				runners.class, 
				runners.Club, 
				results.Time, 
				results.Status, 
				results.Changed, 
				results.Control,
				(
					SELECT COUNT(*) + 1 
					FROM results sre
					JOIN runners sru ON sre.tavid = sru.tavid AND sre.dbid = sru.dbid
					WHERE 
					sre.tavid = results.tavid
					AND sru.class = runners.class
					AND sre.control = results.control
					AND sre.time < results.time
					AND sre.time > 0
					AND sre.dbid IN (
						SELECT dbid FROM results WHERE tavid = sre.tavid AND control = 1000 AND status IN (0, 9, 10)
					)
				) AS place,
				splitcontrols.name as pname
				FROM 
				results
				INNER JOIN runners ON results.dbid = runners.dbid AND results.tavid = runners.tavid
				LEFT JOIN splitcontrols 
					ON splitcontrols.code = results.Control 
					AND splitcontrols.tavid = results.tavid
					AND runners.class = splitcontrols.classname
				WHERE
				results.tavid = {$this->m_CompId}
				AND results.Time > 0
				AND results.Status NOT IN (-1, 6, 9, 10)
				AND results.Control <> 100
				AND (results.Control = 1000 OR splitcontrols.tavid IS NOT NULL)
				AND results.Control NOT IN (999, 0, -999)
				AND results.Control < 100000
				AND runners.class NOT LIKE '%-All'
				ORDER BY 
				results.changed DESC, runners.name, results.Control
				LIMIT {$num}";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$ret[] = $row;
				if ($this->m_TimeDiff != 0) {
					$ret[sizeof($ret) - 1]["Changed"] = date("Y-m-d H:i:s", strtotime($ret[sizeof($ret) - 1]["Changed"]) + $this->m_TimeDiff);
				}
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getRadioPassings($code, $lastUpdate, $maxNum)
	{
		$ret = array();
		if ($code == -2) // Left in forest
			$q = "SELECT runners.Name, runners.bib, runners.class, runners.Club, runners.ecardchecked, runners.dbid,
			results2.Time, results.Status, results.Changed, results.Control, splitcontrols.name AS pname 
			FROM results 
			INNER JOIN runners ON results.DbId = runners.DbId 
			LEFT JOIN splitcontrols ON (splitcontrols.code = results.Control AND splitcontrols.tavid=" . $this->m_CompId . " AND runners.class = splitcontrols.classname) 
			LEFT JOIN results AS results2 ON results.DbID=results2.DbID
			WHERE results.TavId =" . $this->m_CompId . "  AND results2.TavId = results.TavId
			AND runners.TavId = results.TavId AND (results.Status = 9 OR results.Status = 10) AND results.control = 1000 AND results2.Control = 100 AND runners.class NOT LIKE '%-All' 
			ORDER BY runners.Club, results2.Time, runners.Name";
		else {
			$q = "SELECT runners.Name, runners.bib, runners.class, runners.Club, results.dbid, results.Time, results.Status, results.Changed, 
			results.Control, splitcontrols.name as pname From results inner join runners on results.DbId = runners.DbId 
			left join splitcontrols on (splitcontrols.code = results.Control and splitcontrols.tavid=" . $this->m_CompId . " 
			AND runners.class = splitcontrols.classname) 
			WHERE results.TavId =" . $this->m_CompId . " 
			AND runners.TavId = results.TavId ";

			if ($code == 1000) // Finish
				$q .= "AND results.Time <> -1 AND results.Status <> -1 AND results.Status <> 9 AND results.Status <> 1
				AND results.Status <> 10 AND results.control = 1000 
				AND runners.class NOT LIKE '%-All'  
				AND (results.changed > '" . $lastUpdate . "') ORDER BY results.changed desc limit " . $maxNum;
			elseif ($code == -1) // All radio controls (not including start and finish)
				$q .= "AND results.Time <> -1  AND results.Status <> -1 AND results.Status <> 9 AND results.Status <> 10 AND splitcontrols.tavid is not null 
				AND results.control < 100000 AND ABS(results.control)%1000 > 0  AND ABS(results.control)%1000 < 999 AND runners.class NOT LIKE '%-All' 
				AND (results.changed > '" . $lastUpdate . "') ORDER BY results.changed desc limit " . $maxNum;
			else // Other controls
				$q .= "AND results.Time <> -1  AND results.Status <> -1 AND results.Status <> 9 AND results.Status <> 10 AND splitcontrols.tavid is not null 
				AND results.control < 100000 AND ABS(results.control)%1000 = " . $code . " AND runners.class NOT LIKE '%-All' 
				AND (results.changed > '" . $lastUpdate . "') ORDER BY results.changed desc limit " . $maxNum;
		}

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$ret[] = $row;
				$ret[sizeof($ret) - 1]["changedRaw"] =  date("Y-m-d H:i:s", strtotime($ret[sizeof($ret) - 1]["Changed"]));
				if ($this->m_TimeDiff != 0) {
					$ret[sizeof($ret) - 1]["Changed"] = date("Y-m-d H:i:s", strtotime($ret[sizeof($ret) - 1]["Changed"]) + $this->m_TimeDiff);
				}
				if ($code == -2)    // Left in forest
					$ret[sizeof($ret) - 1]["pname"] = "I skogen";
				if ($code == 1000) // Finish
					$ret[sizeof($ret) - 1]["pname"] = "Mål";
				$ret[sizeof($ret) - 1]["compName"] = $this->m_CompName;
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getSplitsForClass($className, $split)
	{
		$ret = array();
		$q = "SELECT runners.Name, runners.Club, results.Time, results.Status, results.Changed From runners, results where results.DbID = runners.DbId AND results.TavId = " . $this->m_CompId . " AND runners.TavId = " . $this->m_CompId . " AND runners.Class = '" . $className . "' and results.Status <> -1 AND (results.Time <> -1 or (results.Time = -1 and (results.Status = 2 or results.Status=3))) AND results.Control = $split ORDER BY results.Status, results.Time";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$ret[] = $row;
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getRankForSplitInClass($className, $code, $splitTime)
	{
		$q = "SELECT COUNT(*) AS rank, MIN(results.Time) as bestTime FROM runners, results 
			WHERE results.DbID = runners.DbId AND results.TavId = " . $this->m_CompId . " AND runners.TavId = " . $this->m_CompId . " AND runners.Class = '" . $className . "' AND (results.Status = 0 OR results.Status = 9 OR results.Status = 10) AND results.Time > 0 AND results.Time < $splitTime AND results.Control = $code ";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			$ret = mysqli_fetch_array($result);
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getSecondBestSplitInClass($className, $code)
	{
		$ret = array();
		$q = "SELECT results.Time FROM runners, results 
			WHERE results.DbID = runners.DbId AND results.TavId = " . $this->m_CompId . " AND runners.TavId = " . $this->m_CompId . " AND runners.Class = '" . $className . "' AND (results.Status = 0 OR results.Status = 9 OR results.Status = 10) AND results.Time > 0 AND results.Control = $code ORDER BY results.Time limit 2";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getRunners()
	{
		$ret = array();
		$q = "SELECT runners.name, runners.club, runners.class, runners.ecard1, runners.ecard2, runners.ecardchecked, runners.bib, results.time, results.dbid, results.control, results2.status 
		FROM runners, results
		LEFT JOIN results AS results2 ON results.DbID=results2.DbID
		WHERE results.dbid = runners.dbid AND runners.tavid = " . $this->m_CompId . " AND results.tavid = " . $this->m_CompId . " AND (results.control=100) 
		AND results2.tavid = results.tavid AND (results2.control=1000)
		ORDER BY bib, dbid";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$dbId = $row['dbid'];
				if (!isset($ret[$dbId])) {
					$ret[$dbId] = array();
					$ret[$dbId]["dbid"] = $dbId;
					$ret[$dbId]["name"] = $row['name'];
					$ret[$dbId]["club"] = $row['club'];
					$ret[$dbId]["class"] = $row['class'];
					$ret[$dbId]["ecard1"] = $row['ecard1'];
					$ret[$dbId]["ecard2"] = $row['ecard2'];
					$ret[$dbId]["ecardchecked"] = $row['ecardchecked'];
					$ret[$dbId]["bib"] = $row['bib'];
					$ret[$dbId]["status"] = "0";
					$ret[$dbId]["start"] = "0";
				}
				if ($row['results.control'] = 100)
					$ret[$dbId]["start"] = $row['time'];
				if ($row['results2.control'] = 1000)
					$ret[$dbId]["status"] = $row['status'];
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getStartlist($className)
	{
		$ret = array();
		$q = "SELECT runners.dbid, runners.name, runners.club, runners.length, runners.ecard1, runners.ecard2, runners.bib, results.time, results2.status 
		FROM runners, results
		LEFT JOIN results AS results2 ON results.DbID=results2.DbID
		WHERE results.dbid = runners.dbid AND runners.tavid = " . $this->m_CompId . " AND runners.class = \"" . $className . "\" AND results.tavid = " . $this->m_CompId . " AND (results.control=100) 
		AND results2.tavid = results.tavid AND (results2.control=1000) ORDER BY results.time, abs(bib)";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$dbId = $row['dbid'];
				if (!isset($ret[$dbId])) {
					$ret[$dbId] = array();
					$ret[$dbId]["dbid"] = $dbId;
					$ret[$dbId]["name"] = $row['name'];
					$ret[$dbId]["club"] = $row['club'];
					$ret[$dbId]["length"] = $row['length'];
					$ret[$dbId]["ecard1"] = $row['ecard1'];
					$ret[$dbId]["ecard2"] = $row['ecard2'];
					$ret[$dbId]["bib"] = $row['bib'];
					$ret[$dbId]["status"] = "0";
					$ret[$dbId]["start"] = "0";
				}
				if ($row['results.control'] = 100)
					$ret[$dbId]["start"] = $row['time'];
				if ($row['results2.control'] = 1000)
					$ret[$dbId]["status"] = $row['status'];
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getClubResults($club)
	{
		$ret = array();
		$q = "SELECT runners.dbid, runners.name, runners.bib, runners.club, runners.class, runners.length,";
		$q .= " results.time, results.status, results.changed, results.dbid, results.control,";
		// Place on split in class
		$q .= " (SELECT COUNT(*) + 1 FROM results sre";
		$q .= " JOIN runners sru ON sre.tavid = sru.tavid AND sre.dbid = sru.dbid";
		$q .= " WHERE sre.tavid = results.tavid AND sru.class = runners.class AND sre.control = results.control";
		$q .= " AND sre.time < results.time AND sre.time > 0 AND sre.dbid IN";
		$q .= " (SELECT dbid FROM results WHERE tavid = sre.tavid AND control = 1000";
		$q .= " AND status IN (0, 9, 10)) ) AS place, ";
		// Time plus on split in class
		$q .= " (results.time - (SELECT MIN(sre.time) FROM results sre";
		$q .= " JOIN runners sru ON sre.tavid = sru.tavid AND sre.dbid = sru.dbid";
		$q .= " WHERE sre.tavid = results.tavid AND sru.class = runners.class AND sre.control = results.control";
		$q .= " AND sre.time > 0 AND sre.dbid IN";
		$q .= " (SELECT dbid FROM results WHERE tavid = sre.tavid AND control = 1000";
		$q .= " AND status IN (0, 9, 10)) )) AS timeplus";

		$q .= " FROM runners, results WHERE";
		$q .= " results.dbid = runners.dbid AND results.tavid = " . $this->m_CompId . " AND runners.tavid = " . $this->m_CompId;
		$q .= " AND runners.club = '" . mysqli_real_escape_string($this->m_Conn, $club) . "'";
		$q .= " ORDER BY runners.class, runners.name";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$dbId = $row['dbid'];
				if (!isset($ret[$dbId])) {
					$ret[$dbId] = array();
					$ret[$dbId]["DbId"] = $dbId;
					$ret[$dbId]["Name"] = $row['name'];
					$ret[$dbId]["Bib"] = $row['bib'];
					$ret[$dbId]["Club"] = $row['club'];
					$ret[$dbId]["Class"] = $row['class'];
					$ret[$dbId]["Length"] = $row['length'];
					$ret[$dbId]["Time"] = "";
					$ret[$dbId]["TimePlus"] = "";
					$ret[$dbId]["Status"] = "9";
					$ret[$dbId]["Changed"] = "";
					$ret[$dbId]["Place"]  = "";
				}
				$split = $row['control'];
				if ($split == 1000) {
					$ret[$dbId]["Time"] = $row['time'];
					$ret[$dbId]["Status"] = $row['status'];
					$ret[$dbId]["Changed"] = $row['changed'];
					$ret[$dbId]["Place"] = $row['place'];
					$ret[$dbId]["TimePlus"] = $row['timeplus'];
				} elseif ($split == 100) {
					$ret[$dbId]["start"] = $row['time'];
				} else {
					$ret[$dbId][$split . "_time"] = $row['time'];
					$ret[$dbId][$split . "_changed"] = $row['changed'];
					$ret[$dbId][$split . "_place"] = $row['place'];
					$ret[$dbId][$split . "_timeplus"] = $row['timeplus'];
				}
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getAllSplitsForClass($className)
	{
		$ret = array();
		$q = "SELECT runners.Name, runners.Bib, runners.Club, runners.Length, results.Time ,results.Status, results.Changed, results.DbID, results.Control From runners,results where results.DbID = runners.DbId AND results.TavId = " . $this->m_CompId . " AND runners.TavId = " . $this->m_CompId . " AND runners.Class = '" . mysqli_real_escape_string($this->m_Conn, $className) . "'  ORDER BY results.Dbid";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$dbId = $row['DbID'];
				if (!isset($ret[$dbId])) {
					$ret[$dbId] = array();
					$ret[$dbId]["DbId"] = $dbId;
					$ret[$dbId]["Name"] = $row['Name'];
					$ret[$dbId]["Bib"] = $row['Bib'];
					$ret[$dbId]["Club"] = $row['Club'];
					$ret[$dbId]["Length"] = $row['Length'];
					$ret[$dbId]["Time"] = "";
					$ret[$dbId]["Status"] = "9";
					$ret[$dbId]["Changed"] = "";
				}
				$split = $row['Control'];
				if ($split == 1000) {
					$ret[$dbId]["Time"] = $row['Time'];
					$ret[$dbId]["Status"] = $row['Status'];
					$ret[$dbId]["Changed"] = $row['Changed'];
				} elseif ($split == 100) {
					$ret[$dbId]["start"] = $row['Time'];
				} else {
					$ret[$dbId][$split . "_time"] = $row['Time'];
					$ret[$dbId][$split . "_status"] = $row['Status'];
					$ret[$dbId][$split . "_changed"] = $row['Changed'];
				}
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));

		if (!function_exists("timeSorter")) {
			function timeSorter($a, $b)
			{
				if ($a['Status'] != $b['Status'])
					return intval($a['Status']) - intval($b['Status']);
				else
					return intval($a['Time']) - intval($b['Time']);
			}
		}

		usort($ret, 'timeSorter');
		return $ret;
	}

	function getAllSplitsForCourse($course)
	{
		$ret = array();
		$q  = "SELECT runners.Name, runners.Bib, runners.Club, runners.Class, runners.Length, results.Time, results.Status, results.Changed, results.DbID, results.Control";
		$q .= " FROM runners, results where results.DbID = runners.DbId AND results.TavId = " . $this->m_CompId;
		$q .= " AND runners.TavId = " . $this->m_CompId . " AND runners.Course = " . $course . " ORDER BY results.Dbid, results.Control";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			$useLegTime = false;
			while ($row = mysqli_fetch_array($result)) {
				$dbId = $row['DbID'];
				if (!isset($ret[$dbId])) {
					$useLegTime = false;
					$ret[$dbId] = array();
					$ret[$dbId]["DbId"] = $dbId;
					$ret[$dbId]["Name"] = $row['Name'];
					$ret[$dbId]["Bib"] = $row['Bib'];
					$ret[$dbId]["Club"] = $row['Club'];
					$ret[$dbId]["Length"] = $row['Length'];
					$ret[$dbId]["Class"] = $row['Class'];
					$ret[$dbId]["Time"] = "";
					$ret[$dbId]["Status"] = "9";
					$ret[$dbId]["Changed"] = "";
				}
				$split = $row['Control'];

				if ($split == 0)
					$useLegTime = true;
				elseif ($split == 1000) {
					$ret[$dbId]["Status"] = $row['Status'];
					$ret[$dbId]["Changed"] = $row['Changed'];
					if (!$useLegTime)
						$ret[$dbId]["Time"] = $row['Time'];
				} elseif ($split == 999 && $useLegTime)
					$ret[$dbId]["Time"] = $row['Time'];
				elseif ($split == 100)
					$ret[$dbId]["Start"] = $row['Time'];
				else {
					$ret[$dbId][$split . "_time"] = $row['Time'];
					$ret[$dbId][$split . "_status"] = $row['Status'];
					$ret[$dbId][$split . "_changed"] = $row['Changed'];
				}
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));

		if (!function_exists("timeSorter")) {
			function timeSorter($a, $b)
			{
				if ($a['Status'] != $b['Status'])
					return intval($a['Status']) - intval($b['Status']);
				else
					return intval($a['Time']) - intval($b['Time']);
			}
		}

		usort($ret, 'timeSorter');
		return $ret;
	}

	function getCourseControls($course)
	{
		$ret = array();
		$q = "SELECT code, corder from courses WHERE tavid = " . $this->m_CompId . " AND courseno = " . $course . " ORDER BY corder ASC";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($tmp = mysqli_fetch_array($result))
				$ret[] = $tmp[0];
			mysqli_free_result($result);
		} else
			echo (mysqli_error($this->m_Conn));
		return $ret;
	}

	function getCommonCourseControls($courses)
	{
		$commonControls = array();
		$courseArray = array();
		$n = sizeof($courses);
		if ($n > 0) {
			$courseNo = $courses[0];
			$courseArray[$courseNo] = $this->getCourseControls($courseNo);
			$commonControls = $courseArray[$courseNo];
			for ($c = 1; $c < $n; $c++) {
				$courseNo = $courses[$c];
				$courseArray[$courseNo] = $this->getCourseControls($courseNo);
				$courseControls = $courseArray[$courseNo];
				$com_idx = 0;
				$cou_idx = 0;
				while ($com_idx < sizeof($commonControls)) {
					$com_control = $commonControls[$com_idx];
					$cou_ptr = $cou_idx;
					while ($cou_ptr < sizeof($courseControls)) {
						if ($courseControls[$cou_ptr] == $com_control) {
							$cou_idx = $cou_ptr + 1;
							$com_idx++;
							break;
						} else if (in_array($courseControls[$cou_ptr], array_slice($courseControls, 0, $cou_ptr))) // control appears multiple times
						{
							array_splice($commonControls, $com_idx, 1);
							break;
						}
						$cou_ptr++;
					}
					if ($cou_ptr == sizeof($courseControls)) // Common control not found in control set
						array_splice($commonControls, $com_idx, 1);
				}
			}
		}
		return [$commonControls, $courseArray];
	}

	function getEcardTimesForClassCourse($className, $course)
	{
		$common = ($course == -1); // All common controls
		if ($common) {
			$courses = $this->Courses($className);
			$ret = $this->getCommonCourseControls($courses);
			$controls = $ret[0];
			$courseArray = $ret[1];
		} else {
			$courses = [$course];
			$controls = $this->getCourseControls($course);
		}

		if ($className == "AllClasses")
			$classQuery = "";
		else
			$classQuery = "AND runners.Class = '" . mysqli_real_escape_string($this->m_Conn, $className) . "' ";

		$ret = array();
		$q = "SELECT runners.Name, runners.Bib, runners.Club, runners.ecardtimes, runners.course, runners.Length, results.Time, ";
		$q .= "results.Status, results.Changed, results.DbID, results.Control ";
		$q .= "FROM runners, results WHERE results.DbID = runners.DbId AND results.TavId = " . $this->m_CompId . " ";
		$q .= "AND runners.TavId = " . $this->m_CompId . " AND runners.course IN (" . implode(',', $courses) . ") ";
		$q .= "AND results.Control IN (-999, 999, 1000) AND results.Status IN (0, 2, 3, 4, 6, 13) ";
		$q .= $classQuery;
		$q .= "ORDER BY results.Dbid, results.Control";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result)) {
				$dbId = intval($row['DbID']);
				if (!isset($ret[$dbId])) {
					$ret[$dbId] = array();
					$ret[$dbId]["DbId"]   = $dbId;
					$ret[$dbId]["Name"]   = $row['Name'];
					$ret[$dbId]["Bib"]    = intval($row['Bib']);
					$ret[$dbId]["Club"]   = $row['Club'];
					$ret[$dbId]["Length"] = $row['Length'];
				}
				$finishTime = 0;
				$split = $row['Control'];
				if ($split == -999) {
					$ret[$dbId]["Time"] = intval($row['Time']);
					$finishTime = intdiv($row['Time'], 100);
				} else if ($split == 999) {
					if (!isset($ret[$dbId]["Time"]))
						$ret[$dbId]["Time"] = intval($row['Time']);
					$finishTime = intdiv($row['Time'], 100);
				} else if ($split == 1000) {
					if (!isset($ret[$dbId]["Time"]))
						$ret[$dbId]["Time"] = intval($row['Time']);
					if ($finishTime == 0)
						$finishTime = intdiv($row['Time'], 100);
					$ret[$dbId]["Status"] = intval($row['Status']);
				}

				if (!isset($ret[$dbId]["1_pass_time"])) {
					$ecardtimes = explode(",", $row['ecardtimes']);
					if ($common && sizeof($controls) != sizeof($ecardtimes)) {
						$courseNo = $row['course'];
						$runnerControls = $courseArray[$courseNo];
						$commonTimes = [];
						$timesPtr = 0;
						for ($i = 0; $i < sizeof($controls); $i++) {
							do {
								if ($runnerControls[$timesPtr] == $controls[$i]) {
									$commonTimes[$i] = $ecardtimes[$timesPtr];
									$timesPtr++;
									break;
								} else
									$timesPtr++;
							} while ($timesPtr <= sizeof($runnerControls));
						}
						$ecardtimes = $commonTimes;
					}

					$lastTime = 0;
					if (sizeof($controls) == sizeof($ecardtimes)) {
						for ($split = 0; $split < sizeof($controls); $split++) {
							$passTime = intval($ecardtimes[$split]);
							if ($passTime > 0 && $lastTime > -1)
								$splitTime = $passTime - $lastTime;
							else
								$splitTime = -1;
							$lastTime = $passTime;

							$ret[$dbId][($split + 1) . "_pass_time"] = $passTime;
							$ret[$dbId][($split + 1) . "_split_time"] = $splitTime;
						}
						$ret[$dbId][($split + 1) . "_pass_time"] = $finishTime;
						if ($finishTime > $lastTime && $lastTime > -1)
							$ret[$dbId][($split + 1) . "_split_time"] = $finishTime - $lastTime;
						else
							$ret[$dbId][($split + 1) . "_split_time"] = -1;
					}
				}
			}
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));

		return [$ret, $controls];
	}

	function getTotalResultsForClass($className)
	{
		$ret = array();
		$ar = array();
		if ($this->m_MultiDayParent == -1) {
			$comps = "(" . $this->m_CompId . ")";
		} else {
			$q  = "SELECT TavId, multidaystage FROM login WHERE MultiDayParent = " . $this->m_MultiDayParent . " ";
			$q .= "AND MultiDayStage <=" . $this->m_MultiDayStage . " ORDER BY multidaystage";
			$comps = "(";
			if ($result = mysqli_query($this->m_Conn, $q)) {
				$f = 1;
				while ($row = mysqli_fetch_array($result)) {
					$ar[$row["TavId"]] = $row["TavId"];
					if ($f == 0)
						$comps .= ",";
					$comps .= $row["TavId"];
					$f = 0;
				}
			}
			mysqli_free_result($result);
			$comps .= ")";
		}

		$q  = "SELECT results.Time, results.Status, results.TavId, results.DbID FROM runners, results ";
		$q .= "WHERE results.Control = 1000 and results.DbID = runners.DbId AND results.TavId in $comps ";
		$q .= "AND runners.TavId = results.TavId AND runners.Class = '" . mysqli_real_escape_string($this->m_Conn, $className) . "'  ORDER BY results.Dbid";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			if (in_array($this->m_CompId, [10016, 10688])) // Best of two races
			{
				while ($row = mysqli_fetch_array($result)) {
					$dbId = $row['DbID'];
					if (!isset($ret[$dbId])) {
						$ret[$dbId] = array();
						$ret[$dbId]["DbId"] = $dbId;
						$ret[$dbId]["Time"] = -1;
						$ret[$dbId]["Status"] = 9;
					}
					$time = (int)$row['Time'];
					$status = (int)$row['Status'];
					if ($time > 0 && ($status == 0 || $status == 13)) {
						$ret[$dbId]["Status"] = $status;
						if ($ret[$dbId]["Time"] < 0)
							$ret[$dbId]["Time"] = $time;
						else
							$ret[$dbId]["Time"] = min($ret[$dbId]["Time"], $time);
					}
					if ($ret[$dbId]["Status"] > 0 && $ret[$dbId]["Status"] < 13)
						$ret[$dbId]["Status"] = min($status, $ret[$dbId]["Status"]);
				}
				mysqli_free_result($result);
			} else // Ordninary total results
			{
				while ($row = mysqli_fetch_array($result)) {
					$dbId = $row['DbID'];
					if (!isset($ret[$dbId])) {
						$ret[$dbId] = array();
						$ret[$dbId]["DbId"]  = $dbId;
						$ret[$dbId]["Time"] = 0;
						$ret[$dbId]["Status"] = 0;
						foreach ($ar as $c)
							$ret[$dbId]["c_" . $c] = false;
					}
					$ret[$dbId]["Time"] += (int)$row['Time'];
					$status = (int)$row['Status'];
					if ($status > 0) {
						if ($ret[$dbId]["Status"] == 0)
							$ret[$dbId]["Status"] = $status;
						elseif (!($ret[$dbId]["Status"] == 13 && $status == 13))
							$ret[$dbId]["Status"] = min($status, $ret[$dbId]["Status"]);
					}
					if ($status != 9 && $status != 10)
						$ret[$dbId]["c_" . $row['TavId']] = true;
				}
				mysqli_free_result($result);

				/* Set DNS on those missing any comp previos to the current one*/
				foreach ($ret as $key => $val) {
					$haveAll = true;
					$numComp = count($ar);
					foreach ($ar as $c) {
						if ($numComp-- <= 0)
							break;
						if (!$val["c_" . $c]) {
							$haveAll = false;
							break;
						}
					}
					if (!$haveAll)
						$ret[$key]['Status'] = 1;
				}
			}
		} else
			die(mysqli_error($this->m_Conn));

		$sres = array();
		foreach ($ret as $key => $res) {
			$sres[$res["DbId"]]["DbId"] = $res["DbId"];
			$sres[$res["DbId"]]["Time"] = $res["Time"];
			$sres[$res["DbId"]]["Status"] = $res["Status"];
		}

		usort($sres, 'timeSorter');

		$pl = 0;
		$no = 0;
		$lastTime = -1;
		$bestTime = -1;

		foreach ($sres as $tr) {
			if ($tr['Status'] == 0) {
				$no++;
				if ($bestTime == -1)
					$bestTime = $tr['Time'];
				if ($tr['Time'] > $lastTime) {
					$pl = $no;
					$lastTime = $tr['Time'];
				}
				$ret[$tr['DbId']]["Place"] = $pl;
				$ret[$tr['DbId']]["TotalPlus"] = $tr['Time'] - $bestTime;
			} else {
				$ret[$tr['DbId']]["Place"] = "-";
				$ret[$tr['DbId']]["TotalPlus"] = 0;
			}
		}
		return $ret;
	}

	function getMessages()
	{
		$ret = array();
		$q = "SELECT messages.messid, messages.dbid, messages.changed, messages.message, messages.dns, messages.completed,
			runners.name, runners.class, runners.club, runners.ecard1, runners.ecard2, runners.bib, 
			results.time, results2.status
			FROM messages 
			LEFT JOIN runners ON (runners.dbid=messages.dbid AND runners.tavid=" . $this->m_CompId . ") 
			LEFT JOIN results ON (results.dbid=messages.dbid AND results.tavid=" . $this->m_CompId . " AND results.control=100)
			LEFT JOIN results AS results2 ON (results2.dbid=messages.dbid AND results2.tavid=" . $this->m_CompId . " AND results2.control=1000)
			WHERE messages.tavid = " . $this->m_CompId . " 
			ORDER BY messages.dbid, messages.completed, messages.changed DESC";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getDNS()
	{
		$ret = array();
		$q = "SELECT messid, dbid, changed FROM messages WHERE tavid=" . $this->m_CompId . " AND dns=1 AND completed=0";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getEcardChange()
	{
		$ret = array();
		$q = "SELECT messages.messid, messages.dbid, messages.changed, messages.message, runners.name 
		      FROM messages
			  LEFT JOIN runners ON (runners.dbid=messages.dbid AND runners.tavid=" . $this->m_CompId . ")  
		      WHERE messages.tavid=" . $this->m_CompId . " AND messages.ecardchange=1 AND messages.completed=0";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getNewEntries()
	{
		$ret = array();
		$q = "SELECT messages.messid, messages.dbid, messages.changed, messages.message 
		      FROM messages			  
		      WHERE messages.tavid=" . $this->m_CompId . " AND messages.newentry=1 AND messages.completed=0";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getClubs()
	{
		$ret = array();
		$q = "SELECT DISTINCT 
				CASE 
					WHEN runners.club REGEXP '-[0-9]+$' THEN 
						SUBSTRING(runners.club, 1, CHAR_LENGTH(runners.club) 
						- CHAR_LENGTH(SUBSTRING_INDEX(runners.club, '-', -1)) - 1)
					ELSE 
						runners.club 
					END as club
				FROM runners  
				WHERE runners.tavid=" . $this->m_CompId . "
				ORDER BY club
				COLLATE utf8_danish_ci ASC";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getVacants()
	{
		// Clear old reservations
		$timeout = new DateTime();
		$timeout->modify('-5 minutes');
		$q = "UPDATE vacants SET reserved = 0 WHERE reservedtime < '" . $timeout->format('Y-m-d H:i:s') . "'";
		$r = mysqli_query($this->m_Conn, $q) or die(mysqli_error($this->m_Conn, $q));

		$ret = array();
		$q = "SELECT dbid, bib, classid, class FROM vacants WHERE reserved IS NULL OR reserved = 0 AND tavid=" . $this->m_CompId;
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function reserveVacant($className, $cancelID)
	{
		if ($cancelID > 0) {
			$q = "UPDATE vacants SET reserved = 0, reservedtime = NULL WHERE dbid=" . $cancelID;
			$ret = mysqli_query($this->m_Conn, $q) or die(mysqli_error($this->m_Conn, $q));
		}

		// Use smallest bib for vacant (negative sign is applied in case largest bib to be used)
		$q  = "SELECT dbid, bib FROM vacants WHERE (reserved IS NULL OR reserved = 0) ";
		$q .= "AND tavid=" . $this->m_CompId . " AND class='" . mysqli_real_escape_string($this->m_Conn, $className) . "'";
		$q .= " ORDER BY bib ASC, dbid ASC LIMIT 1";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			$row = mysqli_fetch_row($result);
			$dbid = ($row ? $row[0] : 0);
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));

		$ret = false;
		if ($dbid > 0) {
			$q = "UPDATE vacants SET reserved = 1, reservedtime = NOW() WHERE dbid=" . $dbid;
			$ret = mysqli_query($this->m_Conn, $q) or die(mysqli_error($this->m_Conn, $q));
		}
		if ($dbid > 0 && $ret)
			return $dbid;
		else
			return 0;
	}

	function getnamefromecard($ecard)
	{
		$ret = array();
		$q  = "SELECT runners.name AS name, login.compName AS compname, login.compDate AS compdate";
		$q .= " FROM runners LEFT JOIN login ON runners.tavid = login.tavid";
		$q .= " WHERE runners.ecard1 = " . $ecard . " OR runners.ecard2 = " . $ecard;
		$q .= " ORDER BY compDate DESC LIMIT 1";
		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}

	function getEcards()
	{
		$ret = array();
		$q = "(SELECT runners.ecard1 AS ecard FROM runners WHERE runners.tavid=" . $this->m_CompId . " AND runners.ecard1 > 0)
		UNION
		(SELECT runners.ecard2 AS ecard FROM runners WHERE runners.tavid=" . $this->m_CompId . " AND runners.ecard2 > 0)
		ORDER BY ecard ASC";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}
	function getClassesLastChanged()
	{
		$ret = array();
		$q = "SELECT runners.class as class, MAX(results.changed) as lastchanged
		FROM runners JOIN results ON runners.tavid = results.tavid AND runners.dbid = results.dbid
		WHERE runners.tavid=" . $this->m_CompId . " GROUP BY runners.class ORDER BY class";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			while ($row = mysqli_fetch_array($result))
				$ret[] = $row;
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}
	function getClassLastChanged($className)
	{
		$ret = "";
		$q = "SELECT MAX(results.changed) as lastchanged
		FROM runners JOIN results ON runners.tavid = results.tavid AND runners.dbid = results.dbid
		WHERE runners.tavid=" . $this->m_CompId . " AND runners.class='" . mysqli_real_escape_string($this->m_Conn, $className) . "'";

		if ($result = mysqli_query($this->m_Conn, $q)) {
			$row = mysqli_fetch_row($result);
			$ret = ($row ? $row[0] : "");
			mysqli_free_result($result);
		} else
			die(mysqli_error($this->m_Conn));
		return $ret;
	}
}
