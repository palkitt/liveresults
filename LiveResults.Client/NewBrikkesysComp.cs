using System;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Data.SqlClient;
using System.Drawing;
using System.Linq;
using System.Net.Mime;
using System.Text;
using System.Windows.Forms;
using System.Data.OleDb;
using System.IO;
using System.Xml.Serialization;
using LiveResults.Model;
using System.Globalization;

namespace LiveResults.Client
{
    public partial class NewBrikkesysComp : Form
    {
        public NewBrikkesysComp()
        {
            InitializeComponent();
            txtUser.Text = "root";
            txtPw.Text = "passwd";
            txtPort.Text = "3306";
            lstDB.PreviousSelectedIndex = 0;
            txtIdOffset.Text = "0";
            RetreiveSettings();
        }

        [Serializable]
        public struct Setting
        {
            public string Key { get; set; }
            public string Value { get; set; }
        }
        private void RetreiveSettings()
        {
            try
            {
                if (File.Exists(GetSettingsFile()))
                {
                    using (var ms = new MemoryStream(File.ReadAllBytes(GetSettingsFile())))
                    {
                        List<Setting> setts = new List<Setting>();
                        var serializer = new XmlSerializer(setts.GetType());
                        setts = serializer.Deserialize(ms) as List<Setting>;
                        if (setts != null)
                        {
                        }
                        applyControlValues(Controls, setts);
                    }
                }
            }
            catch (Exception)
            {

            }
        }

        private void applyControlValues(Control.ControlCollection controls, List<Setting> setts)
        {
            foreach (Control c in controls)
            {
                if (c is TextBox)
                {
                    string val = setts.Where(x => x.Key == c.Name).Select(x => x.Value).FirstOrDefault();
                    (c as TextBox).Text = val;
                }
                if (c is ComboBox)
                {
                    string val = setts.Where(x => x.Key == c.Name).Select(x => x.Value).FirstOrDefault();
                    (c as ComboBox).SelectedItem = val;

                }
                if (c is CheckBox)
                {
                    string val = setts.Where(x => x.Key == c.Name).Select(x => x.Value).FirstOrDefault();
                    if (val != null)
                    {
                        (c as CheckBox).Checked = val == "True";
                    }
                }
                if (c is DBListBox)
                {
                    string val = setts.Where(x => x.Key == c.Name).Select(x => x.Value).FirstOrDefault();
                    if (val != null)
                        (c as DBListBox).PreviousSelectedIndex = Int32.Parse(val);
                }

                applyControlValues(c.Controls, setts);
            }
        }

        private void StoreSettings()
        {
            List<Setting> setts = new List<Setting>();
            extractControlValues(Controls, setts);

            var serializer = new XmlSerializer(setts.GetType());
            using (var ms = new MemoryStream())
            {
                serializer.Serialize(ms, setts);
                var data = new byte[ms.Length];
                ms.Seek(0, SeekOrigin.Begin);
                ms.Read(data, 0, data.Length);

                if (!Directory.Exists(Path.GetDirectoryName(GetSettingsFile())))
                    Directory.CreateDirectory(Path.GetDirectoryName(GetSettingsFile()));

                File.WriteAllBytes(GetSettingsFile(), data);
            }


        }

        private static string GetSettingsFile()
        {
            return Path.Combine(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "LiveResults.Client"),
                "Brikkesysfrm.setts");
        }

        private void extractControlValues(Control.ControlCollection controls, List<Setting> setts)
        {
            foreach (Control c in controls)
            {
                if (c is TextBox)
                {
                    setts.Add(new Setting
                    {
                        Key = (c as TextBox).Name,
                        Value = (c as TextBox).Text
                    });
                }
                if (c is ComboBox)
                {
                    setts.Add(new Setting
                    {
                        Key = (c as ComboBox).Name,
                        Value = (c as ComboBox).SelectedValue as string
                    });
                }
                if (c is CheckBox)
                {
                    setts.Add(new Setting
                    {
                        Key = (c as CheckBox).Name,
                        Value = (c as CheckBox).Checked.ToString()
                    });
                }
                if (c is DBListBox)
                {
                    setts.Add(new Setting
                    {
                        Key = (c as DBListBox).Name,
                        Value = (c as DBListBox).PreviousSelectedIndex.ToString()
                    });
                }

                extractControlValues(c.Controls, setts);
            }
        }


        private IDbConnection GetDBConnection()
        {
            return GetDBConnection("resultatdatabase");
        }

        private IDbConnection GetDBConnection(string schema)
        {

            return new MySql.Data.MySqlClient.MySqlConnection("Server=" + txtHost.Text + ";User Id=" + txtUser.Text + ";Port=" + txtPort.Text + ";Password=" + txtPw.Text + (schema != null ? ";Initial Catalog=" + schema : "") + ";charset=utf8;ConnectionTimeout=30");
        }

