using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Threading;
using LiveResults.Client.Model;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Xml;
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using LiveResults.Model;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
namespace LiveResults.Client
{

    public class BrikkesysParser : IExternalSystemResultParserEtiming
    {
        private readonly IDbConnection m_connection;
        private readonly bool m_recreateRadioControls;
        private readonly int m_raceID;
        public event DeleteUnusedIDDelegate OnDeleteUnusedID;
        public event MergeRadioControlsDelegate OnMergeRadioControls;
        public event MergeCourseControlsDelegate OnMergeCourseControls;
        public event RadioControlDelegate OnRadioControl;
        public event ResultDelegate OnResult;
        public event LogMessageDelegate OnLogMessage;
        public event DeleteIDDelegate OnDeleteID;
        private bool m_isRelay = false;
        private bool m_continue;
        private int m_compID;

        Thread m_monitorThread;

        public BrikkesysParser(IDbConnection conn, int BrikkesysID, int compID)
        {
            m_connection = conn;
            m_recreateRadioControls = false;
            m_isRelay = false;
            m_raceID = BrikkesysID;
            m_compID = compID;
        }

        private void Run()
        {
            while (m_continue)
            {
                try
                {
                    FireLogMsg("Brikkesys Monitor thread started");

                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();
                    IDbCommand cmdInd = m_connection.CreateCommand();

                    makeRadioControls();
                    var courses = new Dictionary<int, List<CourseControl>>();
                    courses = getCourses();

                    string baseCommandInd = "SELECT N.id, N.startnr, N.name, N.ecardno, N.club, N.time, N.starttime, N.nulltime, " +
                                            "N.timecalculation, N.codesandtimes, N.status, N.courceid, " +
                                            "C.name AS cname, C.meter, cast(C.nosort AS signed) AS nosort, C.starttime AS cstarttime, CC.courceid AS ccourceid " +
                                            "FROM names N " +
                                            "LEFT JOIN classes C ON C.id = N.classid " +
                                            "LEFT JOIN(SELECT MIN(raceid) AS raceid, MIN(courceid) AS courceid, MIN(classid) AS cclassid " +
                                            "FROM classcource WHERE raceid = " + m_raceID + " GROUP BY classid) AS CC ON CC.cclassid = N.classid " +
                                            "WHERE N.raceid = " + m_raceID;
                    cmdInd.CommandText = baseCommandInd;

                    string lastRunner = "";
                    List<int> usedID = new List<int>();

                    string messageServer = ConfigurationManager.AppSettings["messageServer"];
                    string apiServer = ConfigurationManager.AppSettings["apiServer"];
                    WebClient client = new WebClient();
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; //TLS 1.2

                    int m_sleepTime = 3;
                    int maxSleepTimeMessage = 9; // Time between reading messages
                    int sleepTimeMessage = maxSleepTimeMessage;
                    int maxSleepTimeLiveActive = 60; //Time between setting new live active signal
                    int sleepTimeLiveActive = maxSleepTimeLiveActive;
                    bool failedLast = false;
                    bool failedThis;

                    // Main loop
                    while (m_continue)
                    {
                        try
                        {
                            ParseReader(cmdInd, ref courses, out lastRunner, out usedID);
                            FireOnDeleteUnusedID(usedID);

                            sleepTimeLiveActive += m_sleepTime;
                            if (sleepTimeLiveActive >= maxSleepTimeLiveActive)
                            {
                                SendLiveActive(apiServer, client);
                                sleepTimeLiveActive = 0;
                            }

                            sleepTimeMessage += m_sleepTime;
                            if (sleepTimeMessage >= maxSleepTimeMessage)
                            {
                                UpdateFromMessages(messageServer, client, failedLast, out failedThis);
                                failedLast = failedThis;
                                sleepTimeMessage = 0;
                            }
                            Thread.Sleep(1000 * m_sleepTime);
                        }
                        catch (Exception ee)
                        {
                            FireLogMsg("Brikkesys Parser: " + ee.Message + " {parsing: " + lastRunner + "}");
                            Thread.Sleep(100);
                            switch (m_connection.State)
                            {
                                case ConnectionState.Broken:
                                case ConnectionState.Closed:
                                    m_connection.Close();
                                    m_connection.Open();
                                    break;
                            }
                        }
                    }
                }
                catch (Exception ee)
                {
                    FireLogMsg("Brikkesys Parser: " + ee.Message);
                }
                finally
                {
                    if (m_connection != null)
                        m_connection.Close();
                    FireLogMsg("Brikkesys Monitor thread stopped");
                }
            }

        }

