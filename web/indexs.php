<?php
date_default_timezone_set("Europe/Oslo");

include_once("templates/emmalang_no.php");
include_once("templates/classEmma.class.php");
$lang = "no";
if (isset($_GET['lang']) && $_GET['lang'] != "")
{
	$lang = $_GET['lang'];
}
include_once("templates/emmalang_$lang.php");

header('Content-Type: text/html; charset='.$CHARSET);

echo("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
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
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>

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
        <img src="images/Freidig60.png" height="40px" style="vertical-align: middle" />&nbsp LiveRes Freidig orientering
</div>
<div class="maindiv" style="padding-left: 5px;">
<br>
Results from liveresultat.orientering.se can be found <a href='emma/index.php'>here</a>.<br>
<br>
<b>Choose language</b><br>
<a href=indexs.php?lang=no style='text-decoration: none'><img src='images/no.png?a' border='0' alt='Norsk'></a>&nbsp
<a href=indexs.php?lang=sv style='text-decoration: none'><img src='images/se.png?a' border='0' alt='Svenska'></a>&nbsp
<a href=indexs.php?lang=en style='text-decoration: none'><img src='images/en.png?a' border='0' alt='English'></a>&nbsp
<a href=indexs.php?lang=fi style='text-decoration: none'><img src='images/fi.png?a' border='0' alt='Suomeksi'></a>&nbsp
<a href=indexs.php?lang=ru style='text-decoration: none'><img src='images/ru.png?a' border='0' alt='Русский'></a>&nbsp
<a href=indexs.php?lang=cz style='text-decoration: none'><img src='images/cz.png?a' border='0' alt='Česky'></a>&nbsp
<a href=indexs.php?lang=de style='text-decoration: none'><img src='images/de.png?a' border='0' alt='Deutsch'></a>&nbsp
<a href=indexs.php?lang=bg style='text-decoration: none'><img src='images/bg.png?a' border='0' alt='български'></a>&nbsp
<a href=indexs.php?lang=fr style='text-decoration: none'><img src='images/fr.png?a' border='0' alt='Français'></a>&nbsp
<a href=indexs.php?lang=it style='text-decoration: none'><img src='images/it.png?a' border='0' alt='Italiano'></a>&nbsp
<a href=indexs.php?lang=hu style='text-decoration: none'><img src='images/hu.png?a' border='0' alt='Magyar'></a>&nbsp
<a href=indexs.php?lang=es style='text-decoration: none'><img src='images/es.png?a' border='0' alt='Español'></a>&nbsp
<a href=indexs.php?lang=pl style='text-decoration: none'><img src='images/pl.png?a' border='0' alt='Polska'></a>&nbsp
<a href=indexs.php?lang=pt style='text-decoration: none'><img src='images/pt.png?a' border='0' alt='Português'></a>
<br>

<table border="0" cellpadding="0px" cellspacing="0" width="100%" id="tblLiveComps">
  <tr><td colspan=3><h1 class="categoriesheader">LIVE TODAY!</h1></td><tr>
	<tr><th align="left"><?= $_DATE?></th><th align="left"><?= $_EVENTNAME?></th><th align="left"><?= $_ORGANIZER?></th></tr>
<?php	$comps = Emma::GetCompetitionsToday();
	  foreach ($comps as $comp)
        {
        ?>
                <tr id="row<?=$comp["tavid"]?>" style="font-size:12px;font-weight:bold;"><td><?=date("Y-m-d",strtotime($comp['compDate']))?></td>
                <td><a onmouseover="colorRow('row<?=$comp["tavid"]?>')" onmouseout="resetRow('row<?=$comp["tavid"]?>')" href="/followfull.php?comp=<?=$comp['tavid']?>&amp;lang=<?=$lang?>"><?=$comp["compName"]?></a></td>
                <td style="font-weight:normal"><?=$comp["organizer"]?></td>
                </tr>
        <?php
        }
        ?>
<tr><td>&nbsp</td></tr>
<tr><td colspan=3><h1 class="categoriesheader"><?=$_CHOOSECMP?></h1></td><tr>
<tr><th align="left"><?= $_DATE?></th><th align="left"><?= $_EVENTNAME?></th><th align="left"><?= $_ORGANIZER?></th></tr>
<?php
	$comps = Emma::GetCompetitions();
	foreach ($comps as $comp)
	{
	?>
		<tr id="row<?=$comp["tavid"]?>"><td><?=date("Y-m-d",strtotime($comp['compDate']))?></td>
		<td><a onmouseover="colorRow('row<?=$comp["tavid"]?>')" onmouseout="resetRow('row<?=$comp["tavid"]?>')" href="/followfull.php?comp=<?=$comp["tavid"]?>&amp;lang=<?=$lang?>"><?=$comp["compName"]?></a></td>
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
