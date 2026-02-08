<?php
include_once("../templates/classEmma.class.php");

if (isset($_POST['btnSave'])) {
  $ok = Emma::UpdateCompetition(
    $_GET['compid'],
    $_POST['time4oid'],
    $_POST['name'],
    $_POST['org'],
    $_POST['date'],
    (isset($_POST['public']) ? 1 : null),
    $_POST['timediff'],
    0,
    (isset($_POST['tenthofseconds']) ? 1 : null),
    0,
    (isset($_POST['rankedstartlist']) ? 1 : null),
    $_POST['hightime'],
    $_POST['liveloxid'],
    $_POST['quallimits'],
    $_POST['qualclasses'],
    $_POST['multidaystage'] ?? null,
    $_POST['multidayparent'] ?? null,
    (isset($_POST['showinfo']) ? 1 : null),
    $_POST['infotext'],
    (isset($_POST['showecardtimes']) ? 1 : null),
    (isset($_POST['showtimesinsprint']) ? 1 : null),
    (isset($_POST['showcourseresults']) ? 1 : null),
    (isset($_POST['noecardentry']) ? 1 : null),
    (isset($_POST['allownewclub']) ? 1 : null),
    $_POST['livecenterurl'],
    $_POST['sport']
  );
  if ($ok == 1)
    echo ('<b>&nbsp;Competion update OK</b>');
  else
    echo ('<b>&nbsp;Competion update failed</b>');
} else if (isset($_POST['btnAdd']))
  Emma::AddRadioControl($_GET['compid'], $_POST['classname'], $_POST['controlname'], $_POST['code']);
else if (isset($_POST['btnAddAll']))
  Emma::AddRadioControlsForAllClasses($_GET['compid'], $_POST['controlnameall'], $_POST['codeall'], $_POST['order']);
else if (isset($_GET['what']) && $_GET['what'] == "delctr")
  Emma::DelRadioControl($_GET['compid'], $_GET['code'], $_GET['class']);
else if (isset($_GET['what']) && $_GET['what'] == "delallctr")
  Emma::DelAllRadioControls($_GET['compid']);

include_once("../templates/emmalang_sv.php");
$lang = "en";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("../templates/emmalang_$lang.php");
header('Content-Type: text/html; charset=' . $CHARSET);

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html>

<head>
  <title><?= $_TITLE ?></title>
  <link rel="stylesheet" type="text/css" href="../css/style-liveres.css">
  <meta name="robots" content="noindex">
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <script language="javascript">
    function colorRow(row) {
      var el = document.getElementById(row);
      if (el == null)
        return;
      el.style.backgroundColor = "#C0D6FF";
    }

    function resetRow(row) {
      var el = document.getElementById(row);
      if (el == null)
        return;
      el.style.backgroundColor = "";
    }

    function confirmDelete(msg, url) {
      if (confirm(msg))
        window.location = "editComp.php" + url;
    }
  </script>

</head>