        private void ParseReader(IDbCommand cmd, ref Dictionary<int, List<CourseControl>> courses, out string lastRunner, out List<int> usedID)
        {
            lastRunner = "";
            usedID = new List<int>();
            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int time = -2, runnerID = 0, iStartTime = 0, iNullTime = 0, iCStartTime = 0, bib = 0, ecard = 0,
                        length = 0, noSort = 0, courceID = -1, timeOffset = 0;
                    string runnerName = "", club = "", classN = "";
                    string status = "", timeCalc = "", codesAndTimes = "", EcardTimes = "";
                    var SplitTimes = new List<ResultStruct>();

                    try
                    {
                        runnerID = Convert.ToInt32(reader["id"]);
                        runnerName = reader["name"] as string;
                        lastRunner = runnerName;
                        club = reader["club"] as string;
                        classN = reader["cname"] as string;
                        timeCalc = reader["timecalculation"] as string;

                        if (reader["startnr"] != null && reader["startnr"] != DBNull.Value)
                            bib = Convert.ToInt32(reader["startnr"]);

                        if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                            ecard = Convert.ToInt32(reader["ecardno"]);

                        if (reader["meter"] != null && reader["meter"] != DBNull.Value)
                            length = Convert.ToInt32(reader["meter"]);

                        if (reader["courceid"] != null && reader["courceid"] != DBNull.Value)
                            courceID = Convert.ToInt32(reader["courceid"]);
                        
                        // If no cource id set for runner (by auto selection), use class cource
                        if (courceID == -1 && reader["ccourceid"] != null && reader["ccourceid"] != DBNull.Value)
                            courceID = Convert.ToInt32(reader["ccourceid"]);

                        if (reader["nulltime"] != null && reader["nulltime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["nulltime"].ToString(), out DateTime parseTime);
                            iNullTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }

                        if (reader["cstarttime"] != null && reader["cstarttime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["cstarttime"].ToString(), out DateTime parseTime);
                            iCStartTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }

                        if (reader["starttime"] != null && reader["starttime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["starttime"].ToString(), out DateTime parseTime);
                            iStartTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }
                        else // Open start
                            iStartTime = -999;

                        if ((timeCalc == "J" || timeCalc == "S") && (iStartTime - iNullTime > 0))
                            timeOffset = (iStartTime - iNullTime) / 100;                        

                        if (reader["codesandtimes"] != null && reader["codesandtimes"] != DBNull.Value)
                            codesAndTimes = reader["codesandtimes"] as string;
                        if (codesAndTimes != "" && courceID > -1)
                            EcardTimes = makeSplitTimes(codesAndTimes, timeOffset, courceID, courses);

                        if (reader["nosort"] != null && reader["nosort"] != DBNull.Value)
                            noSort = Convert.ToInt32(reader["nosort"]);

                        if (reader["status"] != null && reader["status"] != DBNull.Value)
                            status = reader["status"] as string;

                        if (status == "A" && noSort >= 1)
                            status = "F";

                        if (reader["time"] != null && reader["time"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["time"].ToString(), out DateTime parseTime);
                            time = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }

                        if (noSort == 1 && time > 0 && (status == "F" || status == "D")) // Unranked, show times
                            SplitTimes.Add(new ResultStruct { ControlCode = -999, Time = time });

                        if (timeCalc == "J") // Chase start
                        {
                            int startBehind = iStartTime - iCStartTime;
                            if (startBehind >= 0)                                
                                SplitTimes.Add(new ResultStruct{ ControlCode = 0, Time = startBehind });
                            
                            int legTime = time - startBehind;
                            if (legTime > 0)
                                SplitTimes.Add(new ResultStruct{ ControlCode = 999,  Time = legTime });                            
                        }
                        int rstatus = GetStatusFromCode(ref time, status, runnerID);

                        if (rstatus != 999)
                        {
                            usedID.Add(runnerID);
                            var res = new Result
                            {
                                ID = runnerID,
                                RunnerName = runnerName,
                                RunnerClub = club,
                                Bib = bib,
                                Class = classN,
                                StartTime = iStartTime,
                                Time = time,
                                Ecard1 = ecard,
                                Length = length,
                                EcardTimes = EcardTimes,
                                SplitTimes = SplitTimes,
                                Course = courceID,
                                Status = rstatus
                            };
                            FireOnResult(res);
                        }
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Brikkesys Parser: " + ee.Message + " {Last parsing: " + lastRunner + "}");
                    }
                }
                reader.Close();
            }
        }

        private static int GetStatusFromCode(ref int time, string status, int runnerID)
        {
            int rstatus = 10;
            switch (status)
            {
                case "A": rstatus = 0; break; // OK
                case "N": rstatus = 1; time = -3; break; // DNS
                case "E": rstatus = 2; time = -3; break; // DNF
                case "D": rstatus = 3; time = -3; break; // DSQ 
                case "H": rstatus = 9; time = -3; break; // Started
                case "W": rstatus = 10; time = -3; break; // Entered 
                case "I": rstatus = 10; time = -3; break; // Entered 
                case "F": rstatus = 13; time = runnerID; break; // Not ranked
                default: rstatus = 999; break;  // Unsupported status
            }
            return rstatus;
        }

        private void makeRadioControls()
        {
            try
            {
                // Setting up extra times               
                List<RadioControl> extraTimes = new List<RadioControl>();
                var dlgMergeRadio = OnMergeRadioControls;

                if (m_connection.State != ConnectionState.Open)
                    m_connection.Open();
                IDbCommand cmd = m_connection.CreateCommand();
                string classTimingType = "SELECT name, cast(nosort AS signed) AS nosort, timecalculation FROM classes WHERE raceid=" + m_raceID;
                cmd.CommandText = classTimingType;

                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        int noSort = 0;
                        string timecalculation = "";
                        string classN = reader["name"] as string;
                        if (reader["nosort"] != null && reader["nosort"] != DBNull.Value)
                            noSort = Convert.ToInt32(reader["nosort"]);
                        if (reader["timecalculation"] != null && reader["timecalculation"] != DBNull.Value)
                            timecalculation = reader["timecalculation"] as string;

                        if (noSort == 1) // Add neg finish passing for not-ranked, show times class
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Tid",
                                Code = -999,
                                Order = 999
                            });

                        if (timecalculation == "J")
                        {
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Start",
                                Code = 0,
                                Order = 0
                            });

                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Leg",
                                Code = 999,
                                Order = 999
                            });
                        }
                    }
                    reader.Close();
                    RadioControl[] radioControls = extraTimes.ToArray();
                    dlgMergeRadio(radioControls, true);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("Brikkesys Parser makeRadioControls: " + ee.Message);
            }            
        }

        private string makeSplitTimes(string splitTimeString, int timeOffset, int course, Dictionary<int, List<CourseControl>> courses)
        {
            string[] ecardTimes = splitTimeString.Split(',');
            string ecardTimeString = "";
            int controlNo = 0, timeNo = 0, timeNoLast = -1, numControls = 0;
            if (courses.ContainsKey(course))
                numControls = courses[course].Count;
            bool first = true;
            while (controlNo < numControls)
            {
                int timeMatch = -1;
                int[] codeTime = { 0, 0 }; // Code, time
                timeNo = timeNoLast + 1;
                while (timeNo < ecardTimes.Length)
                {
                    codeTime = Array.ConvertAll(ecardTimes.ElementAt(timeNo).TrimStart().Split(' '), int.Parse);
                    if (codeTime[0] == courses[course].ElementAt(controlNo).Code)
                    {
                        timeNoLast = timeNo;
                        break;
                    }
                    timeNo++;
                }
                if (timeNo < ecardTimes.Length) // control found
                    timeMatch = codeTime[1] - timeOffset;
                if (first)
                    first = false;
                else
                    ecardTimeString += ",";
                ecardTimeString += timeMatch.ToString();
                controlNo++;
            }
            return ecardTimeString;
        }

        private Dictionary<int, List<CourseControl>> getCourses()
        {
            var courses = new Dictionary<int, List<CourseControl>>();
            try
            {
                var dlgMergeCourseControls = OnMergeCourseControls;

                if (dlgMergeCourseControls != null) // Read courses
                {
                    List<CourseControl> courseControls = new List<CourseControl>();
                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();
                    IDbCommand cmd = m_connection.CreateCommand();
                    string controls = "SELECT id, codes FROM classes WHERE cource=1 AND raceid=" + m_raceID;
                    cmd.CommandText = controls;
                    using (IDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            int id = Convert.ToInt32(reader["id"]);
                            string codesStr = reader["codes"] as string;
                            if (codesStr == "")
                                continue;
                            int[] codes = Array.ConvertAll(codesStr.Split(' '), int.Parse);
                            for (int i = 0; i < codes.Length - 1; i++) // Last control is finish
                            {
                                var control = new CourseControl
                                {
                                    CourseNo = id,
                                    Code = codes[i],
                                    Order = i
                                };
                                courseControls.Add(control);
                                if (!courses.ContainsKey(id))
                                    courses.Add(id, new List<CourseControl>());
                                courses[id].Add(control);
                            }
                        }
                        reader.Close();
                    }
                    CourseControl[] courseControlArray = courseControls.ToArray();
                    dlgMergeCourseControls(courseControlArray, true);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("Brikkesys Parser makeCourses: " + ee.Message);
            }
            return courses;
        }

        private void SendLiveActive(string apiServer, WebClient client)
        {
            string apiResponse = "";
            try
            {
                apiResponse = client.DownloadString(apiServer + "api.php?method=setlastactive&comp=" + m_compID);
                FireLogMsg("Client live active sent to web server");
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network or config file? Error on sending active signal: " + ee.Message);
            }
        }

        private void UpdateFromMessages(string messageServer, WebClient client, bool failedLast, out bool failedThis)
        {
            failedThis = false;
            string apiResponse = "";
            // Get DNS and ecard changes
            try
            {
                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=getchanges&comp=" + m_compID);
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network or config file? LiveRes Message error: " + ee.Message);
            }

            var objects = JsonConvert.DeserializeObject<dynamic>(apiResponse);
            if (objects != null && objects.status == "OK")
            {

                // DNS
                // *****************************
                JArray itemsDNS = (JArray)objects["dns"];
                foreach (JObject element in itemsDNS)
                {
                    int messid = (element["messid"]).ToObject<int>();
                    int dbid = (element["dbid"]).ToObject<int>();
                    try
                    {
                        IDbCommand cmd = m_connection.CreateCommand();
                        cmd.CommandText = string.Format(@"SELECT id, name, status FROM names WHERE id={0} AND raceid={1}", dbid, m_raceID);

                        int id = 0;
                        string status = "", name = "";
                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                if (reader[0] != null && reader[0] != DBNull.Value)
                                {
                                    status = reader["status"] as string;
                                    name = reader["name"] as string;
                                    id = Convert.ToInt32(reader["id"].ToString());
                                }
                            }
                            reader.Close();
                        }

                        if (status == "I")
                        {
                            cmd.CommandText = string.Format(@"UPDATE names SET status='N' WHERE id={0} AND raceid={1}", id, m_raceID);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("LiveRes Message (ID: " + id + ") " + name + " set to DNS");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                            }
                            else if (failedLast)
                            {
                                FireLogMsg("LiveRes Message (ID: " + id + ") " + name + " not possible to set to DNS");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setdns&dns=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere. Status:" + status + "&dbid=" + dbid);
                            }
                            else
                                failedThis = true;
                        }
                        else if (failedLast)
                        {
                            FireLogMsg("LiveRes Message (ID: " + id + ") " + name + " not posible to set to DNS. Status: " + status);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setdns&dns=0&messid=" + messid);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere. Status:" + status + "&dbid=" + dbid);
                        }
                        else
                            failedThis = true;
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Bad network or config file? LiveRes Message DNS: " + ee.Message);
                    }
                }

                // Ecard change
                // *****************************
                JArray itemsEcard = (JArray)objects["ecardchange"];
                foreach (JObject element in itemsEcard)
                {
                    int dbidMessage = (element["dbid"]).ToObject<int>();
                    int messid = (element["messid"]).ToObject<int>();
                    int ecard = (element["ecard"]).ToObject<int>();
                    int bib = (element["bib"]).ToObject<int>();

                    try
                    {
                        IDbCommand cmd = m_connection.CreateCommand();
                        cmd.CommandText = string.Format(@"SELECT id, name, ecardno, status FROM names WHERE startnr={0} AND raceid={1}", bib, m_raceID);

                        string status = "", name = "";
                        int dbid = 0, ecardOld = 0, numBibs = 0;
                        bool bibOK = false, ecardOK = true, sameBibEcard = false, statusOK = false;

                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                if (reader[0] != null && reader[0] != DBNull.Value)
                                {
                                    numBibs += 1;
                                    status = reader["status"] as string;
                                    statusOK = (status == "I");
                                    name = reader["name"] as string;
                                    dbid = Convert.ToInt32(reader["id"].ToString());
                                    if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                                        ecardOld = Convert.ToInt32(reader["ecardno"].ToString());
                                }
                            }
                            reader.Close();
                            bibOK = (numBibs == 1 && statusOK);
                        }

                        if (bibOK)
                        {
                            int BrikkesysBib = 0;
                            cmd.CommandText = string.Format(@"SELECT startnr FROM names WHERE ecardno={0} AND raceid={1}", ecard, m_raceID);
                            using (IDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    if (reader[0] != null && reader[0] != DBNull.Value)
                                    {
                                        ecardOK = false; // ecard already inm use                              
                                        if (reader["startnr"] != null && reader["startnr"] != DBNull.Value)
                                            BrikkesysBib = Convert.ToInt32(reader["startnr"].ToString());
                                        sameBibEcard = (BrikkesysBib == bib);
                                    }
                                }
                                reader.Close();
                            }
                        }

                        if (bibOK && ecardOK)
                        {
                            cmd.CommandText = string.Format(@"UPDATE names SET ecardno={0} WHERE startnr={1} AND raceid={2}", ecard, bib, m_raceID);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("LiveRes Message: (bib: " + bib + ") " + name + " replaced ecard: " + ecardOld + " with: " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID + "&message=Brikke: " + ecardOld +
                                    " byttet til " + ecard + "&dbid=" + dbid);
                            }
                            else if (failedLast)
                            {
                                FireLogMsg("LiveRes Message: (bib: " + bib + ") " + name + " not possible to change ecard " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setecardchange&ecardchange=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere brikke&dbid=" + dbidMessage);
                            }
                            else
                                failedThis = true;
                        }
                        else if (failedLast) // !bibOK || !ecardOK
                        {
                            FireLogMsg("LiveRes Message: (bib: " + bib + ") " + name + " not possible to change ecard " + ecard);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setecardchange&ecardchange=0&messid=" + messid);
                            if (sameBibEcard)           // Same bib and ecard existing
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID + "&message=Startnummer og brikke var allerede koblet&dbid=" + dbidMessage);
                            else if (!statusOK)         // Wrong status
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Brikkenr ikke oppdatert! Løpers status forskjellig fra Påmeldt&dbid=" + dbidMessage);
                            else if (bibOK && !ecardOK) // ecard used by another
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Brikkenr ikke oppdatert! Brikke allerede i bruk av annen løper?&dbid=" + dbidMessage);
                            else                        // !bibOK && ecardOK
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Brikkenr ikke oppdatert! Feil startnummer?&dbid=" + dbidMessage);
                        }
                        else
                            failedThis = true;
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Bad network or config file? LiveRes Message ecard: " + ee.Message);
                    }
                }
            }
        }

        private void FireOnResult(Result newResult)
        {
            if (OnResult != null)
            {
                OnResult(newResult);
            }
        }
        private void FireLogMsg(string msg)
        {
            if (OnLogMessage != null)
                OnLogMessage(msg);
        }
        private void FireOnDeleteID(int runnerID)
        {
            if (OnDeleteID != null)
                OnDeleteID(runnerID);
        }
        private void FireOnDeleteUnusedID(List<int> usedIds, bool first = false)
        {
            if (OnDeleteUnusedID != null)
                OnDeleteUnusedID(usedIds, first);
        }

        public void Start()
        {
            m_continue = true;
            m_monitorThread = new Thread(Run);
            m_monitorThread.Start();
        }

        public void Stop()
        {
            m_continue = false;
        }
    }
}
