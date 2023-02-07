<?php
include_once("../templates/classEmma.class.php");

if (isset($_POST['btnSubmit']))
{
	$id = Emma::CreateCompetition($_POST['name'],$_POST['org'],$_POST['date'],$_POST['sport']);
	header("Location: editComp.php?compid=$id");
	exit;
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
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="robots" content="noindex">

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

</script>
</head>
<body topmargin="0" leftmargin="0">

<!-- MAIN DIV -->
<div class="maindiv">
<table border="0" cellpadding="0" cellspacing="0">
  <tr>
     <td valign="bottom">
<!-- MAIN MENU FLAPS - Two rows, note that left and right styles differs from middle ones -->
     <table border="0" cellpadding="0" cellspacing="0">
          <!-- Top row with rounded corners -->
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
               <td><a href="../"><?=$_CHOOSECMP?> to view</a></td>
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
<form name="form1" action="createComp.php" method="post">
<h1 class="categoriesheader">New competition</h1>
<table>
  <tr><td><b>Competition Name</b></td>
  <td><input type="text" name="name" style="width: 120px;"></td></tr>

  <tr><td><b>Organizer</b></td>
  <td><input type="text" name="org" style="width: 120px;"></td></tr>

  <tr><td><b>Date (yyyy-mm-dd)</b></td>
  <td><input type="text" name="date" style="width: 120px;"> (eg. 2022-02-23)</td></tr>

  <tr><td><b>Sport</b></td>
  <td>
    <select name="sport" style="width: 127px;">
      <option value="">Ikke valgt</option>
      <option value="Langrenn">Langrenn</option>
      <option value="Orientering">Orientering</option>
      <option value="Friidrett">Friidrett</option>
      <option value="Skiorientering">Skiorientering</option>
      <option value="Rulleski">Rulleski</option>
    </select>
  </td></tr>
</table>
<input type="submit" name="btnSubmit" value="Create"/>
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