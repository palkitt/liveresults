<?php include_once("../templates/emmalang_sv.php");

	include_once("../templates/classEmma.class.php");

   $lang = "en";

   if (isset($_GET['lang']) && $_GET['lang'] != "")

   {

	$lang = $_GET['lang'];

   }

include_once("../templates/emmalang_$lang.php");

header('Content-Type: text/html; charset='.$CHARSET);

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head><title><?=$_TITLE?></title>
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="robots" content="noindex">


<link rel="stylesheet" type="text/css" href="../css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="../css/style-admin.css">

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
<table border="0" cellpadding="0" cellspacing="0" width="100%">
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
       <table border="0" cellpadding="0" cellspacing="0" width="100%">
             <tr>
               <td><a href="createComp.php">Create new competition</a> | <a href="../">Show competitions</a> </td>
             </tr>
       </table>
     </td>
  </tr>
<!-- End SUB MENU -->

<tr> <td class="searchmenu" colspan="2" style="padding: 5px;">
<table border="0" cellpadding="0" cellspacing="0">
<tr><td>
<h1 class="categoriesheader">Existing competitions</h1>

<table border="0" cellpadding="0" cellspacing="2" width="100%">
<tr>
<td><b>Date</b></td>
<td><b>Competition</b></td>
<td><b>Organizer</b></td>
<td><b>CompId</b></td>
<td><b>Public</b></td>
</tr>

<?php

	$comps = Emma::GetAllCompetitions();
	
	foreach ($comps as $comp)
	{
	?>
		<tr id="row<?=$comp["tavid"]?>">
    <td><?=date("Y-m-d",strtotime($comp['compDate']))?></td>
    <td>
    <div class="dropdownAdm">
    <button class="dropbtnAdm"><?=$comp["compName"]?></button>
    <div class="dropdownAdm-content">
    <a href="/adm/editComp.php?compid=<?=$comp["tavid"]?>">Edit competition</a>
    <a href="/followfull.php?comp=<?=$comp['tavid']?>">Results page</a>
    <a href="/message.php?comp=<?=$comp["tavid"]?>">Messages</a>
    <a href="/radio.php?comp=<?=$comp["tavid"]?>&code=0">Start registration</a>
    <a href="/speaker.php?comp=<?=$comp["tavid"]?>">Speaker view</a>
    <a href="/adm/radiolinks.php?comp=<?=$comp["tavid"]?>">Radio links</a>
    <a href="/adm/runners.php?compid=<?=$comp["tavid"]?>">Runner list and edit</a>
    <a href="/startlist.php?comp=<?=$comp["tavid"]?>">Startlist</a>
  </div>
  </div></td>
    <td><?=$comp["organizer"]?></td>
    <td><?=$comp["tavid"]?></td>
    <td><?=$comp["public"] == "1" ? "yes" : "no"?></td>
    </tr>
	<?php
	}
	?>
			</table>
		</td>
	     </tr>
	</table>
     </td>
  </tr>
</table>
</div>
<br/>
<a href="/api/api.php?method=getnumconnect">#Connections</a>
<br/>
</body>
</html>