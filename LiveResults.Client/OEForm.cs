using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml.Serialization;
using LiveResults.Client.Parsers;
using LiveResults.Model;

namespace LiveResults.Client
{
    public partial class OEForm : Form
    {
        readonly List<EmmaMysqlClient> m_clients;
        OSParser m_osParser;
        OEParser m_oeParser;

#if _CASPARCG_
        private CasparClient.CasparControlFrm casparForm = null;
#endif
        enum Format { Iofxml, Oecsv, Oscsv, Oecsvteam }
        class FormatItem
        {
            public string Name { get; private set; }
            public string Description { get; private set; }
            public Format Format { get; private set; }
            public FormatItem(string name, string description, Format format)
            {
                Name = name;
                Description = description;
                Format = format;
            }

            public override string ToString()
            {
                return Name;
            }
        }

        readonly List<FormatItem> m_supportedFormats = new List<FormatItem>();
        private int m_compid = -1;
        private int m_refresh = 15;
        private string m_URL = "";
        private string m_organizer = "";
        private volatile bool _stopUrlLoader = false;
        private Task _urlLoaderTask; // Task to track the running thread
        private readonly object _taskLock = new object(); // Lock to ensure thread safety


        public OEForm(bool showCSVFormats = true)
        {
            InitializeComponent();
            Text = Text + @", " + Encoding.Default.EncodingName + @"," + Encoding.Default.CodePage;
            fileSystemWatcher1.Changed += new FileSystemEventHandler(fileSystemWatcher1_Changed);
            m_clients = new List<EmmaMysqlClient>();

            m_supportedFormats.Add(new FormatItem("IOF-XML", "Export files in IOF-XML (version 2 supported)", Format.Iofxml));
            if (showCSVFormats)
            {
                m_supportedFormats.Add(new FormatItem("OE-csv", "CSV files exported from OLEinzel 10.3 and 11", Format.Oecsv));
                m_supportedFormats.Add(new FormatItem("OS-csv", "CSV files exported from OLStaffel 10.3 and 11", Format.Oscsv));
                m_supportedFormats.Add(new FormatItem("OS-csv (Team)", "Team-CSV files exported from OSStaffel 10.3", Format.Oecsvteam));
            }
            else
            {
                lblFormatInfo.Visible = cmbFormat.Visible = label5.Visible = lblZeroTime.Visible = txtZeroTime.Visible = false;
            }

            cmbFormat.DataSource = m_supportedFormats;
            cmbFormat.SelectedIndex = 0;

            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "EmmaClient");


            string file = Path.Combine(path, "oesetts.xml");
            if (File.Exists(file))
            {
                try
                {
                    var fs = File.OpenRead(file);
                    var ser = new XmlSerializer(typeof(Settings));
                    var s = ser.Deserialize(fs) as Settings;
                    fs.Close();
                    if (s != null)
                    {
                        txtOEDirectory.Text = s.Location;
                        txtZeroTime.Text = s.ZeroTime;
                        txtExtension.Text = s.extension;
                        txtCompID.Text = s.CompID.ToString(CultureInfo.InvariantCulture);
                        txtOrganizer.Text = s.Organizer;
                        chkAutoCreateRadioControls.Checked = s.AutoCreateRadioControls;
                        chkDeleteUnused.Checked = s.DeleteUnused;
                        txtRefresh.Text = s.Refresh.ToString();
                        txtURL.Text = s.URL;
                        for (int i = 0; i < m_supportedFormats.Count; i++)
                        {
                            if (m_supportedFormats[i].Name == s.Format)
                                cmbFormat.SelectedIndex = i;
                        }
                    }
                }
                catch
                {
                }
            }
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            fileSystemWatcher1.EnableRaisingEvents = false;
            fileSystemWatcher1.Dispose();
            timer1.Enabled = false;
            timer1.Dispose();

            if (m_clients != null)
            {
                foreach (EmmaMysqlClient c in m_clients)
                {
                    c.Stop();
                }
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            folderBrowserDialog1.SelectedPath = txtOEDirectory.Text;
            if (folderBrowserDialog1.ShowDialog(this) == DialogResult.OK)
            {
                txtOEDirectory.Text = folderBrowserDialog1.SelectedPath;
            }
        }

