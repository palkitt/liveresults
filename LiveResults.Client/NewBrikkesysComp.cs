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


        private void wizardPage5_CloseFromNext(object sender, Gui.Wizard.PageEventArgs e)
        {
            lstDB.PreviousSelectedIndex = lstDB.SelectedIndex;
            StoreSettings();
            //start

            int CompID = 0, IdOffset = 0;
            bool parseOK = false;

            parseOK = Int32.TryParse(txtCompID.Text, out CompID);
            parseOK = Int32.TryParse(txtIdOffset.Text, out IdOffset);

            FrmBrikkesysMonitor monForm = new FrmBrikkesysMonitor();
            this.Hide();
            BrikkesysParser pars = new BrikkesysParser(GetDBConnection(), (lstDB.SelectedItem as BrikkesysComp).Id, CompID, IdOffset);

            monForm.SetParser(pars as IExternalSystemResultParserEtiming);
            monForm.CompetitionID = CompID;
            monForm.IdOffset = IdOffset;
            monForm.Organizer = txtOrganizer.Text;
            monForm.CompDate = DateTime.Parse((lstDB.SelectedItem as BrikkesysComp).Date);
            monForm.ShowDialog(this);
        }

    }
}