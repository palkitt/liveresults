using System.Globalization;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Linq;

namespace LiveResults.Model
{
    public delegate void LogMessageDelegate(string msg);


    public class EmmaMysqlClient : IDisposable
    {
        public delegate void ResultChangedDelegate(Runner runner, int position);
        public event ResultChangedDelegate ResultChanged;

        void FireResultChanged(Runner r, int position)
        {
            ResultChanged?.Invoke(r, position);
        }


        private static readonly Dictionary<int,Dictionary<string,int>> m_compsSourceToIdMapping =
            new Dictionary<int, Dictionary<string, int>>();
        private static readonly Dictionary<int,int> m_compsNextGeneratedId = new Dictionary<int, int>();

        private static readonly Dictionary<int,int[]> m_runnerPreviousDaysTotalTime = new Dictionary<int, int[]>();
        
        public string organizer;
        public DateTime compDate;
        public string compName;

        public static int GetIdForSourceIdInCompetition(int compId, string sourceId)
        {
            if (!m_compsSourceToIdMapping.ContainsKey(compId))
            {
                m_compsSourceToIdMapping.Add(compId, new Dictionary<string, int>());
                m_compsNextGeneratedId.Add(compId, -1);
            }
            if (!m_compsSourceToIdMapping[compId].ContainsKey(sourceId))
            {
                int id = m_compsNextGeneratedId[compId]--;
                m_compsSourceToIdMapping[compId][sourceId] = id;
                return id;
            }
            else
            {
                return m_compsSourceToIdMapping[compId][sourceId];
            }
        }

        public struct EmmaServer
        {
            public string Host;
            public string User;
            public string Pw;
            public string DB;
        }
        public static EmmaServer[] GetServersFromConfig()
        {
            var servers = new List<EmmaServer>();
            int sNum = 1;
            while (true)
            {
                string server = ConfigurationManager.AppSettings["emmaServer" + sNum];
                if (server == null)
                    break;

                string[] parts = server.Split(';');
                var s = new EmmaServer();
                s.Host = parts[0];
                s.User = parts[1];
                s.Pw = parts[2];
                s.DB = parts[3];

                servers.Add(s);
                sNum++;

            }
            if (!string.IsNullOrEmpty(ConfigurationManager.AppSettings["serverpollurl"]))
            {
                try
                {
                    WebRequest wq = WebRequest.Create(ConfigurationManager.AppSettings["serverpollurl"]);
                    wq.Method = "POST";
                    byte[] data = Encoding.ASCII.GetBytes("key=" + ConfigurationManager.AppSettings["serverpollkey"]);
                    wq.ContentLength = data.Length;
                    wq.ContentType = "application/x-www-form-urlencoded";
                    Stream st = wq.GetRequestStream();
                    st.Write(data, 0, data.Length);
                    st.Flush();
                    st.Close();
                    WebResponse ws = wq.GetResponse();
                    Stream responseStream = ws.GetResponseStream();
                    if (responseStream != null)
                    {
                        var sr = new StreamReader(responseStream);
                        string resp = sr.ReadToEnd();
                        if (resp.Trim().Length > 0)
                        {
                            string[] lines = resp.Trim().Split('\n');
                            foreach (string line in lines)
                            {
                                string[] parts = line.Split(';');
                                var s = new EmmaServer();
                                s.Host = parts[0];
                                s.User = parts[1];
                                s.Pw = parts[2];
                                s.DB = parts[3];

                                servers.Add(s);
                            }
                        }
                    }
                }
                catch (Exception ee)
                {
                    System.Windows.Forms.MessageBox.Show("Could not connect to " + new Uri(ConfigurationManager.AppSettings["serverpollurl"]).Host + " to query connection, error was: " + ee.Message + "\r\n\r\nStacktrace: " + ee.StackTrace);
                }
            }

            return servers.ToArray();
        }

        public event LogMessageDelegate OnLogMessage;
        private MySqlConnection m_connection;
        private readonly string m_connStr;
        private int m_compID;
        public readonly Dictionary<int,Runner> m_runners;
        private readonly Dictionary<string, RadioControl[]> m_classRadioControls;
        private readonly Dictionary<int, CourseControl[]> m_courseControls;
        private readonly List<DbItem> m_itemsToUpdate;
        private readonly bool m_assignIDsInternally;
        private int m_nextInternalId = 1;

        public EmmaMysqlClient(string server, int port, string user, string pass, string database, int competitionID, bool assignIDsInternally = false)
        {
            m_runners = new Dictionary<int, Runner>();
            m_classRadioControls = new Dictionary<string, RadioControl[]>();
            m_courseControls = new Dictionary<int, CourseControl[]>();
            m_itemsToUpdate = new List<DbItem>();
            m_assignIDsInternally = assignIDsInternally;

            m_connStr = "Database=" + database + ";Data Source="+server+";User Id="+user+";Password="+pass;
            m_connection = new MySqlConnection(m_connStr);
            m_compID = competitionID;
        }


        public void SetCompetitionId(int compId)
        {
            m_compID = compId;
        }


        private void ResetUpdated()
        {
            foreach (Runner r in m_runners.Values)
            {
                r.RunnerUpdated = false;
                r.ResultUpdated = false;
                r.StartTimeUpdated = false;
                r.ResetUpdatedSplits();
            }
        }


        public RadioControl[] GetAllRadioControls()
        {
            Dictionary<int, RadioControl> radios = new Dictionary<int, RadioControl>();
            foreach (var kvp in m_classRadioControls)
            {
                foreach (var radioControl in kvp.Value)
                {
                    if (!radios.ContainsKey(radioControl.Code))
                    {
                        radios.Add(radioControl.Code, radioControl);
                    }
                }

            }
            return radios.Values.ToArray();
        }

        public RadioControl[] GetRadioControlsForClass(string className)
        {
            return m_classRadioControls.ContainsKey(className) ? m_classRadioControls[className] : null;

        }


