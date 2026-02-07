<?php include_once("../templates/emmalang_sv.php");
include_once("../templates/classEmma.class.php");
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
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="robots" content="noindex">

  <link rel="stylesheet" type="text/css" href="../css/style-liveres.css">
  <link rel="stylesheet" type="text/css" href="../css/style-admin.css">

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
  </script>
</head>

<body topmargin="0" leftmargin="0">

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td class="submenu">
        <div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; 
  vertical-align: middle; line-height:45px; color: white; width: 100%; padding-left: 10px;">
          LiveRes admin page
        </div>
      </td>
    </tr>
    <tr>
      <td class="submenu" colspan="2">
        <table style="border: 1px solid gray; width: 100%; padding: 0;">
          <tr>
            <td style="text-align: center; border: 1px solid gray;"><a href="createComp.php">New competition</a></td>
            <td style="text-align: center; border: 1px solid gray;"><a href="./time4otolr.php">Connect Time4o competitions</a></td>
            <td style="text-align: center; border: 1px solid gray;"><a href="../">LiveRes main page</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="searchmenu" colspan="2" style="padding: 5px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <table style="border: 0; border-spacing: 5px 0px; width: 100%">
                <tr style="font-weight: bold;">
                  <td>Date</td>
                  <td>Competition</td>
                  <td>Organizer</td>
                  <td>Id</td>
                  <td>T4o</td>
                  <td>Public</td>
                  <td>URL</td>
                </tr>
                <?php
                $comps = Emma::GetAllCompetitions();

                foreach ($comps as $comp) {
                  $time4o = $comp["time4oid"] != "";
                ?>
                  <tr id="row<?= $comp["tavid"] ?>">
                    <td><?= date("Y-m-d", strtotime($comp['compDate'])) ?></td>
                    <td>
                      <div class="dropdownAdm">
                        <button class="dropbtnAdm"><?= $comp["compName"] ?></button>
                        <div class="dropdownAdm-content">
                          <a href="/adm/editComp.php?compid=<?= $comp["tavid"] ?>">Edit competition</a>
                          <a href="/followfull.php?comp=<?= $comp['tavid'] ?>">Results page</a>
                          <a href="/followfull.php?speaker&comp=<?= $comp["tavid"] ?>">Speaker view</a>
                          <a href="/message.php?comp=<?= $comp["tavid"] ?>">Messages</a>
                          <a href="/radio.php?comp=<?= $comp["tavid"] ?>&code=0">Start registration</a>
                          <?php if (!$time4o) { ?>
                            <a href="/adm/radiolinks.php?comp=<?= $comp["tavid"] ?>">Radio links</a>
                            <a href="/adm/runners.php?compid=<?= $comp["tavid"] ?>">Edit runners</a>
                            <a href="/adm/radiocontrols.php?comp=<?= $comp["tavid"] ?>">Radio control editor</a>
                            <a href="/adm/ecardcopy.php?comp=<?= $comp["tavid"] ?>">Copy ecard numbers</a>
                            <a href="/radio.php?comp=<?= $comp["tavid"] ?>&code=-2">Remaining runners</a>
                          <?php } ?>
                        </div>
                      </div>
                    </td>
                    <td><?= $comp["organizer"] ?></td>
                    <td><?= $comp["tavid"] ?></td>
                    <td>
                      <?php if ($time4o) { ?>
                        <img src="../images/time4o_small.svg" height="12px" style="vertical-align: bottom">
                      <?php } else { ?>
                        &nbsp;
                      <?php } ?>
                    </td>
                    <td><?= $comp["public"] == "1" ? "yes" : "no" ?></td>
                    <?php if (strlen($comp['livecenterurl']) > 0) { ?>
                      <td><a href="../<?= $comp['livecenterurl'] ?>">URL</a></td>
                    <?php } ?>
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
  <br>
  <a href="/api/api.php?method=getnumconnect">#Connections</a>
  <p>
  <p>
</body>

</html>