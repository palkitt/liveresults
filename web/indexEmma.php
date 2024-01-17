<?php
date_default_timezone_set("Europe/Oslo");

include_once("templates/emmalang_no.php");
$lang = "no";
if (isset($_GET['lang']) && $_GET['lang'] != "")
	$lang = $_GET['lang'];
include_once("templates/emmalang_$lang.php");

header('Content-Type: text/html; charset=utf-8');

echo("<?xml version=\"1.0\" encoding=\"utf-8\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head><title><?=$_TITLE?></title>
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#555556">

<link rel="stylesheet" type="text/css" href="css/style-freidig.css">

<script language="javascript" type="text/javascript">
function colorRow(row)
{
	var el = document.getElementById(row);
	if (el === null)
	  return;
	el.style.backgroundColor = "#C0D6FF";
}
function resetRow(row)
{
var el = document.getElementById(row);
if (el === null)
  return;
el.style.backgroundColor = "";
}

</script>
</head>
<body>
<!-- MAIN DIV -->
<div style="font-size: 20px; font-weight: bold; height: 50px; width:100%; background-color: #555555; padding-left: 5px; 
            vertical-align: middle; line-height:45px; color: white;">
 <img src="images/svenskorientering.png" height="40px" style="vertical-align: middle" />&nbsp; Liveresults from Emma server (liveresultat.orientering.se)
</div>

<div class="maindiv" style="padding-left: 5px;">
<br>
<a href='index.php'>Results from LiveRes</a><br>
<br>
<b>Choose language</b><br>
<a href=index.php?lang=no style='text-decoration: none'><img src='images/no.png?a' border='0' alt='Norsk'></a>&nbsp;
<a href=index.php?lang=sv style='text-decoration: none'><img src='images/se.png?a' border='0' alt='Svenska'></a>&nbsp;
<a href=index.php?lang=en style='text-decoration: none'><img src='images/en.png?a' border='0' alt='English'></a>&nbsp;
<a href=index.php?lang=fi style='text-decoration: none'><img src='images/fi.png?a' border='0' alt='Suomeksi'></a>&nbsp;
<a href=index.php?lang=ru style='text-decoration: none'><img src='images/ru.png?a' border='0' alt='Русский'></a>&nbsp;
<a href=index.php?lang=cz style='text-decoration: none'><img src='images/cz.png?a' border='0' alt='Česky'></a>&nbsp;
<a href=index.php?lang=de style='text-decoration: none'><img src='images/de.png?a' border='0' alt='Deutsch'></a>&nbsp;
<a href=index.php?lang=bg style='text-decoration: none'><img src='images/bg.png?a' border='0' alt='български'></a>&nbsp;
<a href=index.php?lang=fr style='text-decoration: none'><img src='images/fr.png?a' border='0' alt='Français'></a>&nbsp;
<a href=index.php?lang=it style='text-decoration: none'><img src='images/it.png?a' border='0' alt='Italiano'></a>&nbsp;
<a href=index.php?lang=hu style='text-decoration: none'><img src='images/hu.png?a' border='0' alt='Magyar'></a>&nbsp;
<a href=index.php?lang=es style='text-decoration: none'><img src='images/es.png?a' border='0' alt='Español'></a>&nbsp;
<a href=index.php?lang=pl style='text-decoration: none'><img src='images/pl.png?a' border='0' alt='Polska'></a>&nbsp;
<a href=index.php?lang=pt style='text-decoration: none'><img src='images/pt.png?a' border='0' alt='Português'></a>
<br>

<table border="0" cellpadding="0px" cellspacing="0" width="100%" id="tblLiveComps">
  <tr><td colspan=3><h1 class="categoriesheader">LIVE TODAY!</h1></td><tr>
	<tr><th align="left"><?= $_DATE?></th><th align="left"><?= $_EVENTNAME?></th><th align="left"><?= $_ORGANIZER?></th></tr>
<?php	
  $url = "https://liveresultat.orientering.se/api.php?method=getcompetitions";
  $json = file_get_contents($url);
  $json = preg_replace('/[[:cntrl:]]/', '', $json);
  $json = str_replace('"O"','O',$json);
  $data = json_decode($json, true);
  $comps = $data["competitions"];
  $today = date("Y-m-d");
	  foreach ($comps as $comp)
    {
      if ($comp["date"] === $today)
      {
        ?>
        <tr id="row<?=$comp["id"]?>" style="font-weight:bold;"><td><?=date("Y-m-d",strtotime($comp['date']))?></td>
        <td><a onmouseover="colorRow('row<?=$comp["id"]?>')" onmouseout="resetRow('row<?=$comp["id"]?>')" href="followfull.php?emma&comp=<?=$comp['id']?>&amp;lang=<?=$lang?>"><?=$comp["name"]?></a></td>
        <td style="font-weight:normal"><?=$comp["organizer"]?></td>
        </tr>
        <?php
      }
    }
?>
<tr><td>&nbsp;</td></tr>
<tr><td colspan=3><h1 class="categoriesheader"><?=$_CHOOSECMP?></h1></td><tr>
<tr><th align="left"><?= $_DATE?></th><th align="left"><?= $_EVENTNAME?></th><th align="left"><?= $_ORGANIZER?></th></tr>
<?php  
  $yearPre = 0;
	foreach ($comps as $comp)
	{
    $year = date("Y",strtotime($comp['date']));
    if ($year != $yearPre)
    {
      $yearPre = $year;
      ?>
        <tr><td colspan=3><h1 class="categoriesheader"><?=$year?></h1></td><tr>
      <?php
    }
	  ?>
      <tr id="row<?=$comp["id"]?>"><td><?=date("Y-m-d",strtotime($comp['date']))?></td>
      <td><a onmouseover="colorRow('row<?=$comp["id"]?>')" onmouseout="resetRow('row<?=$comp["id"]?>')" href="followfull.php?emma&comp=<?=$comp["id"]?>&amp;lang=<?=$lang?>"><?=$comp["name"]?></a></td>
      <td><?=$comp["organizer"]?></td>
      </tr>
	  <?php
	}
	?>
	</table>
	<p align="left"><font color="#AAA" size="0.7em">&copy;2012- Liveresults. Source code: https://github.com/palkitt/liveresults</font></p>
</div>
</body>
</html>