        private void FireLogMsg(string msg)
        {
            if (OnLogMessage != null)
                OnLogMessage(msg);
        }

          
        public Runner GetRunner(int dbId)
        {
            if (!IsRunnerAdded(dbId))
                return null;
            return m_runners[dbId];
        }


        public string[] GetClasses()
        {
            Dictionary<string,string> classes = new Dictionary<string, string>();
            foreach (var r in m_runners)
            {
                if (!classes.ContainsKey(r.Value.Class))
                    classes.Add(r.Value.Class,"");
            }
            return classes.Keys.ToArray();
        }

        public Runner[] GetAllRunners()
        {
            return m_runners.Values.ToArray();
        }

        public Runner[] GetRunnersInClass(string className)
        {
            return m_runners.Values.Where(x => x.Class == className).ToArray();
        }


        private bool m_continue;
        private bool m_currentlyBuffering;
        private Thread m_mainTh;

        
        public void Start()
        {
            FireLogMsg("Buffering existing results..");
            int numRunners = 0;
            int numResults = 0;
            try
            {
                m_currentlyBuffering = true;
                m_connection.Open();

                SetCodePage(m_connection);

                MySqlCommand cmd = m_connection.CreateCommand();

                if (!m_compsSourceToIdMapping.ContainsKey(m_compID))
                {
                    m_compsSourceToIdMapping.Add(m_compID, new Dictionary<string, int>());
                    m_compsNextGeneratedId.Add(m_compID, -1);
                }


                // Comp info
                cmd.CommandText = "select organizer, compDate, compName from login where tavid = " + m_compID;
                MySqlDataReader reader = cmd.ExecuteReader();
                reader.Read();

                organizer = reader[("organizer")] as string;
                compName = reader[("compName")] as string;
                compDate = Convert.ToDateTime(reader[("compDate")]);
                reader.Close();


                // Radio controls
                cmd.CommandText = "select classname,corder,code,name from splitcontrols where tavid = " + m_compID;
                reader = cmd.ExecuteReader();
                Dictionary<string, List<RadioControl>> tmpRadios = new Dictionary<string, List<RadioControl>>();
                while (reader.Read())
                {
                    string className = reader["classname"] as string;
                    int corder = Convert.ToInt32(reader["corder"]);
                    int code = Convert.ToInt32(reader["code"]);
                    string name = reader["name"] as string;

                    if (!tmpRadios.ContainsKey(className))
                        tmpRadios.Add(className, new List<RadioControl>());

                    tmpRadios[className].Add(new RadioControl() { ClassName = className, Code = code, ControlName = name, Order = corder });
                }
                reader.Close();
                foreach (var kvp in tmpRadios)
                {
                    m_classRadioControls.Add(kvp.Key, kvp.Value.ToArray());
                }


                // Course controls
                cmd.CommandText = "select courseno,corder,code from courses where tavid = " + m_compID;
                reader = cmd.ExecuteReader();
                Dictionary<int, List<CourseControl>> tmpControls = new Dictionary<int, List<CourseControl>>();
                while (reader.Read())
                {
                    int courseNo = Convert.ToInt32(reader["courseno"]);
                    int corder = Convert.ToInt32(reader["corder"]);
                    int code = Convert.ToInt32(reader["code"]);

                    if (!tmpControls.ContainsKey(courseNo))
                        tmpControls.Add(courseNo, new List<CourseControl>());

                    tmpControls[courseNo].Add(new CourseControl() { CourseNo = courseNo, Code = code, Order = corder });
                }
                reader.Close();
                foreach (var kvp in tmpControls)
                {
                    m_courseControls.Add(kvp.Key, kvp.Value.ToArray());
                }


                // Runner aliases
                cmd.CommandText = "select sourceid,id from runneraliases where compid = " + m_compID;
                reader = cmd.ExecuteReader();

                Dictionary<int,string> idToAliasDictionary = new Dictionary<int, string>();

                while (reader.Read())
                {
                    var sourceId = reader["sourceid"] as string;
                    if (sourceId == null)
                        continue;
                    int id = Convert.ToInt32(reader["id"]);
                    if (!m_compsSourceToIdMapping[m_compID].ContainsKey(sourceId))
                    {
                        m_compsSourceToIdMapping[m_compID].Add(sourceId, id);
                        if (id <= m_compsNextGeneratedId[m_compID])
                            m_compsNextGeneratedId[m_compID] = id - 1;
                    }
                }
                reader.Close();

                foreach (var kvp in m_compsSourceToIdMapping[m_compID])
                {
                    if (!idToAliasDictionary.ContainsKey(kvp.Value))
                        idToAliasDictionary.Add(kvp.Value, kvp.Key);
                }                                

                // Runners
                cmd.CommandText = "select runners.dbid,control,time,name,course,length,club,class,ecard1,ecard2,bib,status,ecardtimes from runners, results" +
                    " where results.dbid = runners.dbid and results.tavid = " + m_compID + " and runners.tavid = " + m_compID;
                reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var course = 0;
                    var length = 0;
                    var ecardTimes = "";
                    var dbid = Convert.ToInt32(reader["dbid"]);
                    var control = Convert.ToInt32(reader["control"]);
                    var time = Convert.ToInt32(reader["time"]);
                    var ecard1 = Convert.ToInt32(reader["ecard1"]);
                    var ecard2 = Convert.ToInt32(reader["ecard2"]);
                    var bib = Convert.ToInt32(reader["bib"]);
                    if (reader["course"] != null && reader["course"] != DBNull.Value)
                        course = Convert.ToInt32(reader["course"].ToString());
                    if (reader["length"] != null && reader["length"] != DBNull.Value)
                        length = Convert.ToInt32(reader["length"].ToString());
                    if (reader["ecardtimes"] != null && reader["ecardtimes"] != DBNull.Value)
                        ecardTimes = reader["ecardtimes"].ToString();

                    var sourceId = idToAliasDictionary.ContainsKey(dbid) ? idToAliasDictionary[dbid] : null;
                    if (!IsRunnerAdded(dbid))
                    {
                        var r = new Runner(dbid, reader["name"] as string, reader["club"] as string, reader["class"] as string, ecard1, ecard2, bib, sourceId,
                            course, length, ecardTimes);
                        AddRunner(r);
                        numRunners++;
                    }
                    switch (control)
                    {
                        case 1000:
                            SetRunnerResult(dbid, time, Convert.ToInt32(reader["status"]));
                            numResults++;
                            break;
                        case 100:
                            SetRunnerStartTime(dbid, time);
                            numResults++;
                            break;
                        default:
                            numResults++;
                            SetRunnerSplit(dbid, control, time);
                            break;
                    }

                }
                reader.Close();
                cmd.Dispose();

                ResetUpdated();
            }
            catch (Exception ee)
            {
                FireLogMsg(ee.Message);
                Thread.Sleep(1000);
            }
            finally
            {
                m_connection.Close();
                m_itemsToUpdate.Clear();
                m_currentlyBuffering = false;
                FireLogMsg("Done - Buffered " + m_runners.Count + " existing runners and " + numResults +" existing results from server");
            }

