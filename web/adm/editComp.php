<?php
include_once("../templates/classEmma.class.php");

if (isset($_POST['btnSave']))
{
	Emma::UpdateCompetition($_GET['compid'],$_POST['name'],$_POST['org'],$_POST['date'],$_POST['public'],$_POST['timediff'],
        $_POST['massstartsort'],$_POST['tenthofseconds'],$_POST['fullviewdefault'],$_POST['rankedstartlist'],$_POST['hightime'],$_POST['quallimits'],
        $_POST['qualclasses'],$_POST['multidaystage'],$_POST['multidayparent']);
}
else if (isset($_POST['btnAdd']))
{
	Emma::AddRadioControl($_GET['compid'],$_POST['classname'],$_POST['controlname'],$_POST['code']);
}
else if (isset($_GET['what']) && $_GET['what'] == "delctr")
{
	Emma::DelRadioControl($_GET['compid'],$_GET['code'],$_GET['class']);
}
else if (isset($_GET['what']) && $_GET['what'] == "delallctr")
{
	Emma::DelAllRadioControls($_GET['compid']);
}

include_once("../templates/emmalang_sv.php");
$lang = "en";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("../templates/emmalang_$lang.php");
header('Content-Type: text/html; charset='.$CHARSET);

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">

<html>
<head><title><?=$_TITLE?></title>
<link rel="stylesheet" type="text/css" href="../css/style-eoc.css">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<script language="javascript">

function colorRow(row)
{
  var el = document.getElementById(row);
  if (el == null)
    return;
  el.style.backgroundColor = "#C0D6FF";
}

function resetRow(row)
{
  var el = document.getElementById(row);
  if (el == null)
    return;
  el.style.backgroundColor = "";
}

function confirmDelete(msg,url)
{
  if (confirm(msg))
		window.location = "editComp.php" + url;
}
</script>

</head>
<body topmargin="0" leftmargin="0">
<!-- MAIN DIV -->
<div class="maindiv">
<table cellpadding="0" cellspacing="0" border="0" ID="Table6">
	<tr>
		<TR>
			<TD>
			</TD>
		</TR>
</table>
<table border="0" cellpadding="0" cellspacing="0" >
  <tr>
     <td valign="bottom">

<!-- MAIN MENU FLAPS - Two rows, note that left and right styles differs from middle ones -->
     <table border="0" cellpadding="0" cellspacing="0">
          <tr>
               <td colspan="4"><span class="mttop"></td>
          </tr>
     </table>
     </td>
     <td align="right" valign="bottom">
     </td>
  </tr>
  <tr>

    <td class="submenu" colspan="2">
       <table border="0" cellpadding="0" cellspacing="0">
             <tr>
             <td><a href="index.php">Adminpage Competitionindex</a> | </td>
               <td><a href="../indexs.php"><?=$_CHOOSECMP?> to view</a></td>
             </tr>
       </table>
     </td>
  </tr>

<!-- End SUB MENU -->

  <tr>
    <td class="searchmenu" colspan="2" style="padding: 5px;">
       <table border="0" cellpadding="0" cellspacing="0" width="400">
             <tr>
               <td>
<?php
	$comp = Emma::GetCompetition($_GET['compid']);
  $qualclasses = htmlspecialchars($comp['qualclasses']);