        private int m_parsedZeroTime = 0;

        private void button2_Click(object sender, EventArgs e)
        {
            button2.Enabled = false;

            if (string.IsNullOrEmpty(txtCompID.Text))
            {
                MessageBox.Show(this, @"You must enter a competition-ID", @"Start OE Monitor", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (string.IsNullOrWhiteSpace(txtURL.Text) && !Directory.Exists(txtOEDirectory.Text))
            {
                MessageBox.Show(this, @"Please enter URL or select an existing OE Export directory", @"Start OE Monitor", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            string apiServer = ConfigurationManager.AppSettings["apiServer"];
            WebClient webClient = new WebClient();
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; //TLS 1.2
            int maxActiveTimer = 60; // Time between setting new live active signal
            int activeTimer = maxActiveTimer;

            m_compid = Convert.ToInt32(txtCompID.Text);
            m_refresh = Convert.ToInt32(txtRefresh.Text);
            m_URL = txtURL.Text;
            m_organizer = txtOrganizer.Text;
            m_parsedZeroTime = 0;
            listBox1.Items.Clear();
            button3.Enabled = false;
            m_clients.Clear();

            Logit("Reading servers from config (eventually resolving online)");
            Application.DoEvents();
            EmmaMysqlClient.EmmaServer[] servers = EmmaMysqlClient.GetServersFromConfig();
            Logit("Got servers from config...");
            Application.DoEvents();

            var format = cmbFormat.SelectedItem as FormatItem;

            bool useInternalIDAllocation = true;
            if (format.Format == Format.Oecsv || format.Format == Format.Oecsvteam || format.Format == Format.Oscsv)
            {
                useInternalIDAllocation = false;
                if (!string.IsNullOrEmpty(txtZeroTime.Text))
                {
                    var rex = new Regex(@"(\d\d?):(\d\d):(\d\d)");
                    var m = rex.Match(txtZeroTime.Text);
                    if (m.Success)
                    {
                        m_parsedZeroTime = int.Parse(m.Groups[1].Value) * 360000 + int.Parse(m.Groups[2].Value) * 6000 + int.Parse(m.Groups[3].Value) * 100;
                    }
                    else
                    {
                        Logit("WARN: Could not parse Zero-Time,skipping (Use format HH:MM:SS)");
                    }
                }

                m_osParser = new OSParser();
                m_osParser.OnLogMessage += Logit;

                m_osParser.OnResult += m_OSParser_OnResult;

                m_oeParser = new OEParser();
                m_oeParser.OnLogMessage += Logit;

                m_oeParser.OnResult += m_OSParser_OnResult;

                fsWatcherOS.Path = txtOEDirectory.Text;
                fsWatcherOS.Filter = txtExtension.Text;
                fsWatcherOS.EnableRaisingEvents = true;

            }
            else if (format.Format == Format.Iofxml && Directory.Exists(txtOEDirectory.Text))
            {
                fileSystemWatcher1.Path = txtOEDirectory.Text;
                fileSystemWatcher1.Filter = txtExtension.Text;
                fileSystemWatcher1.NotifyFilter = NotifyFilters.LastWrite;
                fileSystemWatcher1.IncludeSubdirectories = false;
                fileSystemWatcher1.EnableRaisingEvents = true;
                button3.Enabled = true;
            }

            bool organizerOK = false;
            foreach (EmmaMysqlClient.EmmaServer server in servers)
            {
                var client = new EmmaMysqlClient(server.Host, 3306, server.User, server.Pw, server.DB, m_compid, useInternalIDAllocation);
                client.OnLogMessage += client_OnLogMessage;
                client.Start();
                if (!String.Equals(client.organizer, m_organizer))
                {
                    Logit("Server:\t" + client.organizer);
                    Logit("Entered:\t" + m_organizer);
                    Logit("Organizer mismatch. Parser aborts!");
                    client.Stop();
                }
                else
                {
                    m_clients.Add(client);
                    organizerOK = true;
                }
            }

#if _CASPARCG_
            casparForm = new LiveResults.CasparClient.CasparControlFrm();
            casparForm.Show();
            casparForm.SetEmmaClient(m_clients[0]);
#endif

            if (organizerOK)
            {
                timer1_Tick(null, null);
                if (!string.IsNullOrEmpty(m_URL))
                {
                    StartUrlLoader(apiServer, webClient);
                }
            }

        }

        private void SendLiveActive(string apiServer, WebClient client)
        {
            string apiResponse = "";
            try
            {
                apiResponse = client.DownloadString(apiServer + "api.php?method=setlastactive&comp=" + m_compid);
                Logit("Client live active sent to web server");
            }
            catch (Exception ee)
            {
                Logit("Bad network or config file? Error when sending active signal: " + ee.Message);
            }
        }

        void m_OSParser_OnResult(Result newResult)
        {
            foreach (EmmaMysqlClient c in m_clients)
            {
                if (!c.IsRunnerAdded(newResult.ID))
                {
                    c.AddRunner(new Runner(newResult.ID, newResult.RunnerName, newResult.RunnerClub, newResult.Class, newResult.Ecard1, newResult.Ecard2, newResult.Bib));
                }
                else
                    c.UpdateRunnerInfo(newResult.ID, newResult.RunnerName, newResult.RunnerClub, newResult.Class, newResult.Ecard1, newResult.Ecard2, newResult.Bib, null);


                if (newResult.StartTime >= 0)
                {
                    c.SetRunnerStartTime(newResult.ID, newResult.StartTime + m_parsedZeroTime);
                }

                if (newResult is RelayResult)
                {
                    var rr = newResult as RelayResult;
                    c.SetRunnerResult(newResult.ID, rr.OverallTime, rr.OverallStatus);
                }
                else
                {
                    c.SetRunnerResult(newResult.ID, newResult.Time, newResult.Status);
                }

                if (newResult.SplitTimes != null)
                {
                    foreach (ResultStruct r in newResult.SplitTimes)
                    {
                        c.SetRunnerSplit(newResult.ID, r.ControlCode, r.Time);
                    }
                }

                if (newResult is RelayResult && newResult.Time > 0)
                {
                    var rs = newResult as RelayResult;
                    int nextLegId = OSParser.CreateID(rs.LegNumber + 1, OSParser.StNoFromID(rs.LegNumber, rs.ID));
                    if (c.IsRunnerAdded(nextLegId))
                    {
                        if (c.GetRunner(nextLegId).StartTime <= 0)
                        {
                            c.SetRunnerStartTime(nextLegId, rs.StartTime + rs.Time + m_parsedZeroTime);
                        }
                    }
                }

            }
        }

        void client_OnLogMessage(string msg)
        {
            Logit(msg);
        }

        void fileSystemWatcher1_Changed(object sender, FileSystemEventArgs e)
        {
            string filename = e.Name;
            string fullFilename = e.FullPath;
            if (!File.Exists(fullFilename))
                return;
            bool processed = false;
            for (int i = 0; i < 10; i++)
            {
                try
                {
                    RadioControl[] radioControls;
                    CourseName[] courseNames;
                    CourseControl[] courseControls;
                    var runners = IofXmlParser.ParseFile(fullFilename, Logit, new IofXmlParser.IDCalculator(m_compid).CalculateID, chkAutoCreateRadioControls.Checked,
                        out radioControls, out courseNames, out courseControls);

                    foreach (EmmaMysqlClient c in m_clients)
                    {
                        List<int> usedID = new List<int>();

                        c.UpdateCurrentResultsFromNewSet(runners, out usedID);
                        if (chkDeleteUnused.Checked && usedID.Count > 0)
                            c.DeleteUnusedRunners(usedID);
                        if (radioControls != null)
                            c.MergeRadioControls(radioControls);
                        if (courseNames != null)
                            c.MergeCourseNames(courseNames, true);
                        if (courseControls != null)
                            c.MergeCourseControls(courseControls, true);
                    }
                    if (runners != null)
                    {
                        Logit("Successful reading results from file. Runners in XML: " + runners.Length);
                        processed = true;
                    }
                }
                catch (Exception ee)
                {
                    Logit(ee.Message);
                }

                if (!processed)
                {
                    Thread.Sleep(1000);
                }
                else
                {
                    break;
                }
            }
            if (!processed)
            {
                Logit("Could not open " + filename + " for processing");
            }
        }

        void URL_loader(string URL)
        {
            try
            {
                RadioControl[] radioControls;
                CourseName[] courseNames;
                CourseControl[] courseControls;
                var runners = IofXmlParser.ParseFile(URL, Logit, new IofXmlParser.IDCalculator(m_compid).CalculateID, chkAutoCreateRadioControls.Checked,
                    out radioControls, out courseNames, out courseControls);

                foreach (EmmaMysqlClient c in m_clients)
                {
                    List<int> usedID = new List<int>();

                    c.UpdateCurrentResultsFromNewSet(runners, out usedID);
                    if (chkDeleteUnused.Checked && usedID.Count > 0)
                        c.DeleteUnusedRunners(usedID);
                    if (radioControls != null)
                        c.MergeRadioControls(radioControls);
                    if (courseNames != null)
                        c.MergeCourseNames(courseNames, true);
                    if (courseControls != null)
                        c.MergeCourseControls(courseControls, true);
                }
                if (runners != null)
                    Logit("Successful reading results from URL. Runners in XML: " + runners.Length);
            }
            catch (Exception ee)
            {
                Logit(ee.Message);
            }
        }

        private void StartUrlLoader(string apiServer, WebClient webClient)
        {
            lock (_taskLock) // Ensure thread safety
            {
                if (_urlLoaderTask != null && !_urlLoaderTask.IsCompleted)
                {
                    Logit("URL loader is running.");
                    return; // Exit if the task is already running
                }
                _stopUrlLoader = false; // Reset the stop flag

                _urlLoaderTask = Task.Run(() =>
                {
                    int activeTimer = 0;
                    int maxActiveTimer = 60;

                    while (!_stopUrlLoader)
                    {
                        try
                        {
                            URL_loader(m_URL);

                            activeTimer += m_refresh;
                            if (activeTimer >= maxActiveTimer)
                            {
                                SendLiveActive(apiServer, webClient);
                                activeTimer = 0;
                            }
                        }
                        catch (Exception ex)
                        {
                            Logit("Error reading URL: " + ex.Message);
                        }

                        button3.Enabled = true;
                        for (int i = 0; i < m_refresh; i++)
                        {
                            if (_stopUrlLoader) break;
                            Thread.Sleep(1000);
                        }
                    }
                });
            }
        }

        void Logit(string msg)
        {
            if (!listBox1.IsDisposed)
            {
                listBox1.Invoke(new MethodInvoker(() => listBox1.Items.Insert(0, DateTime.Now.ToString("HH:mm:ss") + " " + msg)));
            }
        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            listBox2.BeginUpdate();
            listBox2.Items.Clear();
            if (m_clients != null)
            {
                foreach (EmmaMysqlClient c in m_clients)
                {
                    listBox2.Items.Add(c);
                }
            }
            listBox2.EndUpdate();
        }

        private void button3_Click(object sender, EventArgs e)
        {
            button3.Enabled = false;
            _stopUrlLoader = true;
            if (m_clients != null)
            {
                foreach (EmmaMysqlClient c in m_clients)
                {
                    c.Stop();
                }
                m_clients.Clear();
                timer1_Tick(null, null);
            }
            fileSystemWatcher1.EnableRaisingEvents = false;
            fsWatcherOS.EnableRaisingEvents = false;
            lock (_taskLock)
            {
                if (_urlLoaderTask != null)
                {
                    _urlLoaderTask.Wait(2000); // Wait for the task to complete
                    _urlLoaderTask = null; // Reset the task
                }
            }
            button2.Enabled = true;
            Logit("Upload stopped");
        }

        private void fsWatcherOS_Changed(object sender, FileSystemEventArgs e)
        {
            string filename = e.Name;
            string fullFilename = e.FullPath;
            Logit(filename + " changed..");
            bool processed = false;
            for (int i = 0; i < 10; i++)
            {
                try
                {
                    StreamReader sr;
                    if (!File.Exists(fullFilename))
                    {
                        return;
                    }

                    sr = new StreamReader(fullFilename, Encoding.Default);
                    sr.Close();

                    var format = cmbFormat.SelectedItem as FormatItem;

                    if (format.Format == Format.Oecsv)
                    {
                        m_oeParser.AnalyzeFile(fullFilename);
                    }
                    else if (format.Format == Format.Oscsv)
                    {
                        m_osParser.AnalyzeFile(fullFilename);
                    }
                    else if (format.Format == Format.Oecsvteam)
                    {
                        m_osParser.AnalyzeTeamFile(fullFilename);
                    }

                    File.Delete(fullFilename);
                    processed = true;
                }
                catch (Exception ee)
                {
                    Logit(ee.Message);
                }

                if (!processed)
                {
                    Thread.Sleep(1000);
                }
                else
                {
                    break;
                }
            }
            if (!processed)
            {
                Logit("Could not open " + filename + " for processing");
            }
        }

        private void cmbFormat_SelectedIndexChanged(object sender, EventArgs e)
        {
            lblFormatInfo.Text = "";
            if (cmbFormat.SelectedItem != null)
            {
                lblFormatInfo.Text = (cmbFormat.SelectedItem as FormatItem).Description;
                if ((cmbFormat.SelectedItem as FormatItem).Format == Format.Oecsv
                    || (cmbFormat.SelectedItem as FormatItem).Format == Format.Oecsvteam
                    || (cmbFormat.SelectedItem as FormatItem).Format == Format.Oscsv)
                    lblZeroTime.Visible = txtZeroTime.Visible = true;
                else
                    lblZeroTime.Visible = txtZeroTime.Visible = false;

                if ((cmbFormat.SelectedItem as FormatItem).Format == Format.Iofxml)
                {
                    txtExtension.Text = @"*.xml";
                }
                else
                {
                    txtExtension.Text = @"*.csv";
                }
            }
        }

        private void OEForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            try
            {
                var s = new Settings
                {
                    Location = txtOEDirectory.Text,
                    CompID = int.Parse(txtCompID.Text),
                    extension = txtExtension.Text,
                    Format = (cmbFormat.SelectedItem as FormatItem).Name,
                    ZeroTime = txtZeroTime.Text,
                    AutoCreateRadioControls = chkAutoCreateRadioControls.Checked,
                    DeleteUnused = chkDeleteUnused.Checked,
                    Refresh = int.Parse(txtRefresh.Text),
                    URL = txtURL.Text,
                    Organizer = txtOrganizer.Text
                };

                string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "EmmaClient");
                if (!Directory.Exists(path))
                    Directory.CreateDirectory(path);

                string file = Path.Combine(path, "oesetts.xml");
                var fs = File.Create(file);
                var ser = new XmlSerializer(typeof(Settings));
                ser.Serialize(fs, s);
                fs.Close();
            }
            catch
            {
            }
        }

        [Serializable]
        public class Settings
        {
            public string Location { get; set; }
            public int CompID { get; set; }
            public string extension { get; set; }
            public string Format { get; set; }
            public string ZeroTime { get; set; }
            public bool AutoCreateRadioControls { get; set; }
            public bool DeleteUnused { get; set; }
            public int Refresh { get; set; }
            public string URL { get; set; }
            public string Organizer { get; set; }
        }

        private void button4_Click(object sender, EventArgs e)
        {
            var lines = new List<string>();
            for (int i = 0; i < listBox1.Items.Count; i++)
                lines.Add(listBox1.Items[i] as string);

            lines.Reverse();
            if (lines.Count > 0)
            {
                Clipboard.SetText(string.Join("\r\n", lines.ToArray()));
            }
            else
            {
                Clipboard.SetText("--No data--");
            }

        }
    }
}