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
            FireLogMsg("Brikkesys Monitor thread started");

            makeRadioControls();

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
            bool first = true;

            // Main loop
            while (m_continue)
            {
                try
                {
                    sleepTimeLiveActive += m_sleepTime;
                    if (sleepTimeLiveActive >= maxSleepTimeLiveActive)
                    {
                        SendLiveActive(apiServer, client);
                        sleepTimeLiveActive = 0;
                    }

                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();
                    IDbCommand cmd = m_connection.CreateCommand();
                    string baseCommand = "SELECT N.id, N.startnr, N.name, N.ecardno, N.club, N.time, N.starttime, N.timecalculation, " +
                        "N.status, C.name AS cname, C.meter, C.nosort FROM names N, classes C " +
                        "WHERE C.id=N.classid AND N.raceid=" + m_raceID;                
                    cmd.CommandText = baseCommand;
                    IDataReader reader = null;
                    
                    while (m_continue)
                    {
                        string lastRunner = "";
                        List<int> usedID = new List<int>();

                        try
                        {
                            reader = cmd.ExecuteReader();
                            while (reader.Read())
                            {
                                int time = -2, runnerID = 0, iStartTime = 0, bib = 0, ecard = 0, length = 0, noSort = 0;
                                string runnerName = "", club = "", classN = "";
                                string status = "", timeCalc = "";
                                var SplitTimes = new List<ResultStruct>();

                                try
                                {
                                    runnerID = Convert.ToInt32(reader["id"]);
                                    usedID.Add(runnerID);
                                    runnerName = reader["name"] as string;
                                    lastRunner = runnerName;
                                    club = reader["club"] as string;
                                    classN = reader["cname"] as string;
                                    timeCalc = reader["timecalculation"] as string;

                                    if (reader["startnr"] != null && reader["startnr"] != DBNull.Value)
                                        bib = Convert.ToInt32(reader["startnr"]);

                                    if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                                        ecard = Convert.ToInt32(reader["ecardno"]);

                                    if (reader["starttime"] != null && reader["starttime"] != DBNull.Value)
                                    {
                                        DateTime.TryParse(reader["starttime"].ToString(), out DateTime parseStartTime);
                                        iStartTime = (int)Math.Round(parseStartTime.TimeOfDay.TotalSeconds * 100);
                                    }
                                    else // Open start
                                        iStartTime = -999;

                                    if (reader["nosort"] != null && reader["nosort"] != DBNull.Value)
                                        noSort = Convert.ToInt32(reader["nosort"]);

                                    if (reader["time"] != null && reader["time"] != DBNull.Value)
                                    {
                                        DateTime.TryParse(reader["time"].ToString(), out DateTime parseTime);
                                        time = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);                                        
                                    }
                                    if (noSort == 1 && time > 0) // Unranked, show times
                                    {
                                        var FinishTime = new ResultStruct
                                        {
                                            ControlCode = -999,
                                            Time = time
                                        };
                                        SplitTimes.Add(FinishTime);
                                    }

                                    if (reader["status"] != null && reader["status"] != DBNull.Value)
                                        status = reader["status"] as string;

                                    if (status == "A" && noSort >= 1)
                                        status = "F";

                                    if (reader["meter"] != null && reader["meter"] != DBNull.Value)
                                        length = Convert.ToInt32(reader["meter"]);

                                }
                                catch (Exception ee)
                                {
                                    FireLogMsg(ee.Message);
                                }

                                int rstatus = 0;
                                switch (status)
                                {
                                    case "A":  rstatus = 0;   break; // OK
                                    case "N":  rstatus = 1;  time = -3; break; // DNS
                                    case "E":  rstatus = 2;  time = -3; break; // DNF
                                    case "D":  rstatus = 3;  time = -3; break; // DSQ 
                                    case "H":  rstatus = 9;  time = -3; break; // Started
                                    case "W":
                                    case "I":  rstatus = 10; time = -3; break; // Entered 
                                    case "F":  rstatus = 13; time = runnerID; break; // Not ranked
                                    default:   rstatus = 999;  break;  // Unsupported status
                                }   
                                if (rstatus != 999)
                                {
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
                                        EcardTimes = "",
                                        SplitTimes = SplitTimes,
                                        Status = rstatus
                                    };
                                    FireOnResult(res);
                                }
                            }
                            reader.Close();
                            FireOnDeleteUnusedID(usedID);
                            Thread.Sleep(m_sleepTime*1000);
                        }
                        catch (Exception ee)
                        {
                            if (reader != null)
                                reader.Close();
                            FireLogMsg("Brikkesys Parser: " + ee.Message + " {parsing: " + lastRunner);
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
                    FireLogMsg("Brikkesys Parser: " +ee.Message);
                }
                finally
                {
                    if (m_connection != null)
                        m_connection.Close();
                    FireLogMsg("Disconnected");
                    FireLogMsg("Brikkesys Monitor thread stopped");
                }
            }
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
                string classTimingType = "SELECT name, nosort FROM classes WHERE raceid=" + m_raceID;
                cmd.CommandText = classTimingType;

                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        int noSort = 0;
                        string classN = reader["name"] as string;
                        if (reader["nosort"] != null && reader["nosort"] != DBNull.Value)
                            noSort = Convert.ToInt32(reader["nosort"]);

                        if (noSort == 1) // Add neg finish passing for not-ranked, show times class
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Tid",
                                Code = -999,
                                Order = 999
                            });
                    }
                    reader.Close();
                    RadioControl[] radioControls = extraTimes.ToArray();
                    dlgMergeRadio(radioControls);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("eTiming Parser: " + ee.Message);
            }
            finally
            {
                if (m_connection != null)
                    m_connection.Close();
            }
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
