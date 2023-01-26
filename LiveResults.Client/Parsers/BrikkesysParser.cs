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
using LiveResults.Model;
namespace LiveResults.Client
{
    
    public class BrikkesysParser : IExternalSystemResultParserEtiming
    {
        private readonly IDbConnection m_connection;
        private readonly int m_eventID;
        private readonly int m_eventRaceId;
        private readonly bool m_recreateRadioControls;
        private readonly int m_raceID;
        public event DeleteUnusedIDDelegate OnDeleteUnusedID;
        public event MergeRadioControlsDelegate OnMergeRadioControls;
        public event MergeCourseControlsDelegate OnMergeCourseControls;
        public event ResultDelegate OnResult;
        public event LogMessageDelegate OnLogMessage;
        public event DeleteIDDelegate OnDeleteID;
        private bool m_isRelay = false;
        private bool m_continue;


        public BrikkesysParser(IDbConnection conn, int raceID)
        {
            m_connection = conn;
            m_recreateRadioControls = false;
            m_isRelay = false;
            m_raceID = raceID;
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

        Thread m_monitorThread;

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

        private void Run()
        {
            while (m_continue)
            {
                try
                {
                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();
                    IDbCommand cmd = m_connection.CreateCommand();
                    string baseCommand = "SELECT N.id, N.startnr, N.name, N.ecardno, N.club, N.time, N.starttime, N.timecalculation, " +
                        "N.status, C.name AS cname, C.meter FROM names N, classes C " +
                        "WHERE C.id=N.classid AND N.raceid=" + m_raceID;

                    //FROM Name N, Class C, Team T, Cource Co
                    // WHERE N.class=C.code AND Co.code=N.cource AND T.code=N.team {0}", purmin);
                    cmd.CommandText = baseCommand;

                    FireLogMsg("Brikkesys Monitor thread started");
                    IDataReader reader = null;
                    
                    while (m_continue)
                    {
                        string lastRunner = "";
                        try
                        {
                            reader = cmd.ExecuteReader();
                            while (reader.Read())
                            {
                                int time = -2, runnerID = 0, iStartTime = 0, bib = 0, ecard = 0, length = 0;
                                string runnerName = "", club = "", classN = "";
                                string status = "", timeCalc = "";

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

                                    if (reader["starttime"] != null && reader["starttime"] != DBNull.Value)
                                    {
                                        DateTime.TryParse(reader["starttime"].ToString(), out DateTime parseStartTime);
                                        iStartTime = (int)Math.Round(parseStartTime.TimeOfDay.TotalSeconds * 100);
                                    }
                                    else // Open start
                                        iStartTime = -999;

                                    if (reader["time"] != null && reader["time"] != DBNull.Value)
                                    {
                                        DateTime.TryParse(reader["time"].ToString(), out DateTime parseTime);
                                        time = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);                                        
                                    }

                                    if (reader["status"] != null && reader["status"] != DBNull.Value)
                                        status = reader["status"] as string;

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
                                    case "I":  rstatus = 10; time = -3; break; // Entered 
                                    default:   rstatus = 0;  break;  // OK
                                    //case "F": // Finished (Fullført). For not ranked classes    rstatus = 13;
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
                                        Status = rstatus
                                    };
                                    FireOnResult(res);
                                }
                            }
                            reader.Close();
                            Thread.Sleep(3000);
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
                    {
                        m_connection.Close();
                    }
                    FireLogMsg("Disconnected");
                    FireLogMsg("Brikkesys Monitor thread stopped");

                }
            }
        }

        private static int ConvertFromDay2cs(double timeD)
        {
            int timecs;
            timecs = Convert.ToInt32(100.0 * 86400.0 * (timeD % 1));
            return timecs;
        }

        private static int GetRunTime(string runTime)
        {
            DateTime dt;
            if (!DateTime.TryParseExact(runTime, "mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
            {
                if (!DateTime.TryParseExact(runTime, "H:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                {
                    if (!DateTime.TryParseExact(runTime, "mm:ss,f", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                    {
                        if (!DateTime.TryParseExact(runTime, "H:mm:ss,f", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                        {
                            if (!DateTime.TryParseExact(runTime, "mm:ss,ff", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                            {
                                if (!DateTime.TryParseExact(runTime, "H:mm:ss,ff", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                                {
                                    if (!DateTime.TryParseExact(runTime, "HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                                    {
                                        if (runTime != "")
                                        {
                                            throw new ApplicationException("Could not parse Time" + runTime);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return (int)Math.Round(dt.TimeOfDay.TotalSeconds * 100);
        }

        public event RadioControlDelegate OnRadioControl;
    }
}
