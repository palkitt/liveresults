<?php
include_once("../templates/classEmma.class.php");

if (isset($_POST['btnSave']))
{
  if ($_POST['pin']=="0000")
    {
      $test = Emma::UpdateRunner($_GET['compid'],$_GET['dbid'],$_POST['bib'],$_POST['name'],$_POST['club']
      ,$_POST['class'],$_POST['time'],$_POST['status'],(isset($_POST['ecardchecked'])?1:null));
      if ($test==2)
        echo('<b>&nbsp;Update OK</b>');
      else
        echo('<b>&nbsp;Update failed</b>');
    }
  else
    echo('<b>&nbsp;Invalid PIN code</b>');
}

include_once("../templates/emmalang_no.php");
$lang = "no";
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
             <td><a href="runners.php?compid=<?=$_GET['compid']?>">Runners</a></td>
             <td><a href="index.php">Admin competitions</a></td>
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
	$runner = Emma::GetRunnerData($_GET['compid'],$_GET['dbid']);
?>
<form name="form1" action="editRunner.php?compid=<?=$runner['tavid']?>&dbid=<?=$runner['dbid']?>" method="post">

<h1 class="categoriesheader">Edit runner: <?=$runner['name']?></h1>
<table>
<tr><td><b>CompID</b></td>
<td><input type="number" name="compid" size="20" disabled="true" value="<?=$runner['tavid']?>"/></td></tr>

<tr><td><b>ID</b><br/>
<td><input type="number" name="dbid" size="20" disabled="true" value="<?=$runner['dbid']?>"/></td></tr>

<tr><td><b>Bib</b></td>
<td><input type="text" name="bib" size="20" value="<?=$runner['bib']?>"/></td></tr>

<tr><td><b>Name</b></td>
<td><input type="text" name="name" size="20" value="<?=$runner['name']?>"/></td></tr>

<tr><td><b>Club</b></td>
<td><input type="text" name="club" size="20" value="<?=$runner['club']?>"/></td></tr>

<tr><td><b>Class</b></td>
<td><input type="text" name="class" size="20" value="<?=$runner['class']?>"/></td></tr>

<tr><td><b>Time</b></td>
<td><input type="text" name="time" size="20" value="<?=$runner['time']?>"/> centi seconds, 100 cs = 1 s</td></tr>

<tr><td><b>Status</b></td>
<td><input type="text" name="status" size="20" value="<?=$runner['status']?>"/> 0=OK; 1=DNS; 2=DNF; 3=DSQ; 10=Entered; 13=Finished</td></tr>

<tr><td><b>Checked</b><br/>
<td><input type="checkbox" name="ecardchecked" <?= $runner['ecardchecked'] == 1 ? "checked" : "" ?>/></td></tr>

<tr><td><b>PIN code</b></td>
<td><input type="number" name="pin" size="20" value="0000"/></td></tr>
</table>
<input type="submit" name="btnSave" value="Update"/>
</form>
	</td>
	</tr>
  </table>
  </div>
</body>
</html>