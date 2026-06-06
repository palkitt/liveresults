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
    public struct IDpar
    {
        public int eTimingID;
        public int EventorID;
    };

    public partial class NewETimingComp : Form
    {
        public NewETimingComp()
        {
            InitializeComponent();
            comboBox1.DataSource = new string[] { "eTiming Access database", "SQL-Server" };
            comboBox1.SelectedIndex = 0;
            lstDB.PreviousSelectedIndex = 0;
            txtUser.Text = "emit";
            txtPw.Text = "time";
            txtPort.Text = "1433";
            txtETimingDb.Text = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
            txtSleepTime.Text = "3";
            txtIdOffset.Text = "0";
            txtOsOffset.Text = "0";
            txtMinPace.Text = "0";
            chkUpdateRadioControls.Checked = true;
            chkLapTimes.Checked = false;
            chkEventorID.Checked = false;
            chkUpdateMessage.Checked = false;
            chkAddEcardSplits.Checked = true;
            chkEcardAsBackup.Checked = true;
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
            catch (Exception ee)
            {
                MessageBox.Show(this, ee.Message);
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
                "ETimingfrm.setts");
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


        private void comboBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            switch (comboBox1.SelectedIndex)
            {
                case 0:
                    txtHost.Enabled = txtPort.Enabled = txtUser.Enabled = txtPw.Enabled = false;
                    panel1.Visible = true;
                    break;
                case 1:
                    txtHost.Enabled = txtPort.Enabled = txtUser.Enabled = txtPw.Enabled = true;
                    panel1.Visible = false;
                    break;
            }
        }

        private void wizardPage2_ShowFromNext(object sender, EventArgs e)
        {
            if (comboBox1.SelectedIndex == 0)
                wizard1.NextTo(wizardPage5);
            StoreSettings();
            /*Try Connect*/
            IDbConnection conn = null;
            try
            {
                if (comboBox1.SelectedIndex != 0)
                {
                    conn = GetDBConnection();
                    if (conn != null)
                    {
                        conn.Open();
                        lstDB.DataSource = null;

                        string[] databases = GetDatabases(conn);
                        lstDB.DataSource = databases;
                        if (lstDB.Items.Count > lstDB.PreviousSelectedIndex)
                            lstDB.SetSelected(lstDB.PreviousSelectedIndex, true);
                    }
                }
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

        private string[] GetDatabases(IDbConnection conn)
        {
            List<string> dbs = new List<string>();
            if (conn is OleDbConnection)
            {
                OleDbConnection oleConn = conn as OleDbConnection;
                DataTable schemas = oleConn.GetOleDbSchemaTable(OleDbSchemaGuid.Catalogs, null);
                foreach (DataRow r in schemas.Rows)
                {
                    dbs.Add(r["CATALOG_NAME"] as string);
                }
            }
            else if (conn is SqlConnection)
            {
                SqlConnection sqlConn = conn as SqlConnection;
                DataTable schemas = sqlConn.GetSchema("Databases");
                foreach (DataRow r in schemas.Rows)
                {
                    if (Convert.ToInt32(r["dbid"].ToString()) >= 5) // Drop system databases
                        dbs.Add(r["database_name"] as string);
                }
            }
            return dbs.ToArray();
        }

        private IDbConnection GetDBConnection()
        {
            return GetDBConnection(null);
        }

        private IDbConnection GetDBConnection(string schema)
        {
            switch (comboBox1.SelectedIndex)
            {
                case 0:
                    return new OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" + txtETimingDb.Text + ";");
                case 1:
                    return new SqlConnection("Data Source=" + txtHost.Text + (txtPort.TextLength > 0 ? "," + txtPort.Text : "") + "; UID=" + txtUser.Text + ";PWD=" + txtPw.Text + (schema != null ? "; Database=" + schema : ""));
                    //return new OleDbConnection("Provider=SQL Server Native Client 11.0;Data Source=" + txtHost.Text + (txtPort.TextLength>0 ? ";Port=" + txtPort : "") + "; UID=" + txtUser.Text + ";PWD=" + txtPw.Text + (schema != null ? "; Database=" + schema : ""));
            }
            return null;
        }


        private class ETimingComp
        {
            public string Name;
            public int Id;
            public List<IDpar> eTimingIDpars;
            public string Organizer;
            public DateTime CompDate;
            public int CompType;

            public override string ToString()
            {
                return Name;
            }
        }

        ETimingComp cmp = new ETimingComp();

        // Monitor page state
        private ETimingParser m_parser;
        private List<EmmaMysqlClient> m_clients = new List<EmmaMysqlClient>();
        private int m_monitorCompID;
        private bool m_useEventorID;
        private bool m_deleteEmmaIDs;
        private List<IDpar> m_clientIDpars;
        private int m_IdOffset;
        private int m_OsOffset;

        private void wizardPage5_ShowFromNext(object sender, EventArgs e)
        {
            lstDB.PreviousSelectedIndex = lstDB.SelectedIndex;
            StoreSettings();
            IDbConnection conn = null;
            try
            {
                conn = GetDBConnection(lstDB.SelectedItem as string);
                conn.Open();
                IDbCommand cmd = conn.CreateCommand();

                cmd.CommandText = "SELECT id, name, organizator, firststart, kid FROM arr";
                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        cmp.Id = Convert.ToInt32(reader["id"].ToString());
                        cmp.Name = Convert.ToString(reader["name"]);
                        cmp.Organizer = Convert.ToString(reader["organizator"]).Trim();
                        cmp.CompDate = Convert.ToDateTime(reader[("firststart")]);
                        cmp.CompType = Convert.ToInt16(reader["kid"]);
                    }
                    reader.Close();
                }

                int EventorID = 0, eTimingID = 0;
                bool parseOK;
                IDpar eTimingIDs;
                cmp.eTimingIDpars = new List<IDpar>();

                cmd.CommandText = "SELECT id, kid, status from Name";
                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string status = reader["status"] as string;
                        if ((status != "V") && (status != "C")) // Continue if not "free" nor "entered"  
                        {
                            eTimingID = Convert.ToInt32(reader["id"].ToString());
                            EventorID = 0;
                            if (reader["kid"] != null && reader["kid"] != DBNull.Value && reader["kid"].ToString() != "")
                                parseOK = Int32.TryParse(reader["kid"].ToString(), out EventorID);
                            eTimingIDs.eTimingID = eTimingID;
                            eTimingIDs.EventorID = EventorID;
                            cmp.eTimingIDpars.Add(eTimingIDs);
                        }
                    }
                    reader.Close();
                }
                cmd.Dispose();
            }
            catch (Exception ee)
            {
                MessageBox.Show(this, ee.Message);
            }
            finally
            {
                if (conn != null)
                    conn.Close();

                txtCompName.Text = cmp.Name;
                txtOrgName.Text = cmp.Organizer;
                txtCompDate.Text = Convert.ToString(cmp.CompDate);
                switch (cmp.CompType)
                {
                    case 0:
                        txtCompType.Text = "Orientering";
                        break;
                    case 1:
                        txtCompType.Text = "Orientering, enkel";
                        break;
                    case 2:
                        txtCompType.Text = "Langrenn, sprint";
                        break;
                    case 3:
                        txtCompType.Text = "Orientering, stafett";
                        break;
                    case 4:
                        txtCompType.Text = "Langrenn";
                        break;
                    case 5:
                        txtCompType.Text = "Langrenn, enkel";
                        break;
                    case 6:
                        txtCompType.Text = "Langrenn, stafett";
                        break;
                    default:
                        txtCompType.Text = "Other (maybe not supported)";
                        break;
                }
            }
        }

        private void wizardPage5_CloseFromNext(object sender, Gui.Wizard.PageEventArgs e)
        {
            StoreSettings();
            if (!Int32.TryParse(txtIdOffset.Text, out int IdOffset))
                IdOffset = 0;
            if (IdOffset > 0)
            {
                DialogResult result = MessageBox.Show("Use offset > 0 only when you want to show results from multiple databases in one LiveRes event!",
                    "Database ID offset > 0", MessageBoxButtons.OKCancel, MessageBoxIcon.Exclamation);
                if (result == DialogResult.Cancel)
                    return;
            }
            if (!Int32.TryParse(txtSleepTime.Text, out int SleepTime))
                SleepTime = 3;
            if (!Int32.TryParse(txtOsOffset.Text, out int OsOffset))
                OsOffset = 0;
            if (!Double.TryParse(txtMinPace.Text, out double MinPace))
            {
                if (!Double.TryParse(txtMinPace.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out MinPace))
                    MinPace = 0;
            }
            if (!Int32.TryParse(txtCompID.Text, out int CompID))
            {
                MessageBox.Show("Invalid compID value", "Invalid input", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            TimeSpan? ecardStartTime = null;
            if (!string.IsNullOrWhiteSpace(txtEcardStartTime.Text))
            {
                if (TimeSpan.TryParseExact(txtEcardStartTime.Text.Trim(), @"hh\:mm\:ss", CultureInfo.InvariantCulture, out TimeSpan parsed))
                    ecardStartTime = parsed;
                else
                    MessageBox.Show("Could not parse Start Time, ignoring (use hh:mm:ss)", "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }

            bool MSSQL = (comboBox1.SelectedIndex == 1);
            m_monitorCompID = CompID;
            m_useEventorID = chkEventorID.Checked;
            m_deleteEmmaIDs = false;
            m_clientIDpars = cmp.eTimingIDpars;
            m_IdOffset = IdOffset;
            m_OsOffset = OsOffset;

            m_parser = new ETimingParser(
                GetDBConnection(lstDB.SelectedItem as string),
                SleepTime,
                chkUpdateRadioControls.Checked, MinPace, MSSQL, chkEcardAsBackup.Checked,
                chkLapTimes.Checked, chkEventorID.Checked, IdOffset,
                chkUpdateMessage.Checked, chkAddEcardSplits.Checked, CompID, OsOffset, ecardStartTime);

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

                    string stringCompDate = cmp.CompDate.ToString("yyyy-MM-dd");
                    string stringCliCompDate = cli.compDate.ToString("yyyy-MM-dd");
                    if (!(String.Equals(stringCliCompDate, stringCompDate) && String.Equals(cli.organizer, cmp.Organizer)))
                    {
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " eTiming date/organizer:\t" + stringCompDate + " / " + cmp.Organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Server date/organizer:\t" + stringCliCompDate + " / " + cli.organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Parser aborts! Server and eTiming data do NOT match.");
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Check date, organizer, compID and network connection!");
                        dateOrganizerOK = false;
                        break;
                    }
                    else
                    {
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " eTiming date/organizer:\t" + stringCompDate + " / " + cmp.Organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Server date/organizer:\t" + stringCliCompDate + " / " + cli.organizer);
                        MonitorLogMessage(DateTime.Now.ToString("HH:mm:ss") + " Server and eTiming data match!");
                    }
                }

                if (dateOrganizerOK)
                {
                    m_parser.OnResult += MonitorOnResult;
                    m_parser.OnDeleteID += MonitorOnDeleteID;
                    m_parser.OnDeleteVacantID += MonitorOnDeleteVacantID;
                    m_parser.OnDeleteUnusedID += MonitorOnDeleteUnusedID;
                    m_parser.OnMergeRadioControls += MonitorOnMergeRadioControls;
                    m_parser.OnMergeCourseData += MonitorOnMergeCourseData;
                    m_parser.OnMergeVacants += MonitorOnMergeVacants;
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

                if (newResult.StartTime >= 0 || newResult.StartTime == -1 || newResult.StartTime == -999)
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

        private void MonitorOnDeleteVacantID(int runnerID)
        {
            foreach (EmmaMysqlClient client in m_clients)
                client.DeleteVacantID(runnerID);
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

        private void MonitorOnMergeVacants(VacantRunner[] vacantRunners, bool deleteUnused)
        {
            foreach (EmmaMysqlClient client in m_clients)
                if (vacantRunners != null) client.MergeVacantRunners(vacantRunners, deleteUnused);
        }

        private void button1_Click(object sender, EventArgs e)
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Filter = "eTiming databases (*.mdb)|*.mdb";
            ofd.FileName = txtETimingDb.Text;
            ofd.CustomPlaces.Add(new FileDialogCustomPlace(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData)));
            ofd.InitialDirectory = Directory.Exists(txtETimingDb.Text) ? txtETimingDb.Text : Path.GetDirectoryName(txtETimingDb.Text);
            if (ofd.ShowDialog(this) == DialogResult.OK)
            {
                txtETimingDb.Text = ofd.FileName;
            }
        }

        private void wizardPage2_ShowFromBack(object sender, EventArgs e)
        {
            if (comboBox1.SelectedIndex == 0)
                wizard1.NextTo(wizardPage1);
        }

        private void checkBox1_CheckedChanged(object sender, EventArgs e)
        {

        }

        private void checkBox1_CheckedChanged_1(object sender, EventArgs e)
        {

        }

        private void label9_Click(object sender, EventArgs e)
        {

        }

        private void label8_Click(object sender, EventArgs e)
        {

        }

        private void label12_Click(object sender, EventArgs e)
        {

        }

        private void label15_Click(object sender, EventArgs e)
        {

        }

        private void label16_Click(object sender, EventArgs e)
        {

        }

        private void chkCreateRadioControls_CheckedChanged(object sender, EventArgs e)
        {

        }

        private void txtCompName_TextChanged(object sender, EventArgs e)
        {

        }

        private void chkEventorID_CheckedChanged(object sender, EventArgs e)
        {

        }

        private void label18_Click(object sender, EventArgs e)
        {

        }
    }
}