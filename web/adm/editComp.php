<?php
include_once("../templates/classEmma.class.php");

if (isset($_POST['btnSave']))
{
	Emma::UpdateCompetition($_GET['compid'],$_POST['name'],$_POST['org'],$_POST['date'],$_POST['public'],$_POST['timediff'],
        $_POST['massstartsort'],$_POST['tenthofseconds'],$_POST['fullviewdefault'],$_POST['rankedstartlist'],$_POST['hightime'],$_POST['quallimits'],
        $_POST['qualclasses'],$_POST['multidaystage'],$_POST['multidayparent']);
  header("Location:index.php");
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

<table>
<tr><td><b>Competition ID</b></td>
<td>&nbsp;<input type="text" name="id" size="20" disabled="true" value="<?=$comp['tavid']?>"/></td></tr>

<tr><td><b>Competition name</b></td>
<td>&nbsp;<input type="text" name="name" size="20" value="<?=$comp['compName']?>"/></td></tr>

<tr><td><b>Organizer</b></td>
<td>&nbsp;<input type="text" name="org" size="20" value="<?=$comp['organizer']?>"/></td></tr>

<tr><td><b>Date</b></td>
<td>&nbsp;<input type="text" name="date" size="20" value="<?=date("Y-m-d",strtotime($comp['compDate']))?>"/> Format: yyyy-mm-dd</td></tr>

<tr><td><b>Time zone diff</b></td>
<td>&nbsp;<input type="number" name="timediff" size="20" value="<?=$comp['timediff']?>"/> Eg. 1 for Finland, 0 for Norway, -1 for GBR</td></tr>

<tr><td><b>Highlight time</b></td>
<td>&nbsp;<input type="number" name="hightime" size="20" value="<?=$comp['hightime']?>"/> Seconds</td></tr>

<tr><td><b>Qual. classes</b></td>
<td>&nbsp;<input type="text" name="qualclasses" size="20" value="<?=$qualclasses?>"/> Format: "D21-", "H21-", "D70". If not given -> same limit for all classes</td></tr>

<tr><td><b>Qual. limits</b></td>
<td>&nbsp;<input type="text" name="quallimits" size="20" value="<?=$comp['quallimits']?>"/> Format: 3, 4, 5, 6 (Last value used for all other classes)</td></tr>

<tr><td><b>Multi day stage no</b></td>
<td>&nbsp;<input type="number" name="multidaystage" size="20" value="<?=$comp['multidaystage']?>"/></td></tr>

<tr><td><b>Multi day parent</b></td>
<td>&nbsp;<input type="number" name="multidayparent" size="20" value="<?=$comp['multidayparent']?>"/> Competition ID for first in series</td></tr>

<tr><td><b>Mass start sorting</b></td>
<td><input type="checkbox" name="massstartsort" <?= $comp['massstartsort'] == 1 ? "checked" : "" ?>/></td></tr>

<tr><td><b>Tenth of seconds</b></td>
<td><input type="checkbox" name="tenthofseconds" <?= $comp['tenthofseconds'] == 1 ? "checked" : "" ?>/></td></tr>

<tr><td><b>Two-line results</td>
<td><input type="checkbox" name="fullviewdefault" <?= $comp['fullviewdefault'] == 1 ? "checked" : "" ?>/></td></tr>

<tr><td><b>Initial dynamic ranking</td>
<td><input type="checkbox" name="rankedstartlist" <?= $comp['rankedstartlist'] == 1 ? "checked" : "" ?>/></td></tr>

<tr><td><b>Public</td>
<td><input type="checkbox" name="public" <?= $comp['public'] == 1 ? "checked" : "" ?>/></td></tr>

</table>


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
Code = 1000*passingcnt + controlCode, eg. first pass at control 53 => Code = 1053, second pass => Code = 2053<br/>
<table>
<tr><td>Code</td><td><input type="text" name="code"/></td></tr>
<tr><td>Control-Name</td><td><input type="text" name="controlname"/></td></tr>
<tr><td>ClassName</td><td><input type="text" name="classname"/></td></tr>
</table>
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