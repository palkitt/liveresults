<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";
$first = 1;
$last = 999;

if (isset($_GET['lang']))
   $lang = $_GET['lang'];
if (isset($_GET['first']))
	$first = $_GET['first'];
if (isset($_GET['last']))
	$last = $_GET['last'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");

header('Content-Type: text/html; charset='.$CHARSET);

$currentComp = new Emma($_GET['comp']);

$showPath = true;

$RunnerStatus = Array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED,"0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "");
$showTimePrediction = true;

echo("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head><title><?=$_TITLE?> :: <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables.css">
<link rel="stylesheet" type="text/css" href="css/fixedColumns.dataTables.min.css">
<link rel="stylesheet" type="text/css" href="css/fixedHeader.dataTables.min.css">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<script type="text/javascript">

window.mobilecheck = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}
</script>

<script language="javascript" type="text/javascript" src="js/jquery-3.7.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.fixedColumns.min.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.fixedHeader.min.js"></script>
<script language="javascript" type="text/javascript" src="js/velocity.min.js"></script>
<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
<script language="javascript" type="text/javascript">


var Resources = {
	_TITLE: "<?= $_TITLE?>",
	_CHOOSECMP: "<?=$_CHOOSECMP?>",
	_AUTOUPDATE: "<?=$_AUTOUPDATE?>",
	_LASTPASSINGS: "<?=$_LASTPASSINGS?>",
	_LASTPASSFINISHED: "<?=$_LASTPASSFINISHED?>",
	_LASTPASSPASSED: "<?=$_LASTPASSPASSED?>",
	_LASTPASSWITHTIME: "<?=$_LASTPASSWITHTIME?>",
	_CHOOSECLASS: "<?=$_CHOOSECLASS?>",
	_NOCLASSESYET: "<?=$_NOCLASSESYET?>",
	_CONTROLFINISH: "<?=$_CONTROLFINISH?>",
	_NAME: "<?=$_NAME?>",
	_CLUB: "<?=$_CLUB?>",
	_TIME: "<?=$_TIME?>",
	_NOCLASSCHOSEN: "<?=$_NOCLASSCHOSEN?>",
	_HELPREDRESULTS: "<?=$_HELPREDRESULTS?>",
	_NOTICE: "<?=$_NOTICE?>",
	_STATUSDNS: "<?=$_STATUSDNS ?>",
	_STATUSDNF: "<?=$_STATUSDNF?>",
	_STATUSWO: "<?=$_STATUSWO?>",
	_STATUSMOVEDUP: "<?=$_STATUSMOVEDUP?>",
	_STATUSNOTSTARTED: "<?=$_STATUSNOTSTARTED?>",
	_STATUSOK: "<?=$_STATUSOK ?>",
	_STATUSMP: "<?=$_STATUSMP ?>",
	_STATUSDSQ: "<?=$_STATUSDSQ?>",
	_STATUSOT: "<?=$_STATUSOT?>",
	_FIRSTPAGECHOOSE: "<?=$_FIRSTPAGECHOOSE ?>",
	_FIRSTPAGEARCHIVE: "<?=$_FIRSTPAGEARCHIVE?>",
	_LOADINGRESULTS: "<?=$_LOADINGRESULTS ?>",
	_ON: "<?=$_ON ?>",
	_OFF: "<?=$_OFF?>",
	_TEXTSIZE: "<?=$_TEXTSIZE ?>",
	_LARGER: "<?=$_LARGER?>",
	_SMALLER: "<?=$_SMALLER?>",
	_OPENINNEW: "<?=$_OPENINNEW?>",
	_FORORGANIZERS: "<?=$_FORORGANIZERS ?>",
	_FORDEVELOPERS: "<?=$_FORDEVELOPERS ?>",
	_RESETTODEFAULT: "<?=$_RESETTODEFAULT?>",
	_OPENINNEWWINDOW: "<?=$_OPENINNEWWINDOW?>",
	_INSTRUCTIONSHELP: "<?=$_INSTRUCTIONSHELP?>",
	_LOADINGCLASSES: "<?=$_LOADINGCLASSES ?>",
	_START: "<?=$_START?>",
	_TOTAL: "<?=$_TOTAL?>",
	_CLASS: "<?=$_CLASS?>",
	_FREESTART : "<?=$_FREESTART?>",
	_NEWSTATUS : "<?=$_NEWSTATUS?>"
};

var runnerStatus = Array();
runnerStatus[0]  = "<?=$_STATUSOK?>";
runnerStatus[1]  = "<?=$_STATUSDNS?>";
runnerStatus[2]  = "<?=$_STATUSDNF?>";
runnerStatus[3]  = "<?=$_STATUSMP?>";
runnerStatus[4]  = "<?=$_STATUSDSQ?>";
runnerStatus[5]  = "<?=$_STATUSOT?>";
runnerStatus[9]  = "";
runnerStatus[10] = "";
runnerStatus[11] = "<?=$_STATUSWO?>";
runnerStatus[12] = "<?=$_STATUSMOVEDUP?>";
runnerStatus[13] = "<?=$_STATUSFINISHED?>";

function handleGetClasses(data,compID,first,last) {
            if (data != null && data.status == "OK") {
                if (!data.classes || !$.isArray(data.classes) || data.classes.length == 0) {
                    return null;
                }
                if (data.classes != null) {
                    
					var classes = data.classes;
					classes.sort(function(a, b)
					{
						var x  = [a.className.toLowerCase(), b.className.toLowerCase()];
						for (var i=0; i<2; i++)
						{
                            if (x[i].includes("åpen") || x[i].includes("open") || x[i].includes("gjest") || x[i].includes("dir") || x[i].includes("utv") )
                                x[i] = 'z' + x[i];
							x[i] = x[i].replace(/(^|[^\d])(\d)($|[^\d])/,'$100$2$3');      // Add 00 ahead of single digits
							x[i] = x[i].replace(/(^|[^\d])(\d)(\d)($|[^\d])/,'$10$2$3$4'); // Add  0 ahead of double digits
                            x[i] = x[i].replace(' ','');
                            x[i] = x[i].replace('-','');
                            x[i] = x[i].replace('+','');
						}
						if (x[0] < x[1]) {return -1;}
						if (x[0] > x[1]) {return 1;}
						return 0;
					});

					var res = Array(); 
                    var j = 0;
					var n = 0;
                    var resH = "resultsHeader";
					var resD = "divResults";
					
                    $.each(classes, function (key, value) {
						var className = value.className;
						n++;
                        if (className && className.length > 0 && n>=first && n<=last) {
							var resultsHeader = resH.concat(j);
							var divResults = resD.concat(j);
							
							var divH = document.createElement('table');
							document.body.appendChild(divH);
							divH.style = "margin-top: 20px; margin-left: 10px; margin-right: 10px; font-size: 20px";
							divH.id = resultsHeader;

							var divR = document.createElement('table');
							document.body.appendChild(divR);
							divR.style = "width: 100%";
                            divR.id = divResults;

							res[j] = new LiveResults.AjaxViewer(compID, "no", "divClasses", "divLastPassings", resultsHeader, "resultsControls", divResults,
							    "txtResetSorting", Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus,false, "", false,"",true);
							res[j].highTime = 0;
							res[j].noSplits=true;
							res[j].chooseClass(className);

                            res[j].compDate = "<?=$currentComp->CompDate();?>";
		                    res[j].eventTimeZoneDiff = <?=$currentComp->TimeZoneDiff();?>;
                            res[j].updateInterval = 6000;
		                    //res[j].startPredictionUpdate();

                            <?php if($currentComp->MassStartSorting() ){?>
		                    	res[j].curClassIsMassStart = true; <?php }?>
	
                            <?php if($currentComp->ShowTenthOfSeconds() ){?>
                                res[j].setShowTenth(true); <?php }?>

                            <?php if($currentComp->HighTime() ){?> 
                                res[j].highTime = <?=$currentComp->HighTime(); ?> <?php }?>

                            // Set ranked startlist
                            <?php if($currentComp->RankedStartlist()>-1 ){?> 
                                res[j].rankedStartlist = <?=$currentComp->RankedStartlist(); ?> <?php }?>
                            
                            // Qualification limits and classes (last limit is default)
                            res[j].qualLimits = [<?=$currentComp->QualLimits();?>];
                            res[j].qualClasses = [<?=$currentComp->QualClasses();?>];

                            j++;
                        }
                    });
                }
            }
            return;
 }; 


 function scrollDown(element,document)
 {
	element.animate({ scrollTop: document.height()}, 20000, scrollUp(element,document));
 };

 function scrollUp(element,document)
 {
	element.animate({ scrollTop: -document.height()}, 5000);
 };

$(document).ready(function()
{
	first = <?= (isset($_GET['first'])? $_GET['first'] : 1) ?>;
	last  = <?= (isset($_GET['last'])? $_GET['last'] : 999) ?>;
	$.ajax({url: "api/api.php",
			data: "comp=" + <?= $_GET['comp']?> + "&method=getclasses",
            success: function (data) {
						handleGetClasses(data,<?= $_GET['comp']?>,first,last); 
                    },
                    error: function () {},
                    dataType: "json"
                });
  
	setTimeout(function(){
		var divText = document.createElement('text');
		document.body.appendChild(divText);
		divText.style = "margin-top: 20px; font-size: 20px";
		divText.innerHTML = "<p>...</p>";
	},10000); 
	
	 // Add no screen sleep
	 document.addEventListener("click", enableNoSleep);
});

</script>
<script language="javascript" type="text/javascript">

let wakeLock = null;
async function enableNoSleep() {
  if (wakeLock !== null && !wakeLock.released) {
    console.log("Wake lock is already active");
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("Wake lock is now active");
  } catch (err) {
    console.error("Failed to acquire wake lock:", err);
  }
}


var delayTime = 25;
var stepSize = 1;
function pageScroll() {
	var currentY = window.scrollY;
	var bodyHeight = document.body.offsetHeight;
	var yPos = currentY + window.innerHeight;
	var scroller = setTimeout('pageScroll()',delayTime);
	currentY += stepSize;
	if (yPos >= bodyHeight){  
		clearTimeout(scroller);
		scroller = setTimeout(() => {
			window.scroll(0,0);
			scroller=setTimeout('pageScroll()',5000);
}, 5000);
	} else {
		window.scroll(0,currentY);
	}
}
setTimeout('pageScroll()', 5000);
</script>

</head>
<body>
</body>
</html>