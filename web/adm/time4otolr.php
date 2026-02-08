<?php
date_default_timezone_set("Europe/Oslo");

include_once("../templates/emmalang_en.php");
include_once("../templates/classEmma.class.php");
include_once("../templates/datatablesURL.php");

// Fetch LiveRes competitions and extract already-mapped Time4o IDs
$existingTime4oIds = array();
$url = (($_SERVER['HTTP_HOST'] ?? '') == 'localhost' || ($_SERVER['SERVER_NAME'] ?? '') == 'localhost')
  ? "http://localhost/api/api.php?method=getcompetitions"
  : "https://api.liveres.live/api.php?method=getcompetitions";
$json = @file_get_contents($url);
if ($json !== false) {
  $data = json_decode($json, true);
  $comps = $data["competitions"] ?? array();
  foreach ($comps as $comp) {
    $time4oid = $comp['time4oid'] ?? "";
    if (is_string($time4oid) && strlen($time4oid) > 0) {
      $existingTime4oIds[] = $time4oid;
    }
  }
}
$existingTime4oIds = array_values(array_unique($existingTime4oIds));

header('Content-Type: text/html; charset=' . $CHARSET);
echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title><?= $_TITLE ?></title>
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#555556">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="../<?= $DataTablesURL ?>datatables.min.css">
  <link rel="stylesheet" href="../css/style-liveres.css" type="text/css">
  <script src="../<?= $DataTablesURL ?>datatables.min.js"></script>
  <script type="text/javascript">
    const existingTime4oIds = new Set(
      (<?= json_encode($existingTime4oIds, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?> || []).map(String)
    );

    $(document).ready(function() {
      $.ajax({
        url: "https://center.time4o.com/api/v1/race",
        data: "",
        dataType: "json",
        success: function(data, status, resp) {
          updateTable(data);
        }
      });
    });

    updateTable = function(data) {
      _this = this;
      if (data == null)
        return;

      var columns = Array();
      var col = 0;
      const maxLength = 30;

      columns.push({
        title: "Date",
        className: "dt-left",
        orderable: true,
        targets: [col++],
        data: "date"
      });

      columns.push({
        title: "Competition",
        className: "dt-left",
        orderable: true,
        targets: [col++],
        data: "title",
        render: function(data, type, row) {
          if (data == null)
            return "";
          if (data.length > maxLength)
            data = data.slice(0, maxLength) + "…";
          if (existingTime4oIds.has(String(row.id))) {
            return data + " (already connected)";
          }
          let ret = "<a href=\"./createComp.php?time4oid=" + encodeURIComponent(row.id);
          ret += "&title=" + encodeURIComponent(row.title);
          ret += "&date=" + encodeURIComponent(row.date);
          ret += "&org=" + encodeURIComponent(row.event.organisers[0].name);
          ret += "\">" + data + "</a>";
          return ret;
        }
      });

      columns.push({
        title: "Organizer",
        className: "dt-left",
        orderable: true,
        targets: [col++],
        data: "event.organisers[0].name",
        render: function(data, type, row) {
          if (data == null)
            return "";
          if (data.length > maxLength)
            data = data.slice(0, maxLength) + "…";
          return data;
        }
      });

      currentTable = $('#time4ocomps').DataTable({
        data: data.data,
        fixedHeader: true,
        columns: columns,
        paging: false,
        searching: true,
        info: false,
        order: [0]
      });

    };
  </script>
</head>

<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td class="submenu">
        <div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; 
  vertical-align: middle; line-height:45px; color: white; width: 100%; padding-left: 10px;">
          Connect Time4o to LiveRes
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
      <td>
        <table style="border:0px; width:100%; table-layout:fixed; padding: 0;">
          <tr valign=top>
            <td>
              <table id="time4ocomps"></table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <p style="text-align: left; font-size: 0.7em; color:#AAA">&copy;2012- Liveresults. Source code: https://github.com/palkitt/liveresults</p>
</body>

</html>