<?php
include_once("../templates/classEmma.class.php");

if (isset($_POST['btnSubmit'])) {
  $id = Emma::CreateCompetition($_POST['name'], $_POST['org'], $_POST['date'], $_POST['sport'], $_POST['time4oid'] ?? '');
  header("Location: editComp.php?compid=$id");
  exit;
}

include_once("../templates/emmalang_en.php");
$lang = "no";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("../templates/emmalang_$lang.php");
header('Content-Type: text/html; charset=' . $CHARSET);

$time4oid = "";
if (isset($_GET['time4oid'])) {
  $time4oid = $_GET['time4oid'];
}
$org = "";
if (isset($_GET['org'])) {
  $org = $_GET['org'];
}
$name = "";
if (isset($_GET['title'])) {
  $name = $_GET['title'];
}
$date = date('Y-m-d');
if (isset($_GET['date'])) {
  $date = $_GET['date'];
}

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html>

<head>
  <title><?= $_TITLE ?></title>

  <link rel="stylesheet" type="text/css" href="../css/style-liveres.css">
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="robots" content="noindex">

</head>

<body topmargin="0" leftmargin="0">

  <div class="maindiv">
    <table border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td valign="bottom">
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
          <table style="border: 1px solid gray; width: 100%; padding: 0;">
            <tr>
              <td style="text-align: center; border: 1px solid gray;"><a href="./index.php">Admin page</a></td>
              <td style="text-align: center; border: 1px solid gray;"><a href="../index.php">Main page</a></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="searchmenu" colspan="2" style="padding: 5px;">
          <table border="0" cellpadding="0" cellspacing="0" width="400">
            <tr>
              <td>
                <form name="form1" action="createComp.php" method="post">
                  <h1 class="categoriesheader">New competition</h1>
                  <table>
                    <tr>
                      <td><b>Competition Name</b></td>
                      <td><input type="text" name="name" style="width: 120px;" value="<?= htmlspecialchars($name) ?>"></td>
                    </tr>
                    <tr>
                      <td><b>Organizer</b></td>
                      <td><input type="text" name="org" style="width: 120px;" value="<?= htmlspecialchars($org) ?>"></td>
                    </tr>
                    <tr>
                      <td><b>Date (yyyy-mm-dd)</b></td>
                      <td><input type="text" name="date" style="width: 120px;" value="<?= htmlspecialchars($date) ?>"></td>
                    </tr>
                    <?php if ($time4oid != "") { ?>
                      <tr>
                        <td><b>Time4o ID</b></td>
                        <td><input type="text" name="time4oid" style="width: 120px;" value="<?= htmlspecialchars($time4oid) ?>"></td>
                      </tr>
                    <?php } ?>
                    <tr>
                      <td><b>Sport</b></td>
                      <td>
                        <select name="sport" style="width: 127px;">
                          <option value="">Ikke valgt</option>
                          <option value="Langrenn">Langrenn</option>
                          <option value="Orientering">Orientering</option>
                          <option value="Friidrett">Friidrett</option>
                          <option value="Skiorientering">Skiorientering</option>
                          <option value="Rulleski">Rulleski</option>
                          <option value="Hundekjøring">Hundekjøring</option>
                        </select>
                      </td>
                    </tr>
                  </table>
                  <input type="submit" name="btnSubmit" value="Create" />
                </form>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>

</html>