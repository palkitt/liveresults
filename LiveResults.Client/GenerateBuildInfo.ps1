$buildDate = (Get-Date).ToString("yyyy-MM-dd")
$path = "Properties\BuildInfo.cs"
@"
using System.Reflection;
[assembly: AssemblyMetadata("BuildDate", "$buildDate")]
"@ | Out-File -Encoding utf8 $path
Write-Host "Updated BuildInfo.cs with build date $buildDate"