            m_continue = true;
            m_mainTh = new Thread(Run);
            m_mainTh.Name = "Main MYSQL Thread [" + m_connection.DataSource + "]";
            m_mainTh.Start();

            if (m_assignIDsInternally)
            {
                m_nextInternalId = m_runners.Count > 0 ? m_runners.Keys.Max() + 1 : 1;
            }
        }

        public void UpdateRunnerInfo(int id, string name, string club, string Class, int ecard1, int ecard2, int bib, string sourceId, int course = 0, int length = 0, string ecardTimes = "")
        {
            if (m_runners.ContainsKey(id))
            {
                var cur = m_runners[id];
                if (cur == null)
                    return;

                bool isUpdated = false;
                if (cur.Name != name)
                {
                    cur.Name = name;
                    isUpdated = true;
                }
                if (cur.Class != Class)
                {
                    cur.Class = Class;
                    isUpdated = true;
                }
                if (cur.Club != club)
                {
                    cur.Club = club;
                    isUpdated = true;
                }
                if (cur.Course != course)
                {
                    cur.Course = course;
                    isUpdated = true;
                }
                if (cur.Length != length)
                {
                    cur.Length = length;
                    isUpdated = true;
                }
                if (cur.Ecard1 != ecard1)
                {
                    cur.Ecard1 = ecard1;
                    isUpdated = true;
                }
                if (cur.Ecard2 != ecard2)
                {
                    cur.Ecard2 = ecard2;
                    isUpdated = true;
                }
                if (cur.Bib != bib)
                {
                    cur.Bib = bib;
                    isUpdated = true;
                }
                if (string.IsNullOrEmpty(sourceId))
                    sourceId = null;
                if (string.IsNullOrEmpty(cur.SourceId))
                    cur.SourceId = null;
                if (cur.SourceId != sourceId && sourceId != id.ToString(CultureInfo.InvariantCulture))
                {
                    cur.SourceId = sourceId;
                    isUpdated = true;
                }
                if (cur.EcardTimes != ecardTimes)
                {
                    cur.EcardTimes = ecardTimes;
                    isUpdated = true;
                }

                if (isUpdated)
                {
                    cur.RunnerUpdated = true;
                    m_itemsToUpdate.Add(cur);

                    if (!m_currentlyBuffering)
                    {
                        FireLogMsg("Local update runner data: " + (Math.Abs(cur.Bib) > 0 ? "(" + Math.Abs(cur.Bib) + ") " : "") + cur.Name);
                    }
                }
            }
        }