<body topmargin="0" leftmargin="0">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td class="submenu">
        <div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; 
  vertical-align: middle; line-height:45px; color: white; width: 100%; padding-left: 10px;">
          Edit competition
        </div>
      </td>
    </tr>
    <tr>
      <td class="submenu">
        <table style="border: 1px solid gray; width: 100%; padding: 0;">
          <tr>
            <td style="text-align: center; border: 1px solid gray;"><a href="./index.php">Admin page</a></td>
            <td style="text-align: center; border: 1px solid gray;"><a href="../index.php">Public page</a></td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="searchmenu" colspan="2" style="padding: 5px;">
        <table border="0" cellpadding="0" cellspacing="0" width="400">
          <tr>
            <td>
              <?php
              $comp = Emma::GetCompetition($_GET['compid']);
              $time4o = $comp['time4oid'] != "";
              $qualclasses = htmlspecialchars($comp['qualclasses']);
              ?>
              <form name="form1" action="editComp.php?what=comp&compid=<?= $comp['tavid'] ?>" method="post">
                <h1 class="categoriesheader">Edit competition</h1>

                <table>
                  <tr>
                    <td colspan=3>
                      <h2>Main competition data</h2>
                    </td>
                  </tr>

                  <tr>
                    <td>Competition ID</td>
                    <td>&nbsp;<input type="text" name="id" style="width: 120px;" disabled="true" value="<?= $comp['tavid'] ?>" /></td>
                  </tr>

                  <tr>
                    <td>Time4o ID</td>
                    <td>&nbsp;<input type="text" name="time4oid" style="width: 120px;" value="<?= $comp['time4oid'] ?>" /></td>
                    <td>Leave empty if eTiming or Brikkesys event</td>
                  </tr>

                  <tr>
                    <td>Competition name</td>
                    <td>&nbsp;<input type="text" name="name" style="width: 120px;" value="<?= $comp['compName'] ?>" /></td>
                    <td></td>
                  </tr>

                  <tr>
                    <td>Organizer</td>
                    <td>&nbsp;<input type="text" name="org" style="width: 120px;" value="<?= $comp['organizer'] ?>" /></td>
                    <td>If eTiming event this must match organizer set in eTiming</td>
                  </tr>

                  <tr>
                    <td>Date</td>
                    <td>&nbsp;<input type="text" name="date" style="width: 120px;" value="<?= date("Y-m-d", strtotime($comp['compDate'])) ?>" /></td>
                    <td>Format: yyyy-mm-dd. If eTiming event this must match date set in eTiming</td>
                  </tr>

                  <tr>
                    <td>Time zone diff</td>
                    <td>&nbsp;<input type="number" name="timediff" style="width: 120px;" value="<?= $comp['timediff'] ?>" /></td>
                    <td>1 for Finland, 0 for Norway, -1 for GBR</td>
                  </tr>

                  <tr>
                    <td>Sport</td>
                    <td>
                      &nbsp;<select name="sport" style="width: 120px;">
                        <option value="">Ikke valgt</option>
                        <option value="Langrenn" <?php if ($comp['sport'] == 'Langrenn') echo 'selected'; ?>>Langrenn</option>
                        <option value="Orientering" <?php if ($comp['sport'] == 'Orientering') echo 'selected'; ?>>Orientering</option>
                        <option value="Friidrett" <?php if ($comp['sport'] == 'Friidrett') echo 'selected'; ?>>Friidrett</option>
                        <option value="Skiorientering" <?php if ($comp['sport'] == 'Skiorientering') echo 'selected'; ?>>Skiorientering</option>
                        <option value="Rulleski" <?php if ($comp['sport'] == 'Rulleski') echo 'selected'; ?>>Rulleski</option>
                        <option value="Hundekjøring" <?php if ($comp['sport'] == 'Hundekjøring') echo 'selected'; ?>>Hundekjøring</option>
                      </select>
                    </td>
                  </tr>

                  <tr>
                    <td>URL</td>
                    <td>&nbsp;<input type="text" name="livecenterurl" style="width: 120px;" value="<?= $comp['livecenterurl'] ?>" /></td>
                    <td>URL for link</td>
                  </tr>

                  <tr>
                    <td>Livelox ID</td>
                    <td>&nbsp;<input type="number" name="liveloxid" style="width: 120px;" value="<?= $comp['liveloxid'] ?>" /></td>
                    <td>Links to Livelox will be made based on class names when ID > 0</td>
                  </tr>

                  <tr>
                    <td colspan=3>
                      <h2>Apperance</h2>
                    </td>
                  </tr>

                  <tr>
                    <td>Public</td>
                    <td><input type="checkbox" name="public" <?= $comp['public'] == 1 ? "checked" : "" ?> /></td>
                    <td>List competion on liveres.live main page</td>
                  </tr>

                  <tr>
                    <td>Show ecard split times</td>
                    <td><input type="checkbox" name="showecardtimes" <?= $comp['showecardtimes'] == 1 ? "checked" : "" ?> /></td>
                    <td>Turn on ecard split times (strekktider)</td>
                  </tr>

                  <tr>
                    <td>Show tenths of seconds</b></td>
                    <td><input type="checkbox" name="tenthofseconds" <?= $comp['tenthofseconds'] == 1 ? "checked" : "" ?> /></td>
                    <td>Display times with tenths of seconds</td>
                  </tr>

                  <?php if (!$time4o) { ?>
                    <tr>
                      <td>Show course results</td>
                      <td><input type="checkbox" name="showcourseresults" <?= $comp['showcourseresults'] == 1 ? "checked" : "" ?> /></td>
                      <td>Display listing of all courses with links to results</td>
                    </tr>

                    <tr>
                      <td>Show times in sprint heats</td>
                      <td><input type="checkbox" name="showtimesinsprint" <?= $comp['showtimesinsprint'] == 1 ? "checked" : "" ?> /></td>
                      <td>Show times in addition to places in sprint heats</td>
                    </tr>
                  <?php } ?>

                  <tr>
                    <td>Use dynamic ranking from start</td>
                    <td><input type="checkbox" name="rankedstartlist" <?= $comp['rankedstartlist'] == 1 ? "checked" : "" ?> /></td>
                    <td>Use smart sort also for runners before passing first radio control</td>
                  </tr>

                  <tr>
                    <td>Highlight duration</td>
                    <td>&nbsp;<input type="number" name="hightime" style="width: 120px;" value="<?= $comp['hightime'] ?>" /></td>
                    <td>Duration of highlighting new times [seconds]</td>
                  </tr>

                  <tr>
                    <td>Qualification classes</td>
                    <td>&nbsp;<input type="text" name="qualclasses" style="width: 120px;" value="<?= $qualclasses ?>" /></td>
                    <td>Format: "D21-", "H21-", "D70". If not given -> same limit for all classes</td>
                  </tr>

                  <tr>
                    <td>Qualification limits</td>
                    <td>&nbsp;<input type="text" name="quallimits" style="width: 120px;" value="<?= $comp['quallimits'] ?>" /></td>
                    <td>Format: 3, 4, 5, 6 (Last value used for all other classes)</td>
                  </tr>

                  <tr>
                    <td>Show scrolling info text</td>
                    <td><input type="checkbox" name="showinfo" <?= $comp['showinfo'] == 1 ? "checked" : "" ?> /></td>
                    <td>Display info text (below)</td>
                  </tr>

                  <tr valign="top">
                    <td>Info text</td>
                    <td>&nbsp;<textarea name="infotext" style="width:120px; height:auto;"><?= $comp['infotext'] ?></textarea></td>
                    <td>Text to be scrolled on top of page</td>
                  </tr>

                  <?php if (!$time4o) { ?>
                    <tr>
                      <td colspan=3>
                        <h2>Online entry</h2>
                      </td>
                    </tr>

                    <tr>
                      <td>Remove ecard in online entry</td>
                      <td><input type="checkbox" name="noecardentry" <?= $comp['noecardentry'] == 1 ? "checked" : "" ?> /></td>
                      <td>Do not show ecard input box (for races without ecards)</td>
                    </tr>

                    <tr>
                      <td>Allow new club in online entry</td>
                      <td><input type="checkbox" name="allownewclub" <?= $comp['allownewclub'] == 1 ? "checked" : "" ?> /></td>
                      <td>Allow user to create a new club when entering online</td>
                    </tr>

                    <tr>
                      <td colspan=3>
                        <h2>Multi-day competitions</h2>
                      </td>
                    </tr>

                    <tr>
                      <td>Multi-day stage no</td>
                      <td>&nbsp;<input type="number" name="multidaystage" style="width: 120px;" value="<?= $comp['multidaystage'] ?>" /></td>
                      <td>Day number for multi-day competitions. Use 0 for single-day competition</td>
                    </tr>

                    <tr>
                      <td>Multi-day parent ID</td>
                      <td>&nbsp;<input type="number" name="multidayparent" style="width: 120px;" value="<?= $comp['multidayparent'] ?>" /></td>
                      <td>Competition ID for the first competition in the multi-day series. 0 for single-day competition</td>
                    </tr>

                  <?php } ?>
                </table>
                <input type="submit" name="btnSave" value="Save" />
              </form>
              <br />
              <hr />
              <h1 class="categoriesheader">Links and QR codes</h1>
              <table>
                <tr>
                  <td>
                    <a href="../followfull.php?comp=<?= $_GET['compid'] ?>">Live results</a><br>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=https://liveres.live/followfull.php?comp=<?= $_GET['compid'] ?>&amp;size=150x150" alt="" title="" />
                  </td>
                  <?php if (!$time4o) { ?>
                    <td>
                      &nbsp;
                    <td>
                      <a href="../entry.php?comp=<?= $_GET['compid'] ?>">Online entry</a><br>
                      <img src="https://api.qrserver.com/v1/create-qr-code/?data=https://liveres.live/entry.php?comp=<?= $_GET['compid'] ?>&amp;size=150x150" alt="" title="" />
                    </td>
                    <td>
                      &nbsp;
                    <td>
                      <a href="../ecardchange.php?comp=<?= $_GET['compid'] ?>">Online ecard change</a><br>
                      <img src="https://api.qrserver.com/v1/create-qr-code/?data=https://liveres.live/ecardchange.php?comp=<?= $_GET['compid'] ?>&amp;size=150x150" alt="" title="" />
                    </td>
                  <?php } ?>
                </tr>
              </table>
              <?php if (!$time4o) { ?>
                <hr />
                <h1 class="categoriesheader">Radio Controls</h1>
                <p><a href="./radiocontrols.php?comp=<?= $_GET['compid'] ?>">Radio control editor</a>
                <form name="formrdo1" action="editComp.php?what=radio&compid=<?= $comp['tavid'] ?>" method="post">
                  <a href="javascript:confirmDelete('Do you want to delete ALL radiocontrols?','?compid=<?= $_GET['compid'] ?>&what=delallctr&compid=<?= $_GET['compid'] ?>');">Delete all radio controls</a>
                  <table border="0">
                    <tr>
                      <td><b>Code</td>
                      <td><b>Name</td>
                      <td><b>Class</td>
                      <td><b>Order</td>
                    </tr>
                    <?php
                    $rcontrols = Emma::GetRadioControls($_GET['compid']);
                    for ($i = 0; $i < sizeof($rcontrols); $i++) {
                      echo ("<tr><td>" . $rcontrols[$i]["code"] . "</td><td>" . $rcontrols[$i]["name"] . "</td><td>" . $rcontrols[$i]["classname"] . "</td><td>" . $rcontrols[$i]["corder"] . "</td><td><a href='javascript:confirmDelete(\"Do you want to delete this radiocontrol?\",\"?compid=" . $_GET['compid'] . "&what=delctr&compid=" . $_GET['compid'] . "&code=" . $rcontrols[$i]['code'] . "&class=" . urlencode($rcontrols[$i]["classname"]) . "\");'>Delete</a></td></tr>");
                    }
                    ?>
                  </table>
                  <hr />
                  <b>Add radio control for all classes</b><br />
                  Code = 1000*(pass count) + control code, eg. 1st pass at control 53 => 1053, 2nd pass => 2053<br />
                  <table>
                    <tr>
                      <td>Code</td>
                      <td><input type="text" name="codeall" /></td>
                    </tr>
                    <tr>
                      <td>Control-Name</td>
                      <td><input type="text" name="controlnameall" /></td>
                    </tr>
                    <tr>
                      <td>Order</td>
                      <td><input type="text" name="order" /></td>
                    </tr>
                  </table>
                  <input type="submit" name="btnAddAll" value="Add control for all classes" />
                  <hr />
                  <b>Add single radio control</b><br />
                  Code = 1000*(pass count) + control code, eg. 1st pass at control 53 => 1053, 2nd pass => 2053<br />
                  <table>
                    <tr>
                      <td>Code</td>
                      <td><input type="text" name="code" /></td>
                    </tr>
                    <tr>
                      <td>Control-Name</td>
                      <td><input type="text" name="controlname" /></td>
                    </tr>
                    <tr>
                      <td>ClassName</td>
                      <td><input type="text" name="classname" /></td>
                    </tr>
                  </table>
                  <input type="submit" name="btnAdd" value="Add single control" />
                </form>
              <?php } ?>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>

</html>