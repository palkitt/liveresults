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
$compName = $currentComp->CompName();

header('Content-Type: text/html; charset='.$CHARSET);
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head><title><?=$_TITLE?></title>
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
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

</head>
<body topmargin="0" leftmargin="0">

<div class="maindiv">
<table border="0" cellpadding="0" cellspacing="0" >
  <tr>
    <td valign="bottom">
      <table border="0" cellpadding="0" cellspacing="0">
        <tr><td colspan="4"><span class="mttop"></td></tr>
      </table>
    </td>
    <td align="right" valign="bottom"></td>
  </tr>
  <tr>
    <td class="submenu" colspan="2">
       <table border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td><?=$currentComp->CompName()?>, <?=$currentComp->Organizer()?> [<?=$currentComp->CompDate()?>]</td>
        </tr>
       </table>
     </td>
  </tr>
  <tr>
    <td class="searchmenu" colspan="2" style="padding: 5px;">
      <h1 class="categoriesheader">Radiolinks</h1>

      <table border="0" cellpadding="0" cellspacing="2" width="100%">
      <tr><td><b>Type</b></td><td><b>Kode</b></td></tr>
      <tr><td><a href="..\radio.php?comp=<?=$_GET['comp']?>&code=0">Start</a></td><td>0</td></tr>
      <tr><td><a href="..\radio.php?comp=<?=$_GET['comp']?>&code=-10">Start (new version)</a></td><td>-10</td></tr>
      <tr><td><a href="..\radio.php?comp=<?=$_GET['comp']?>&code=1000">Mål</a></td><td>1000</td></tr>
      <tr><td><a href="..\radio.php?comp=<?=$_GET['comp']?>&code=-2">Igjen i løypa</a></td><td>-2</td></tr>
      <tr><td><a href="..\radio.php?comp=<?=$_GET['comp']?>&code=-1">Alle meldeposter</a></td><td>-1</td></tr>
      <tr><td><button onclick="startRadioControl()">En meldepost</button></td><td>[kode]</td></tr>
      </table>
    </td>
  </tr>
</table>

</div>
</body>
</html>