        private void wizardPage3_ShowFromNext(object sender, EventArgs e)
        {
            StoreSettings();
            /*Try Connect*/
            IDbConnection conn = null;
            try
            {

                conn = GetDBConnection();
                conn.Open();
                lstDB.DataSource = null;
                IDbCommand cmd = conn.CreateCommand(); cmd.CommandText = "SELECT id, name, DATE_FORMAT(racedate,'%Y-%m-%d') AS date FROM races ORDER BY date desc";
                IDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    BrikkesysComp cmp = new BrikkesysComp();
                    cmp.Id = Convert.ToInt32(reader["id"].ToString());
                    cmp.Name = Convert.ToString(reader["name"]);
                    cmp.Date = Convert.ToString(reader["date"]);
                    lstDB.Items.Add(cmp);
                }
                reader.Close();
                cmd.Dispose();

                if (lstDB.Items.Count > lstDB.PreviousSelectedIndex)
                    lstDB.SetSelected(lstDB.PreviousSelectedIndex, true);
            }
            catch (Exception ee)
            {
                MessageBox.Show(this, ee.Message);
            }
            finally
            {
                if (conn != null)
                    conn.Close();
            }
        }

        private class BrikkesysComp
        {
            public string Name;
            public int Id;
            public string Date;

            public override string ToString()
            {
                return Date + " | " + Name;
            }
        }

        // Monitor page state
        private BrikkesysParser m_parser;
        private List<EmmaMysqlClient> m_clients = new List<EmmaMysqlClient>();
        private int m_monitorCompID;
        private string m_organizer;
        private DateTime m_compDate;
        private int m_IdOffset;


        private void wizardPage5_CloseFromNext(object sender, Gui.Wizard.PageEventArgs e)
        {
            lstDB.PreviousSelectedIndex = lstDB.SelectedIndex;
            StoreSettings();

            if (!Int32.TryParse(txtCompID.Text, out int CompID))
            {
                MessageBox.Show("Invalid CompetitionID value", "Invalid input", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            if (!Int32.TryParse(txtIdOffset.Text, out int IdOffset))
                IdOffset = 0;

            TimeSpan? startTime = null;
            if (!string.IsNullOrWhiteSpace(txtStartTime.Text))
            {
                if (TimeSpan.TryParseExact(txtStartTime.Text.Trim(), @"hh\:mm\:ss", CultureInfo.InvariantCulture, out TimeSpan parsed))
                    startTime = parsed;
                else
                    MessageBox.Show("Could not parse Start Time, ignoring (use hh:mm:ss)", "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }

            m_monitorCompID = CompID;
            m_IdOffset = IdOffset;
            m_organizer = txtOrganizer.Text;
            m_compDate = DateTime.Parse((lstDB.SelectedItem as BrikkesysComp).Date);

            m_parser = new BrikkesysParser(GetDBConnection(), (lstDB.SelectedItem as BrikkesysComp).Id, CompID, IdOffset, startTime);
            m_parser.OnLogMessage += MonitorLogMessage;
        }

        private void wizardPage6_ShowFromNext(object sender, EventArgs e)
        {
            listBoxMonitor.Items.Clear();
            btnMonitorStartStop.Text = "Start";
        }

        private void wizardPage6_CloseFromNext(object sender, Gui.Wizard.PageEventArgs e)
        {
            StopMonitor();
        }

        private void wizardPage6_CloseFromBack(object sender, Gui.Wizard.PageEventArgs e)
        {
            StopMonitor();
        }

        private void btnMonitorStartStop_Click(object sender, EventArgs e)
        {
            if (btnMonitorStartStop.Text == "Start")
            {
                EmmaMysqlClient.EmmaServer[] servers = EmmaMysqlClient.GetServersFromConfig();
                bool dateOrganizerOK = true;
                foreach (EmmaMysqlClient.EmmaServer srv in servers)
                {
                    EmmaMysqlClient cli = new EmmaMysqlClient(srv.Host, 3309, srv.User, srv.Pw, srv.DB, m_monitorCompID);
                    m_clients.Add(cli);
                    cli.OnLogMessage += MonitorLogMessage;
                    cli.Start();

                    string stringCompDate = m_compDate.ToString("yyyy-MM-dd");
                    string stringCliCompDate = cli.compDate.ToString("yyyy-MM-dd");
                    if (!(String.Equals(stringCliCompDate, stringCompDate) && String.Equals(cli.organizer, m_organizer)))
                    {
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Brikkesys date/organizer:\t" + stringCompDate + " / " + m_organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Server date/organizer:\t" + stringCliCompDate + " / " + cli.organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Parser aborts! Server and Brikkesys data do NOT match.");
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Check date, organizer, compID and network connection!");
                        dateOrganizerOK = false;
                        break;
                    }
                    else
                    {
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Brikkesys date/organizer:\t" + stringCompDate + " / " + m_organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Server date/organizer:\t" + stringCliCompDate + " / " + cli.organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Server and Brikkesys data match!");
                    }
                }

                if (dateOrganizerOK)
                {
                    m_parser.OnResult += MonitorOnResult;
                    m_parser.OnDeleteID += MonitorOnDeleteID;
                    m_parser.OnDeleteUnusedID += MonitorOnDeleteUnusedID;
                    m_parser.OnMergeRadioControls += MonitorOnMergeRadioControls;
                    m_parser.OnMergeCourseData += MonitorOnMergeCourseData;
                    m_parser.OnRadioControl += (name, code, className, order) =>
                    {
                        foreach (EmmaMysqlClient client in m_clients)
                            client.SetRadioControl(className, code, name, order);
                    };
                    m_parser.Start();
                    btnMonitorStartStop.Text = "Stop";
                }
                else
                {
                    foreach (EmmaMysqlClient cli in m_clients) cli.Stop();
                    m_clients.Clear();
                }
            }
            else
            {
                StopMonitor();
                btnMonitorStartStop.Text = "Start";
            }
        }

        private void StopMonitor()
        {
            if (m_parser != null)
            {
                m_parser.Stop();
                m_parser.OnLogMessage -= MonitorLogMessage;
            }
            foreach (EmmaMysqlClient cli in m_clients) cli.Stop();
            m_clients.Clear();
        }

        private void MonitorLogMessage(string msg)
        {
            if (listBoxMonitor == null || listBoxMonitor.IsDisposed) return;
            if (listBoxMonitor.InvokeRequired)
                listBoxMonitor.BeginInvoke(new Action(() => listBoxMonitor.Items.Insert(0, DateTime.Now.ToString("HH:mm:ss") + " " + msg)));
            else
                listBoxMonitor.Items.Insert(0, DateTime.Now.ToString("HH:mm:ss") + " " + msg);
        }

        private void MonitorOnResult(Result newResult)
        {
            foreach (EmmaMysqlClient client in m_clients)
            {
                if (!client.IsRunnerAdded(newResult.ID))
                    client.AddRunner(new Runner(newResult.ID, newResult.RunnerName, newResult.RunnerClub, newResult.Class, newResult.Ecard1, newResult.Ecard2, newResult.Bib, null, newResult.Course, newResult.Length, newResult.EcardTimes));
                else
                    client.UpdateRunnerInfo(newResult.ID, newResult.RunnerName, newResult.RunnerClub, newResult.Class, newResult.Ecard1, newResult.Ecard2, newResult.Bib, null, newResult.Course, newResult.Length, newResult.EcardTimes);

                if (newResult.StartTime > 0 || newResult.StartTime == -1 || newResult.StartTime == -999)
                    client.SetRunnerStartTime(newResult.ID, newResult.StartTime);

                if (newResult.Time != -2)
                    client.SetRunnerResult(newResult.ID, newResult.Time, newResult.Status);

                var controlCodes = new List<int>();
                if (newResult.SplitTimes != null)
                {
                    foreach (ResultStruct str in newResult.SplitTimes)
                    {
                        client.SetRunnerSplit(newResult.ID, str.ControlCode, str.Time);
                        controlCodes.Add(str.ControlCode);
                    }
                }
                client.DeleteUnusedSplits(newResult.ID, controlCodes);
            }
        }

        private void MonitorOnDeleteID(int runnerID)
        {
            foreach (EmmaMysqlClient client in m_clients)
                client.DeleteID(runnerID);
        }

        private void MonitorOnDeleteUnusedID(List<int> usedIds, bool first = false)
        {
            if (usedIds == null) return;
            foreach (EmmaMysqlClient client in m_clients)
            {
                foreach (var dbRunner in client.m_runners.Values.ToList())
                {
                    if (!usedIds.Contains(dbRunner.ID) && (first || dbRunner.ID >= 0))
                        client.DeleteID(dbRunner.ID);
                }
            }
        }

        private void MonitorOnMergeRadioControls(RadioControl[] radioControls, bool update)
        {
            foreach (EmmaMysqlClient client in m_clients)
                if (radioControls != null) client.MergeRadioControls(radioControls, update);
        }

        private void MonitorOnMergeCourseData(CourseData[] courseData, bool deleteUnused)
        {
            foreach (EmmaMysqlClient client in m_clients)
                if (courseData != null) client.MergeCourseData(courseData, deleteUnused);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            StopMonitor();
            base.OnFormClosing(e);
        }
    }
}