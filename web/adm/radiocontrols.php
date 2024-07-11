<?php

include_once("../templates/emmalang_en.php");
include_once("../templates/classEmma.class.php");
header('Content-Type: text/html; charset=' . $CHARSET);

$currentComp = new Emma($_GET['comp']);

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title>LiveRes Radio Control Editor :: <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

  <META HTTP-EQUIV="expires" CONTENT="-1">
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#555556">
  <link rel="stylesheet" type="text/css" href="../css/style-freidig.css">
  <link rel="stylesheet" type="text/css" href="../css/jquery.dataTables.css">
  <link rel="stylesheet" type="text/css" href="../css/fixedHeader.dataTables.min.css">

  <script language="javascript" type="text/javascript" src="../js/jquery-3.7.0.min.js"></script>
  <script language="javascript" type="text/javascript" src="../js/jquery.dataTables.min.js"></script>
  <script language="javascript" type="text/javascript" src="../js/dataTables.fixedHeader.min.js"></script>
  <script language="javascript" type="text/javascript">
    var codes = null;
    var classes = null;
    var scrolly = 0;
    var scrollx = 0;
    var comp = <?= $_GET['comp'] ?>;

    $(document).ready(function() {
      _this = this;
      $.ajax({
        url: "/api/api.php",
        data: "comp=" + comp + "&method=getclasses",
        success: function(data, status, resp) {
          classes = data.classes;
          loadControls();
        },
        dataType: "json"
      });
    });

    loadControls = function(cellData = null) {
      $.ajax({
        url: "/api/api.php",
        data: "comp=" + comp + "&method=getsplitcontrols",
        success: function(data, status, resp) {
          updateControlTable(data, cellData);
        },
        dataType: "json"
      });
    };

    deleteControl = function(code, className, cell) {
      scrollx = $(window).scrollLeft();
      scrolly = $(window).scrollTop();
      var ret = $.ajax({
        url: "/api/api.php?method=deleteradiocontrol",
        data: "comp=" + comp + "&code=" + code + "&classname=" + className,
        success: function() {
          loadControls();
        }
      });
    }

    modifyControl = function(code, className, name, order, codes, cell) {
      scrollx = $(window).scrollLeft();
      scrolly = $(window).scrollTop();
      const position = getPosition(cell);
      let cellData = {
        row: position.row,
        col: position.col,
        name: name,
        order: order,
        codes: codes
      };

      var ret = $.ajax({
        url: "/api/api.php?method=deleteradiocontrol",
        data: "comp=" + comp + "&code=" + code + "&classname=" + className,
        success: function() {
          loadControls(cellData);
        }
      });
    }

    addNewControl = function(className, idcode, idname) {
      var code = idcode.value;
      var name = idname.value;
      addControl(className, code, name);
    }

    addControl = function(className, code, name) {
      scrollx = $(window).scrollLeft();
      scrolly = $(window).scrollTop();

      // Split the name parameter into a name string and an order integer
      var nameParts = name.split("|");
      var nameStr = nameParts[0].trim();
      var order = nameParts.length > 1 ? parseInt(nameParts[1].replace(/\D/g, '')) : -1;
      if (isNaN(order) || nameStr === "")
        return;

      var ret = $.ajax({
        url: "/api/api.php?method=addradiocontrol",
        data: "comp=" + comp + "&code=" + code + "&classname=" + className + "&name=" + nameStr + "&order=" + order,
        success: function() {
          loadControls();
        }
      });
    }

    addControlForAllClasses = function(idcode, idorder, idname) {
      var code = parseInt(idcode.value.trim());
      var order = parseInt(idorder.value.trim());
      var name = idname.value.trim();
      if (isNaN(code) || isNaN(order) || name === "")
        return;

      var ret = $.ajax({
        url: "/api/api.php?method=addradiocontrolforallclasses",
        data: "comp=" + comp + "&code=" + code + "&order=" + order + "&name=" + name,
        success: function() {
          loadControls();
        }
      });
    }

    updateMarkers = function() {
      var table = this.currentTable.api();
      table.rows().every(function(rowIdx, tableLoop, rowLoop) {
        var data = this.data();
        data.controls.forEach(function(control, controlIdx) {
          if (control.name != "")
            $(table.cell(rowIdx, controlIdx + 1).node()).addClass('green_cell');
          else
            $(table.cell(rowIdx, controlIdx + 1).node()).removeClass('green_cell');
        });
      });
    }

    getPosition = function(reference) {
      const cell = $(reference).closest('td')[0];
      const table = $('#radiocontrols').DataTable();
      const row = table.row(cell.parentNode);
      const col = table.column(cell);
      return {
        row: row.index(),
        col: col.index()
      };
    }

    updateControlTable = function(data, cellData = null) {
      _this = this;
      if (data != null && data.status == "OK" && data.splitcontrols != null) {
        var radioControls = data.splitcontrols;
        var uniqueCodes = new Set();
        data.splitcontrols.forEach(function(splitcontrol) {
          var code = splitcontrol.code;
          uniqueCodes.add(code);
        });

        var changedNumControls = false;
        if (cellData != null)
          codes = cellData.codes;
        else {
          changedNumControls = (codes != null && codes.length != uniqueCodes.size)
          codes = Array.from(uniqueCodes);
          codes.sort(function(a, b) {
            if (a % 1000 == b % 1000)
              return a - b
            else
              return a % 1000 - b % 1000
          })
        }

        for (let i in classes) {
          var className = classes[i].className;
          var classControls = new Array();
          for (let j in codes) {
            var code = codes[j];
            var name = "";
            var order = "";
            for (let k in radioControls) {
              if (radioControls[k].class == className && radioControls[k].code == code) {
                name = radioControls[k].name;
                order = radioControls[k].order;
              }
            }
            classControls.push({
              code: code,
              name: name,
              order: order
            });
          }
          classes[i].controls = classControls;
        }

        if (this.currentTable != null && !changedNumControls) // Existing datatable
        {
          this.currentTable.fnClearTable();
          this.currentTable.fnAddData(classes, true);
        } else {
          if (this.currentTable != null) {
            this.currentTable.api().destroy();
            $('#radiocontrols').html('');
          }

          var columns = Array();
          var col = 0;

          columns.push({
            "sTitle": "Class",
            "sClass": "left",
            "bSortable": true,
            "aTargets": [col++],
            "mDataProp": "className",
            "render": function(data, type, row) {
              return "<b>" + data + "</b>";
            }
          });


          for (let i in codes) {
            const controlCode = codes[i] % 1000;
            const title = `Control: ${controlCode}<br>Code: ${codes[i]}`;

            columns.push({
              "sTitle": title,
              "sClass": "right",
              "bSortable": true,
              "aTargets": [col++],
              "mDataProp": "controls",
              "render": function(data, type, row) {
                if (data[i].name) {
                  let del = "<span class=\"selectControl\" onclick=\"deleteControl(" + data[i].code + ",'" + row.className + "', this)\"><small> ❌</small></span>";
                  let modify = "<span class=\"selectControl\" onclick=\"modifyControl(" + data[i].code + ",'" + row.className + "','" + data[i].name + "'," + data[i].order + ",[" +
                    codes.toString() + "], this)\">";
                  let link = modify + data[i].name + " <small>|" + data[i].order + "|</small></span>" + del;
                  return link;
                } else {
                  _this = this;
                  const id = "id" + Math.random().toString(16).slice(2);
                  const link = `<input type="text" id=${id} style="width: 70px;">`;
                  return link;
                }
              }
            });
          };

          const idcode = "id" + Math.random().toString(16).slice(2);
          const idorder = "id" + Math.random().toString(16).slice(2);
          const idname = "id" + Math.random().toString(16).slice(2);

          var addNewTitle = `Add for all: ` +
            `Order <input type="text" id=${idorder} style="width: 20px;"><span style=\"color: white;\">&#10004;</span>` +
            `<br>C<input type="text" id=${idcode} style="width: 30px;">` +
            ` N<input type="text" id=${idname} style="width: 50px;">` +
            `<span class=\"selectControl\" style=\"color: green;\" onclick="addControlForAllClasses(${idcode}, ${idorder}, ${idname})">&#10004;</span>`;

          columns.push({
            "sTitle": addNewTitle,
            "sClass": "right",
            "bSortable": true,
            "aTargets": [col++],
            "mDataProp": "",
            "render": function(data, type, row) {

              const idcode = "id" + Math.random().toString(16).slice(2);
              const idname = "id" + Math.random().toString(16).slice(2);
              var link = `C<input type="text" id=${idcode} style="width: 30px;">` +
                ` N<input type="text" id=${idname} style="width: 50px;">` +
                `<span class=\"selectControl\" style=\"color: green;\" onclick="addNewControl('` + row.className + `',${idcode},${idname})">&#10004;</span>`;
              return link;
            }
          });

          this.currentTable = $('#radiocontrols').dataTable({
            "fixedHeader": true,
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "dom": 'lrtip',
            "bSort": false,
            "bInfo": false,
            "bAutoWidth": false,
            "aaData": classes,
            "aaSorting": [],
            "aoColumnDefs": columns,
            "bDestroy": true,
            "orderCellsTop": true
          });

          $('#radiocontrols').on('blur', 'input', function() {
            const name = $(this).val();
            const position = getPosition(this);
            if (position.row == undefined || position.col > codes.length || name == '')
              return;
            var data = _this.currentTable.fnGetData();
            var className = data[position.row].className;
            var code = codes[position.col - 1];
            addControl(className, code, name);
          });
        }

        updateMarkers();

        if (cellData != null) {
          let cell = this.currentTable.api().cell(cellData.row, cellData.col).node();
          let inputID = $(cell).find('input').attr('id');
          let controlStr = cellData.name + " |" + cellData.order + "|";
          $('#' + inputID).val(controlStr).focus();
        }
      };
      $(window).scrollLeft(scrollx);
      $(window).scrollTop(scrolly);
    };
  </script>