?>
<form name="form1" action="editComp.php?what=comp&compid=<?=$comp['tavid']?>" method="post">
<h1 class="categoriesheader">Edit competition</h1>
<b>CompetitionID</b><br/>
<input type="text" name="id" size="50" disabled="true" value="<?=$comp['tavid']?>"/><br/>
<b>Competition Name</b><br/>
<input type="text" name="name" size="50" value="<?=$comp['compName']?>"/><br/>
<b>Organizer</b><br/>
<input type="text" name="org" size="50" value="<?=$comp['organizer']?>"/><br/>
<b>Date (format yyyy-mm-dd)</b><br/>
<input type="text" name="date" size="50" value="<?=date("Y-m-d",strtotime($comp['compDate']))?>"/><br/>
<b>Timezonediff (+1 for Finland, 0 for Norway, -1 for GBR)</b><br/>
<input type="text" name="timediff" size="50" value="<?=$comp['timediff']?>"/><br/>
<b>Highlight time</b><br/>
<input type="text" name="hightime" size="50" value="<?=$comp['hightime']?>"/><br/>
<b>Qual. classes. Empty = same limit for all (Format: "D21-", "H21-", "D70")</b><br/>
<input type="text" name="qualclasses" size="50" value="<?=$qualclasses?>"/><br/>
<b>Qual. limits. Last = all classes not in list above (Format: 3, 4, 5, 6)</b><br/>
<input type="text" name="quallimits" size="50" value="<?=$comp['quallimits']?>"/><br/>
<b>Multi day stage no</b><br/>
<input type="text" name="multidaystage" size="50" value="<?=$comp['multidaystage']?>"/><br/>
<b>Multi day parent (comp id)</b><br/>
<input type="text" name="multidayparent" size="50" value="<?=$comp['multidayparent']?>"/><br/>
<br/>
<input type="checkbox" name="massstartsort" <?= $comp['massstartsort'] == 1 ? "checked" : "" ?>/><b>Use mass start sorting</b><br/>
<input type="checkbox" name="tenthofseconds" <?= $comp['tenthofseconds'] == 1 ? "checked" : "" ?>/><b>Show tenth of seconds</b><br/>
<input type="checkbox" name="fullviewdefault" <?= $comp['fullviewdefault'] == 1 ? "checked" : "" ?>/><b>Show full view by default. Two lines</b><br/>
<input type="checkbox" name="rankedstartlist" <?= $comp['rankedstartlist'] == 1 ? "checked" : "" ?>/><b>Ranked startlist (best starting last) applied to first radio control</b><br/>
<input type="checkbox" name="public" <?= $comp['public'] == 1 ? "checked" : "" ?>/><b>Set competion visibility as Public</b><br/>
<br/>
<input type="submit" name="btnSave" value="Save"/>
</form>
<br/>
<h1 class="categoriesheader">Radio Controls</h1>

<form name="formrdo1" action="editComp.php?what=radio&compid=<?=$comp['tavid']?>" method="post">
<table border="0">
<tr><td><b>Code</td><td><b>Name</td><td><b>Class</td><td><b>Order</td></tr>
<?php
	$rcontrols = Emma::GetRadioControls($_GET['compid']);
for ($i = 0; $i < sizeof($rcontrols); $i++)
{
	echo("<tr><td>".$rcontrols[$i]["code"]."</td><td>".$rcontrols[$i]["name"]."</td><td>".$rcontrols[$i]["classname"]."</td><td>".$rcontrols[$i]["corder"]."</td><td><a href='javascript:confirmDelete(\"Do you want to delete this radiocontrol?\",\"?compid=".$_GET['compid']."&what=delctr&compid=".$_GET['compid']."&code=".$rcontrols[$i]['code']."&class=".urlencode($rcontrols[$i]["classname"])."\");'>Delete</a></td></tr>");
}
?>
</table>
<br/><hr/>
<a href="javascript:confirmDelete('Do you want to delete ALL radiocontrols?','?compid=<?= $_GET['compid']?>&what=delallctr&compid=<?= $_GET['compid']?>');">Delete all radio controls</a>
<br/><hr/><br/>
<br/><b>Add Radio Control</b><br/>
Code = 1000*passingcnt + controlCode, <br/>
ex. first pass at control 53 => Code = 1053, second pass => Code = 2053<br/>
Code: <input type="text" name="code"/><br/>
Control-Name: <input type="text" name="controlname"/><br/>
ClassName: <input type="text" name="classname"/><br/>
<input type="submit" name="btnAdd" value="Add Control"/>
</form>
	</td>
	</tr>
	</table>
  </td>
  </tr>
  </table>
  </div>
<br/><br/>
</body>
</html>