        /// <summary>
        /// Adds a Runner to this competition
        /// </summary>
        /// <param name="r"></param>
        public void AddRunner(Runner r)
        {
            if (!m_runners.ContainsKey(r.ID))
            {
                m_runners.Add(r.ID, r);
                m_itemsToUpdate.Add(r);
                if (!m_currentlyBuffering)
                {
                    FireLogMsg("Local update add: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name);
                }
            }
        }

        /// <summary>
        /// Adds a Runner to this competition
        /// </summary>
        /// <param name="r"></param>

        public void DeleteID(int runnerID)
        {
            if (m_runners.ContainsKey(runnerID))
                RemoveRunner(m_runners[runnerID]);
        }


        public void RemoveRunner(Runner r)
        {
            if (m_runners.ContainsKey(r.ID))
            {
                m_runners.Remove(r.ID);
                m_itemsToUpdate.Add(new DelRunner { RunnerID = r.ID });
                if (!m_currentlyBuffering)
                {
                    FireLogMsg("Local update delete: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name + ", " + r.Class);
                }
            }
        }

        public void SetRadioControl(string className, int code, string controlName, int order)
        {
            if (!m_classRadioControls.ContainsKey(className))
                m_classRadioControls.Add(className, new RadioControl[0]);

            var radios = new List<RadioControl>();
            radios.AddRange(m_classRadioControls[className]);
            radios.Add(new RadioControl { ClassName = className, Code = code, ControlName = controlName, Order = order });
            m_classRadioControls[className] = radios.ToArray();
            m_itemsToUpdate.Add(new RadioControl
            {
                ClassName = className,
                Code = code,
                ControlName = controlName,
                Order = order
            });
        }

        public int UpdatesPending
        {
            get
            {
                return m_itemsToUpdate.Count;
            }
        }

        /// <summary>
        /// Returns true if a runner with the specified runnerid exist in the competition
        /// </summary>
        /// <param name="runnerID"></param>
        /// <returns></returns>
        public bool IsRunnerAdded(int runnerID)
        {
            return m_runners.ContainsKey(runnerID);
        }

        /// <summary>
        /// Sets the result for the runner with runnerID
        /// </summary>
        /// <param name="runnerID"></param>
        /// <param name="time"></param>
        /// <param name="status"></param>
        public void SetRunnerResult(int runnerID, int time, int status)
        {
            if (!IsRunnerAdded(runnerID))
                throw new ApplicationException("Runner is not added! {" + runnerID + "} [SetRunnerResult]");

            var r = m_runners[runnerID];

            if (r.HasResultChanged(time, status))
            {
                r.SetResult(time, status);
                m_itemsToUpdate.Add(r);
                if (!m_currentlyBuffering)
                {
                    FireResultChanged(r, 1000);
                    FireLogMsg("Local update result: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name + ", " + formatTime(r.Time,r.Status));
                }
            }
        }

        public void SetRunnerSplit(int runnerID, int controlcode, int time)
        {
            if (!IsRunnerAdded(runnerID))
                throw new ApplicationException("Runner is not added! {" + runnerID + "} [SetRunnerResult]");
            var r = m_runners[runnerID];

            if (r.HasSplitChanged(controlcode, time))
            {
                r.SetSplitTime(controlcode, time);
                m_itemsToUpdate.Add(r);
                if (!m_currentlyBuffering)
                {
                    FireResultChanged(r, controlcode);
                    FireLogMsg("Local update split: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name + ", c" + controlcode + ", " + formatTime(time,0));
                }
            }
        }
        

        public void SetRunnerStartTime(int runnerID, int starttime)
        {
            if (!IsRunnerAdded(runnerID))
                throw new ApplicationException("Runner is not added! {" + runnerID + "} [SetRunnerStartTime]");
            var r = m_runners[runnerID];
            
            if (r.HasStartTimeChanged(starttime))
            {
                r.SetStartTime(starttime);
                m_itemsToUpdate.Add(r);
                if (!m_currentlyBuffering)
                {
                    FireLogMsg("Local update start: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name + ", " + formatTime(starttime,0,true));
                }
            }
        }

        public void DeleteUnusedSplits(int runnerID, List<int> controlCodes)
        {
            if (m_runners.ContainsKey(runnerID))
            {
                var r = m_runners[runnerID];
                foreach (SplitTime splitTime in r.SplitTimes)
                {
                    if (!controlCodes.Contains(splitTime.Control))
                    {
                        m_itemsToUpdate.Add(new DelSplitTime() {
                            RunnerID = runnerID,
                            ControlCode = splitTime.Control
                        });
                        r.DeleteSplitTime(splitTime.Control);
                        FireLogMsg("Local update split delete: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name + ", c" + splitTime.Control);
                    }
                }
            }
        }

        public void MergeCourseControls(CourseControl[] courses, bool deleteUnused)
        {
            if (courses == null)
                return;

            foreach (var kvp in courses.GroupBy(x => x.CourseNo))
            {
                CourseControl[] controls = kvp.OrderBy(x => x.Order).ToArray();
                if (m_courseControls.ContainsKey(kvp.Key))
                {
                    CourseControl[] existingControls = m_courseControls[kvp.Key];
                    for (int i = 0; i < controls.Length; i++)
                    {
                        if (existingControls.Length > i)
                        {
                            if (existingControls[i].Order != controls[i].Order || existingControls[i].Code != controls[i].Code)
                            {
                                m_itemsToUpdate.Add(new DelCourseControl() { ToDelete = existingControls[i] });
                                m_itemsToUpdate.Add(controls[i]);
                            }
                        }
                        else
                        {
                            m_itemsToUpdate.Add(controls[i]);
                        }
                    }
                    if (existingControls.Length > controls.Length)
                    {
                        for (int i = controls.Length; i < existingControls.Length; i++)
                        {
                            m_itemsToUpdate.Add(new DelCourseControl() { ToDelete = existingControls[i] });
                        }
                    }
                    m_courseControls[kvp.Key] = controls;

                }
                else
                {
                    foreach (var control in controls)
                    {
                        m_itemsToUpdate.Add(control);
                    }
                    m_courseControls.Add(kvp.Key, controls);
                }
            }

            // Delete all controls for course that are not in the array
            if (deleteUnused)
            {
                var courseNo = courses.GroupBy(x => x.CourseNo).ToDictionary(x => x.Key);
                foreach (var controls in m_courseControls)
                {
                    if (!courseNo.ContainsKey(controls.Key))
                    {
                        CourseControl[] existingControls = m_courseControls[controls.Key];
                        for (int i = 0; i < existingControls.Length; i++)
                        {
                            m_itemsToUpdate.Add(new DelCourseControl() { ToDelete = existingControls[i] });
                        }
                    }
                }
            }
        }              
               
  
        public void MergeRadioControls(RadioControl[] radios)
        {
            if (radios == null)
                return;

            foreach (var kvp in radios.GroupBy(x => x.ClassName))
            {
                RadioControl[] controls = kvp.OrderBy(x => x.Order).ToArray();
                if (m_classRadioControls.ContainsKey(kvp.Key))
                {
                    RadioControl[] existingRadios = m_classRadioControls[kvp.Key];
                    for (int i = 0; i < controls.Length; i++)
                    {
                        if (existingRadios.Length > i)
                        {
                            if (existingRadios[i].Order != controls[i].Order
                                || existingRadios[i].Code != controls[i].Code
                                || existingRadios[i].ControlName != controls[i].ControlName)
                            {
                                m_itemsToUpdate.Add(new DelRadioControl() { ToDelete = existingRadios[i] });
                                m_itemsToUpdate.Add(controls[i]);
                            }
                        }
                        else
                        {
                            m_itemsToUpdate.Add(controls[i]);
                        }
                    }
                    if (existingRadios.Length > controls.Length)
                    {
                        for (int i = controls.Length; i < existingRadios.Length; i++)
                        {
                            m_itemsToUpdate.Add(new DelRadioControl() { ToDelete = existingRadios[i] });
                        }
                    }
                    m_classRadioControls[kvp.Key] = controls;

                }
                else
                {
                    foreach (var control in controls)
                    {
                        m_itemsToUpdate.Add(control);
                    }
                    m_classRadioControls.Add(kvp.Key, controls);
                }
            }

            // Delete all radio controls for classes that are not in the radios array
            var radiosClassName = radios.GroupBy(x => x.ClassName).ToDictionary(x => x.Key);
            foreach (var classRadios in m_classRadioControls)
            {
                if (!radiosClassName.ContainsKey(classRadios.Key))
                {
                    RadioControl[] existingRadios = m_classRadioControls[classRadios.Key];
                    for (int i = 0; i < existingRadios.Length; i++)
                    {
                        m_itemsToUpdate.Add(new DelRadioControl() { ToDelete = existingRadios[i] });
                    }
                }
            }
        }

        public void MergeRunners(Runner[] runners)
        {
            if (runners == null)
                return;

            foreach (var r in runners)
            {
                if (!IsRunnerAdded(r.ID))
                {
                    AddRunner(new Runner(r.ID, r.Name, r.Club, r.Class, r.Ecard1, r.Ecard2, r.Bib, r.SourceId, r.Course, r.Length, r.EcardTimes));
                }
                else
                {
                    UpdateRunnerInfo(r.ID, r.Name, r.Club, r.Class, r.Ecard1, r.Ecard2, r.Bib, r.SourceId, r.Course, r.Length, r.EcardTimes);
                }
                UpdateRunnerTimes(r);
            }
        }

        public void UpdateCurrentResultsFromNewSet(Runner[] runners)
        {
            if (runners == null)
                return;

            var existingClassGroups = m_runners.Values.GroupBy(x => x.Class, StringComparer.OrdinalIgnoreCase).ToDictionary(x => x.Key, x => x.ToArray(), StringComparer.OrdinalIgnoreCase);
            foreach (var classGroup in runners.GroupBy(x => x.Class))
            {
                if (existingClassGroups.ContainsKey(classGroup.Key))
                {
                    var existingClass = existingClassGroups[classGroup.Key];
                    var duplicateCounter = new Dictionary<string, int>();
                    foreach (var runner in classGroup)
                    {
                        string duplValue = (runner.Name + ":" + runner.Club).ToLower();
                        if (!duplicateCounter.ContainsKey(duplValue))
                        {
                            duplicateCounter.Add(duplValue, 0);
                        }
                        duplicateCounter[duplValue]++;
                        int findInstance = duplicateCounter[duplValue];

                        /*Find existing*/
                        Runner currentRunner = null;
                        int instNum = 0;
                        foreach (var existingRunner in existingClass)
                        {

                            if (string.Compare(existingRunner.Name,runner.Name, StringComparison.InvariantCultureIgnoreCase) == 0 &&
                                string.Compare(existingRunner.Club,runner.Club, StringComparison.InvariantCultureIgnoreCase) == 0)
                            {
                                instNum++;
                                if (instNum == findInstance)
                                {
                                    currentRunner = existingRunner;
                                    break;
                                }
                            }
                        }
                        if (currentRunner != null)
                        {
                            runner.ID = currentRunner.ID;
                            UpdateRunnerInfo(runner.ID, runner.Name, runner.Club, runner.Class,  runner.Ecard1, runner.Ecard2, runner.Bib, runner.SourceId, runner.Course, runner.Length, runner.EcardTimes);
                        }
                        else
                        {
                            //New runner
                            runner.ID = m_nextInternalId++;
                            var newRunner = new Runner(runner.ID, runner.Name, runner.Club, runner.Class,  runner.Ecard1, runner.Ecard2, runner.Bib, runner.SourceId, runner.Course, runner.Length, runner.EcardTimes);
                            AddRunner(newRunner);
                        }
                        UpdateRunnerTimes(runner);
                    }
                }
                else
                {
                    //new class, add all
                    foreach (var runner in classGroup)
                    {
                        runner.ID = m_nextInternalId++;
                        var newRunner = new Runner(runner.ID,runner.Name, runner.Club, runner.Class, runner.Ecard1, runner.Ecard2, runner.Bib, runner.SourceId, runner.Course, runner.Length, runner.EcardTimes);
                        AddRunner(newRunner);
                        UpdateRunnerTimes(runner);
                    }
                }
            }
        }
              

        public void DeleteUnusedRunners(List<int> usedIds)
        {
            if (usedIds == null)
                return;

            var dbRunners = m_runners.Values;
            foreach (var dbRunner in dbRunners.ToList())
            {
                if (!usedIds.Contains(dbRunner.ID))
                    RemoveRunner(dbRunner);
            }
        }

        private void UpdateRunnerTimes(Runner runner)
        {
            if (runner.StartTime == -999 || runner.StartTime >= 0)
                SetRunnerStartTime(runner.ID, runner.StartTime);

            SetRunnerResult(runner.ID, runner.Time, runner.Status);

            var spl = runner.SplitTimes;
            if (spl != null)
            {
                foreach (var s in spl)
                {
                    SetRunnerSplit(runner.ID, s.Control, s.Time);
                }
            }
        }

        public void Stop()
        {
            m_continue = false;
        }

        private void Run()
        {
            bool runOffline = ConfigurationManager.AppSettings["runoffline"] == "true";
            while (m_continue)
            {
                try
                {
                    if (!runOffline)
                    {
                        m_connection = new MySqlConnection(m_connStr);
                        m_connection.Open();
                        SetCodePage(m_connection);
                    }
                    while (m_continue)
                    {
                        if (m_itemsToUpdate.Count > 0)
                        {
                            if (runOffline)
                            {
                                m_itemsToUpdate.RemoveAt(0);
                                continue;
                            }

                            using (MySqlCommand cmd = m_connection.CreateCommand())
                            {
                                var item = m_itemsToUpdate[0];
                                if (item is CourseControl)
                                {
                                    var r = item as CourseControl;
                                    cmd.Parameters.Clear();
                                    cmd.Parameters.AddWithValue("?compid", m_compID);
                                    cmd.Parameters.AddWithValue("?courseno", r.CourseNo);
                                    cmd.Parameters.AddWithValue("?corder", r.Order);
                                    cmd.Parameters.AddWithValue("?code", r.Code);
                                    cmd.CommandText = "REPLACE INTO courses(tavid,courseno,corder,code) VALUES (?compid,?courseno,?corder,?code)";

                                    try
                                    {
                                        cmd.ExecuteNonQuery();
                                    }
                                    catch (Exception ee)
                                    {
                                        m_itemsToUpdate.Add(r);
                                        m_itemsToUpdate.RemoveAt(0);
                                        throw new ApplicationException("Could not add course control " + r.Order + "." + r.Code + " in course no" + r.CourseNo + " to server due to: " + ee.Message, ee);
                                    }
                                    cmd.Parameters.Clear();
                                    FireLogMsg("Server update add: Course control " + r.Order + "." + r.Code + " in course no " + r.CourseNo);
                                }
                                else if (item is DelCourseControl)
                                {
                                    var dr = item as DelCourseControl;
                                    var r = dr.ToDelete;
                                    cmd.Parameters.Clear();
                                    cmd.Parameters.AddWithValue("?compid", m_compID);
                                    cmd.Parameters.AddWithValue("?courseno", r.CourseNo);
                                    cmd.Parameters.AddWithValue("?corder", r.Order);
                                    cmd.Parameters.AddWithValue("?code", r.Code);
                                    cmd.CommandText = "delete from courses where tavid= ?compid and courseno = ?courseno and corder = ?corder and code = ?code";

                                    try
                                    {
                                        cmd.ExecuteNonQuery();
                                    }
                                    catch (Exception ee)
                                    {
                                        m_itemsToUpdate.Add(r);
                                        m_itemsToUpdate.RemoveAt(0);
                                        throw new ApplicationException("Could not delete course control " + r.Order + "." + r.Code + " in course no" + r.CourseNo + " to server due to: " + ee.Message, ee);
                                    }
                                    cmd.Parameters.Clear();
                                    FireLogMsg("Server update delete: Course control " + r.Order + "." + r.Code + " in course no " + r.CourseNo);
                                }
                                if (item is RadioControl)
                                {
                                    var r = item as RadioControl;
                                    cmd.Parameters.Clear();
                                    cmd.Parameters.AddWithValue("?compid", m_compID);
                                    cmd.Parameters.AddWithValue("?name", Encoding.UTF8.GetBytes(r.ClassName));
                                    cmd.Parameters.AddWithValue("?corder", r.Order);
                                    cmd.Parameters.AddWithValue("?code", r.Code);
                                    cmd.Parameters.AddWithValue("?cname", Encoding.UTF8.GetBytes(r.ControlName));
                                    cmd.CommandText = "REPLACE INTO splitcontrols(tavid,classname,corder,code,name) VALUES (?compid,?name,?corder,?code,?cname)";

                                    try
                                    {
                                        cmd.ExecuteNonQuery();
                                    }
                                    catch (Exception ee)
                                    {
                                        //Move failing runner last
                                        m_itemsToUpdate.Add(r);
                                        m_itemsToUpdate.RemoveAt(0);
                                        throw new ApplicationException("Could not add radio control " + r.ControlName + ", " + r.ClassName + ", " + r.Code + " to server due to: " + ee.Message, ee);
                                    }
                                    cmd.Parameters.Clear();
                                    FireLogMsg("Server update add: Radio control " + r.ControlName + ", " + r.ClassName + ", " + r.Code);
                                }
                                else if (item is DelRadioControl)
                                {
                                    var dr = item as DelRadioControl;
                                    var r = dr.ToDelete;
                                    cmd.Parameters.Clear();
                                    cmd.Parameters.AddWithValue("?compid", m_compID);
                                    cmd.Parameters.AddWithValue("?name", Encoding.UTF8.GetBytes(r.ClassName));
                                    cmd.Parameters.AddWithValue("?corder", r.Order);
                                    cmd.Parameters.AddWithValue("?code", r.Code);
                                    cmd.Parameters.AddWithValue("?cname", Encoding.UTF8.GetBytes(r.ControlName));
                                    cmd.CommandText = "delete from splitcontrols where tavid= ?compid and classname = ?name and corder = ?corder and code = ?code and name = ?cname";

                                    try
                                    {
                                        cmd.ExecuteNonQuery();
                                    }
                                    catch (Exception ee)
                                    {
                                        //Move failing radio control
                                        m_itemsToUpdate.Add(r);
                                        m_itemsToUpdate.RemoveAt(0);
                                        throw new ApplicationException("Could not delete radio control " + r.ControlName + ", " + r.ClassName + ", " + r.Code + " to server due to: " + ee.Message, ee);
                                    }
                                    cmd.Parameters.Clear();
                                    FireLogMsg("Server update delete: Radio control " + r.ControlName + ", " + r.ClassName + ", " + r.Code);
                                }
                                else if (item is DelRunner)
                                {
                                    var dr = item as DelRunner;
                                    var r = dr.RunnerID;
                                    cmd.Parameters.Clear();
                                    cmd.Parameters.AddWithValue("?compid", m_compID);
                                    cmd.Parameters.AddWithValue("?id", r);
                                    cmd.CommandText = "delete from results where tavid= ?compid and dbid = ?id";
                                    try
                                    {
                                        cmd.ExecuteNonQuery();
                                        cmd.CommandText = "delete from runners where tavid= ?compid and dbid = ?id";
                                        cmd.ExecuteNonQuery();
                                        cmd.CommandText = "delete from runneraliases where compid= ?compid and id = ?id";
                                        cmd.ExecuteNonQuery();
                                    }
                                    catch (Exception ee)
                                    {
                                        //Move failing item last
                                        m_itemsToUpdate.Add(dr);
                                        m_itemsToUpdate.RemoveAt(0);
                                        throw new ApplicationException("Could not delete runner " + r + " on server due to: " + ee.Message, ee);
                                    }
                                    cmd.Parameters.Clear();
                                    FireLogMsg("Server update delete: Runner ID " + r );
                                }
                                else if (item is DelSplitTime)
                                {
                                    var ds = item as DelSplitTime;
                                    var r = ds.RunnerID;
                                    var control = ds.ControlCode;
                                    cmd.Parameters.Clear();
                                    cmd.Parameters.AddWithValue("?compid", m_compID);
                                    cmd.Parameters.AddWithValue("?id", r);
                                    cmd.Parameters.AddWithValue("?control", control);
                                    cmd.CommandText = "delete from results where tavid= ?compid and dbid= ?id and control= ?control";
                                    try
                                    {
                                        cmd.ExecuteNonQuery();
                                    }
                                    catch (Exception ee)
                                    {
                                        //Move failing item last
                                        m_itemsToUpdate.Add(ds);
                                        m_itemsToUpdate.RemoveAt(0);
                                        throw new ApplicationException("Could not delete split from runner " + r + " on server due to: " + ee.Message, ee);
                                    }
                                    cmd.Parameters.Clear();
                                    FireLogMsg("Server update delete: Split " + control + " for runner ID " + r );
                                }
                                else if (item is Runner)
                                {
                                    var r = item as Runner;
                                    if (r.RunnerUpdated)
                                    {
                                        cmd.Parameters.Clear();
                                        cmd.Parameters.AddWithValue("?compid", m_compID);
                                        cmd.Parameters.AddWithValue("?name", Encoding.UTF8.GetBytes(r.Name));
                                        cmd.Parameters.AddWithValue("?club", Encoding.UTF8.GetBytes(r.Club ?? ""));
                                        cmd.Parameters.AddWithValue("?class", Encoding.UTF8.GetBytes(r.Class));
                                        cmd.Parameters.AddWithValue("?course", r.Course);
                                        cmd.Parameters.AddWithValue("?length", r.Length);
                                        cmd.Parameters.AddWithValue("?ecard1", r.Ecard1);
                                        cmd.Parameters.AddWithValue("?ecard2", r.Ecard2);
                                        cmd.Parameters.AddWithValue("?bib", r.Bib);
                                        cmd.Parameters.AddWithValue("?id", r.ID);
                                        cmd.Parameters.AddWithValue("?ecardtimes", r.EcardTimes);

                                        cmd.CommandText = "INSERT INTO runners (tavid,name,club,class,course,length,brick,dbid,ecard1,ecard2,bib,ecardtimes,ecardchecked) " +
                                            "VALUES (?compid,?name,?club,?class,?course,?length,0,?id,?ecard1,?ecard2,?bib,?ecardtimes,0) " +
                                            "ON DUPLICATE KEY UPDATE name=?name,club=?club,class=?class,course=?course,length=?length,"+
                                            "ecard1=?ecard1,ecard2=?ecard2,bib=?bib,ecardtimes=?ecardtimes,ecardchecked=ecardchecked";

                                        try
                                        {
                                            cmd.ExecuteNonQuery();
                                        }
                                        catch (Exception ee)
                                        {
                                            // Move failing runner last
                                            m_itemsToUpdate.Add(r);
                                            m_itemsToUpdate.RemoveAt(0);
                                            throw new ApplicationException(
                                                "Could not update runner " + r.Name + ", " + r.Club + ", " + r.Class + " to server due to: " + ee.Message, ee);
                                        }
                                        cmd.Parameters.Clear();

                                        if (!string.IsNullOrEmpty(r.SourceId) && r.SourceId != r.ID.ToString(CultureInfo.InvariantCulture))
                                        {
                                            cmd.CommandText = "REPLACE INTO runneraliases (compid,sourceid,id) VALUES (?compid,?sourceId,?id)";
                                            cmd.Parameters.AddWithValue("?compid", m_compID);
                                            cmd.Parameters.AddWithValue("?sourceId", r.SourceId);
                                            cmd.Parameters.AddWithValue("?id", r.ID);
                                            try
                                            {
                                                cmd.ExecuteNonQuery();
                                            }
                                            catch (Exception ee)
                                            {
                                                FireLogMsg("Could not add alias for runner " + r.Name + " in DB [" + ee.Message + "]");
                                            }
                                        }
                                        cmd.Parameters.Clear();
                                        FireLogMsg("Server update runner data: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name);
                                        r.RunnerUpdated = false;
                                    }
                                    if (r.ResultUpdated)
                                    {
                                        cmd.Parameters.Clear();
                                        cmd.Parameters.AddWithValue("?compid", m_compID);
                                        cmd.Parameters.AddWithValue("?id", r.ID);
                                        cmd.Parameters.AddWithValue("?time", r.Time);
                                        cmd.Parameters.AddWithValue("?status", r.Status);
                                        cmd.CommandText = "REPLACE INTO results (tavid,dbid,control,time,status,changed) VALUES(?compid,?id,1000,?time,?status,Now())";
                                        try
                                        {
                                            cmd.ExecuteNonQuery();
                                        }
                                        catch (Exception ee)
                                        {
                                            // Move failing runner last
                                            m_itemsToUpdate.Add(r);
                                            m_itemsToUpdate.RemoveAt(0);
                                            throw new ApplicationException(
                                                "Could not update result for runner " + r.Name + ", " + r.Club + ", " + r.Class + " to server due to: " + ee.Message, ee);
                                        }
                                        cmd.Parameters.Clear();
                                        FireLogMsg("Server update result: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name);
                                        r.ResultUpdated = false;
                                    }
                                    if (r.StartTimeUpdated)
                                    {
                                        cmd.Parameters.Clear();
                                        cmd.Parameters.AddWithValue("?compid", m_compID);
                                        cmd.Parameters.AddWithValue("?id", r.ID);
                                        cmd.Parameters.AddWithValue("?starttime", r.StartTime);
                                        cmd.Parameters.AddWithValue("?status", r.Status);
                                        cmd.CommandText = "REPLACE INTO results (tavid,dbid,control,time,status,changed) VALUES(?compid,?id,100,?starttime,?status,Now())";
                                        try
                                        {
                                            cmd.ExecuteNonQuery();
                                        }
                                        catch (Exception ee)
                                        {
                                            // Move failing runner last
                                            m_itemsToUpdate.Add(r);
                                            m_itemsToUpdate.RemoveAt(0);
                                            throw new ApplicationException(
                                                "Could not update starttime for runner " + r.Name + ", " + r.Club + ", " + r.Class + " to server due to: " + ee.Message, ee);
                                        }
                                        cmd.Parameters.Clear();
                                        FireLogMsg("Server update start: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name);
                                        r.StartTimeUpdated = false;
                                    }
                                    if (r.HasUpdatedSplitTimes())
                                    {
                                        List<SplitTime> splitTimes = r.GetUpdatedSplitTimes();

                                        cmd.Parameters.Clear();
                                        cmd.Parameters.AddWithValue("?compid", m_compID);
                                        cmd.Parameters.AddWithValue("?id", r.ID);
                                        cmd.Parameters.AddWithValue("?control", -1);
                                        cmd.Parameters.AddWithValue("?time", -1);
                                        foreach (SplitTime t in splitTimes)
                                        {
                                            cmd.Parameters["?control"].Value = t.Control;
                                            cmd.Parameters["?time"].Value = t.Time;
                                            cmd.CommandText = "REPLACE INTO results (tavid,dbid,control,time,status,changed) VALUES(" + m_compID + "," + r.ID + "," + t.Control + "," + t.Time +
                                                              ",0,Now())";
                                            try
                                            {
                                                cmd.ExecuteNonQuery();
                                            }
                                            catch (Exception ee)
                                            {
                                                // Move failing r last
                                                m_itemsToUpdate.Add(r);
                                                m_itemsToUpdate.RemoveAt(0);
                                                throw new ApplicationException(
                                                    "Could not update split time for runner " + r.Name + " splittime{" + t.Control + "} to server due to: " + ee.Message, ee);
                                            }
                                            FireLogMsg("Server update split: " + (Math.Abs(r.Bib) > 0 ? "(" + Math.Abs(r.Bib) + ") " : "") + r.Name + ", c" + t.Control);
                                            t.Updated = false;
                                        }
                                        cmd.Parameters.Clear();
                                    }
                                }
                                m_itemsToUpdate.RemoveAt(0);
                            }
                        }
                        else
                        {
                            Thread.Sleep(100);
                        }
                    }

                }
                catch (Exception ee)
                {
                    FireLogMsg("Error: " + ee.Message + (m_connection != null ? " [" + m_connection.DataSource + "]" : ""));
                    System.Diagnostics.Debug.Write(ee.Message);
                    Thread.Sleep(1000);
                }
                finally
                {
                    if (m_connection != null)
                    {
                        m_connection.Close();
                        m_connection.Dispose();
                        m_connection = null;
                    }
                }
            }
        }

        private void SetCodePage(MySqlConnection conn)
        {
            using (MySqlCommand cmd = conn.CreateCommand())
            {
                cmd.CommandText = "set names 'utf8'";
                if (!string.IsNullOrEmpty(ConfigurationManager.AppSettings["server_charset"]))
                {
                    cmd.CommandText = "set names '" + ConfigurationManager.AppSettings["server_charset"] + "'";
                }
                cmd.ExecuteNonQuery();
            }
        }

        public override string ToString()
        {
            return (m_connection != null ? m_connection.DataSource : "Detached") + " (" + UpdatesPending + ")";
        }

        private string formatTime(int time, int status, bool clock = false)
        {
            string returnStr = "";
            switch (status)
            {
                case 1: returnStr  = "DNS"; break;
                case 2: returnStr  = "DNF"; break;
                case 3: returnStr  = "MP"; break;
                case 4: returnStr  = "DSQ"; break;
                case 5: returnStr  = "OT"; break;
                case 6: returnStr  = "NC"; break;
                case 9: returnStr  = "STARTED"; break;
                case 10: returnStr = "ENTERED"; break;
                case 11: returnStr = "WO"; break;
                case 12: returnStr = "MOVEDUP"; break;
                case 13: returnStr = "FINISHED"; break;
                default:
                {
                    TimeSpan t = TimeSpan.FromSeconds((double)time / 100);
                    if (clock)
                    {
                        if (time == -999)
                            returnStr = "OPEN START";
                        else
                            returnStr = string.Format("{0:D2}:{1:D2}:{2:D2}", t.Hours, t.Minutes, t.Seconds);
                    }
                    else
                    {
                        if (t.Hours > 0)
                             returnStr = string.Format("{0:D1}:", t.Hours);
                         returnStr += string.Format("{0:D2}:{1:D2}", t.Minutes, t.Seconds);
                         if (t.Milliseconds > 0)
                             returnStr += string.Format(".{0:D1}", t.Milliseconds / 100);
                     }
                } break;
            }
            return returnStr;
        }

        #region IDisposable Members

        void IDisposable.Dispose()
        {
            if (m_connection != null)
            {
                m_connection.Close();
                m_connection.Dispose();
            }
        }

        #endregion
    }
}
