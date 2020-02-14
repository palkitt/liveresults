<?php 
include_once("../templates/emmalang_no.php");
include_once("../templates/classEmma.class.php");

$lang = "en";
if (isset($_GET['lang']) && $_GET['lang'] != "")
{
   $lang = $_GET['lang'];
}
include_once("../templates/emmalang_$lang.php");

$currentComp = new Emma($_GET['comp']);
$orgainzer = $currentComp->Organizer();

header('Content-Type: text/html; charset='.$CHARSET);
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head><title><?=$_TITLE?></title>
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">
<meta name="robots" content="noindex">
<link rel="stylesheet" type="text/css" href="../css/style-eoc.css">

<script language="javascript">

function startRadioControl() {
  var controlNo = prompt("Radio control code #");
  if (controlNo != null) {
    var URL = "../radio.php?comp=" + <?=$_GET['comp']?> + "&code=" + controlNo;
    var win = window.open(URL)
  }
}
</script>

</script>


</head>

<body topmargin="0" leftmargin="0">
<!-- MAIN DIV -->
<div class="maindiv">

<table border="0" cellpadding="0" cellspacing="0" width="500px">
<tr><td valign="bottom">

<!-- MAIN MENU FLAPS - Two rows, note that left and right styles differs from middle ones -->
     <table border="0" cellpadding="0" cellspacing="0">
          <!-- Top row with rounded corners -->
          <tr><td colspan="4"><span class="mttop"></td></tr>
     </table>
     </td><td align="right" valign="bottom"></td></tr>
	
	<td class="submenu" colspan="2">
       <table border="0" cellpadding="0" cellspacing="1" style="font-size: 14px">
             <tr>
               <td><?=$currentComp->CompName()?>, <?=$currentComp->Organizer()?> [<?=$currentComp->CompDate()?>]</td>
				<td>
               </tr>
       </table>
     </td>
	
	
	
	<tr>
    <td class="submenu" colspan="2">
       <table border="0" cellpadding="0" cellspacing="0">
             <tr><td>Radiolinks</td></tr>
       </table>
     </td>
  </tr>
<!-- End SUB MENU -->
  
  <tr>
  <td class="searchmenu" colspan="2" style="padding: 5px;">
  <table border="0" cellpadding="0" cellspacing="0">
  <tr><td>

<table border="0" cellpadding="0" cellspacing="2" width="100%">
<tr><td><b>Type</b></td><td><b>Kode</b></td><td><b>Link</b></td><td></td></tr>
<tr><td>Start</td><td>0</td><td> <a href="..\radio.php?comp=<?=$_GET['comp']?>&code=0">Link</a> </td><td></td></tr>
<tr><td>Mål</td><td>1000</td><td> <a href="..\radio.php?comp=<?=$_GET['comp']?>&code=1000">Link</a> </td><td></td></tr>
<tr><td>Igjen i skogen</td><td>-2</td><td> <a href="..\radio.php?comp=<?=$_GET['comp']?>&code=-2">Link</a> </td><td></td></tr>
<tr><td>Alle meldeposter</td><td>-1</td><td> <a href="..\radio.php?comp=<?=$_GET['comp']?>&code=-1">Link</a> </td><td></td></tr>
<tr><td>En meldepost</td><td>NN</td><td> <button onclick="startRadioControl()">Link</button> </td><td></td></tr>
	</table>
		</td>
	     </tr>
	</table>
     </td>
  </tr>
</table>
<br/>



</div>
<br/><br/>
</body>
</html>