</head>

<body>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td valign="bottom">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td colspan="4"><span class="mttop"></td>
          </tr>
        </table>
      </td>
      <td align="right" valign="bottom"></td>
    </tr>
    <tr>
      <td class="submenu" colspan="2">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td><a href="./editComp.php?compid=<?= $_GET['comp'] ?>">Edit current competition</a> | <a href="./">Admin index</a></td>
          </tr>
          <tr>
            <td><?= $currentComp->CompName() ?>, <?= $currentComp->Organizer() ?> [<?= $currentComp->CompDate() ?>]</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="searchmenu" colspan="2" style="padding: 5px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 class="categoriesheader">Radio Control Editor </h1>
            </td>
          </tr>
        </table>
    </tr>
    <tr>
      <table style="width:100%; table-layout:fixed;" cellpadding="0" cellspacing="3" border="0">
        <tr>
          <td width="100%">
            <b>Code:</b> 1000*(pass count) + control code, eg. 1st pass at control 53 = 1053, 2nd pass = 2053. Negative for non-ranking.<br>
            <b>Name:</b> name |order|, eg. "3,4km |2|" means control name "3,4km" and order 2. Drop |order| for automatic setting.<br>
            <b>Add:</b> To include a control for all classes, use upper right fields, and to include a control for a specific class, use the fields in the class row.<br>
          </td>
        </tr>
        <tr valign=top>
          <td>
            <table width="100%" cellpadding="3px" cellspacing="0px" border="0">
              <tr valign=top>
              <tr>
                <td>
                  <table id="radiocontrols"></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </tr>
  </table>
</body>

</html>