namespace LiveResults.Client
{
    partial class NewBrikkesysComp
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        public class DBListBox : System.Windows.Forms.ListBox
        {
            public int PreviousSelectedIndex { get; set; }
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(NewBrikkesysComp));
            this.wizard1 = new Gui.Wizard.Wizard();
            this.wizardPage1 = new Gui.Wizard.WizardPage();
            this.txtPw = new System.Windows.Forms.TextBox();
            this.label5 = new System.Windows.Forms.Label();
            this.txtUser = new System.Windows.Forms.TextBox();
            this.txtPort = new System.Windows.Forms.TextBox();
            this.txtHost = new System.Windows.Forms.TextBox();
            this.label4 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.wizardPage5 = new Gui.Wizard.WizardPage();
            this.txtIdOffset = new System.Windows.Forms.TextBox();
            this.label16 = new System.Windows.Forms.Label();
            this.txtOrganizer = new System.Windows.Forms.TextBox();
            this.organizer = new System.Windows.Forms.Label();
            this.txtCompID = new System.Windows.Forms.TextBox();
            this.label9 = new System.Windows.Forms.Label();
            this.wizardPage3 = new Gui.Wizard.WizardPage();
            this.lstDB = new LiveResults.Client.NewBrikkesysComp.DBListBox();
            this.label7 = new System.Windows.Forms.Label();
            this.txtStartTime = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.wizardPage6 = new Gui.Wizard.WizardPage();
            this.panelMonitorTop = new System.Windows.Forms.Panel();
            this.btnMonitorStartStop = new System.Windows.Forms.Button();
            this.listBoxMonitor = new System.Windows.Forms.ListBox();
            this.wizard1.SuspendLayout();
            this.wizardPage6.SuspendLayout();
            this.panelMonitorTop.SuspendLayout();
            this.wizardPage1.SuspendLayout();
            this.wizardPage5.SuspendLayout();
            this.wizardPage3.SuspendLayout();
            this.SuspendLayout();
            // 
            // wizard1
            // 
            this.wizard1.Controls.Add(this.wizardPage6);
            this.wizard1.Controls.Add(this.wizardPage5);
            this.wizard1.Controls.Add(this.wizardPage3);
            this.wizard1.Controls.Add(this.wizardPage1);
            this.wizard1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.wizard1.Font = new System.Drawing.Font("Tahoma", 8.25F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.wizard1.Location = new System.Drawing.Point(0, 0);
            this.wizard1.Name = "wizard1";
            this.wizard1.Pages.AddRange(new Gui.Wizard.WizardPage[] {
            this.wizardPage1,
            this.wizardPage3,
            this.wizardPage5,
            this.wizardPage6});
            this.wizard1.Size = new System.Drawing.Size(506, 290);
            this.wizard1.TabIndex = 0;
            // 
            // wizardPage1
            // 
            this.wizardPage1.Controls.Add(this.txtPw);
            this.wizardPage1.Controls.Add(this.label5);
            this.wizardPage1.Controls.Add(this.txtUser);
            this.wizardPage1.Controls.Add(this.txtPort);
            this.wizardPage1.Controls.Add(this.txtHost);
            this.wizardPage1.Controls.Add(this.label4);
            this.wizardPage1.Controls.Add(this.label3);
            this.wizardPage1.Controls.Add(this.label2);
            this.wizardPage1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.wizardPage1.IsFinishPage = false;
            this.wizardPage1.Location = new System.Drawing.Point(0, 0);
            this.wizardPage1.Name = "wizardPage1";
            this.wizardPage1.Size = new System.Drawing.Size(506, 242);
            this.wizardPage1.TabIndex = 1;
            // 
            // txtPw
            // 
            this.txtPw.Location = new System.Drawing.Point(72, 89);
            this.txtPw.Name = "txtPw";
            this.txtPw.Size = new System.Drawing.Size(171, 21);
            this.txtPw.TabIndex = 9;
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(10, 91);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(53, 13);
            this.label5.TabIndex = 8;
            this.label5.Text = "Password";
            // 
            // txtUser
            // 
            this.txtUser.Location = new System.Drawing.Point(72, 62);
            this.txtUser.Name = "txtUser";
            this.txtUser.Size = new System.Drawing.Size(171, 21);
            this.txtUser.TabIndex = 7;
            // 
            // txtPort
            // 
            this.txtPort.Location = new System.Drawing.Point(72, 34);
            this.txtPort.Name = "txtPort";
            this.txtPort.Size = new System.Drawing.Size(171, 21);
            this.txtPort.TabIndex = 6;
            // 
            // txtHost
            // 
            this.txtHost.Location = new System.Drawing.Point(73, 7);
            this.txtHost.Name = "txtHost";
            this.txtHost.Size = new System.Drawing.Size(170, 21);
            this.txtHost.TabIndex = 5;
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(10, 64);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(55, 13);
            this.label4.TabIndex = 4;
            this.label4.Text = "Username";
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(39, 37);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(27, 13);
            this.label3.TabIndex = 3;
            this.label3.Text = "Port";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(37, 11);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(29, 13);
            this.label2.TabIndex = 2;
            this.label2.Text = "Host";
            // 
            // wizardPage5
            // 
            this.wizardPage5.Controls.Add(this.txtStartTime);
            this.wizardPage5.Controls.Add(this.label1);
            this.wizardPage5.Controls.Add(this.txtIdOffset);
            this.wizardPage5.Controls.Add(this.label16);
            this.wizardPage5.Controls.Add(this.txtOrganizer);
            this.wizardPage5.Controls.Add(this.organizer);
            this.wizardPage5.Controls.Add(this.txtCompID);
            this.wizardPage5.Controls.Add(this.label9);
            this.wizardPage5.Dock = System.Windows.Forms.DockStyle.Fill;
            this.wizardPage5.IsFinishPage = false;
            this.wizardPage5.Location = new System.Drawing.Point(0, 0);
            this.wizardPage5.Name = "wizardPage5";
            this.wizardPage5.Size = new System.Drawing.Size(506, 242);
            this.wizardPage5.TabIndex = 5;
            this.wizardPage5.CloseFromNext += new Gui.Wizard.PageEventHandler(this.wizardPage5_CloseFromNext);
            // 
            // txtIdOffset
            // 
            this.txtIdOffset.Location = new System.Drawing.Point(15, 113);
            this.txtIdOffset.Name = "txtIdOffset";
            this.txtIdOffset.Size = new System.Drawing.Size(175, 21);
            this.txtIdOffset.TabIndex = 19;
            // 
            // label16
            // 
            this.label16.AutoSize = true;
            this.label16.Location = new System.Drawing.Point(12, 98);
            this.label16.Name = "label16";
            this.label16.Size = new System.Drawing.Size(150, 13);
            this.label16.TabIndex = 20;
            this.label16.Text = "Database ID offset. Default 0";
            // 
            // txtOrganizer
            // 
            this.txtOrganizer.Location = new System.Drawing.Point(15, 69);
            this.txtOrganizer.Name = "txtOrganizer";
            this.txtOrganizer.Size = new System.Drawing.Size(175, 21);
            this.txtOrganizer.TabIndex = 3;
            // 
            // organizer
            // 
            this.organizer.AutoSize = true;
            this.organizer.Location = new System.Drawing.Point(12, 54);
            this.organizer.Name = "organizer";
            this.organizer.Size = new System.Drawing.Size(54, 13);
            this.organizer.TabIndex = 2;
            this.organizer.Text = "Organizer";
            // 
            // txtCompID
            // 
            this.txtCompID.Location = new System.Drawing.Point(15, 25);
            this.txtCompID.Name = "txtCompID";
            this.txtCompID.Size = new System.Drawing.Size(175, 21);
            this.txtCompID.TabIndex = 1;
            // 
            // label9
            // 
            this.label9.AutoSize = true;
            this.label9.Location = new System.Drawing.Point(12, 10);
            this.label9.Name = "label9";
            this.label9.Size = new System.Drawing.Size(73, 13);
            this.label9.TabIndex = 0;
            this.label9.Text = "CompetitonID";
            // 
            // wizardPage6
            // 
            this.wizardPage6.Controls.Add(this.listBoxMonitor);
            this.wizardPage6.Controls.Add(this.panelMonitorTop);
            this.wizardPage6.Dock = System.Windows.Forms.DockStyle.Fill;
            this.wizardPage6.IsFinishPage = false;
            this.wizardPage6.Location = new System.Drawing.Point(0, 0);
            this.wizardPage6.Name = "wizardPage6";
            this.wizardPage6.Size = new System.Drawing.Size(506, 242);
            this.wizardPage6.TabIndex = 6;
            this.wizardPage6.CloseFromNext += new Gui.Wizard.PageEventHandler(this.wizardPage6_CloseFromNext);
            this.wizardPage6.CloseFromBack += new Gui.Wizard.PageEventHandler(this.wizardPage6_CloseFromBack);
            this.wizardPage6.ShowFromNext += new System.EventHandler(this.wizardPage6_ShowFromNext);
            // 
            // panelMonitorTop
            // 
            this.panelMonitorTop.Controls.Add(this.btnMonitorStartStop);
            this.panelMonitorTop.Dock = System.Windows.Forms.DockStyle.Top;
            this.panelMonitorTop.Location = new System.Drawing.Point(0, 0);
            this.panelMonitorTop.Name = "panelMonitorTop";
            this.panelMonitorTop.Size = new System.Drawing.Size(506, 35);
            this.panelMonitorTop.TabIndex = 0;
            // 
            // btnMonitorStartStop
            // 
            this.btnMonitorStartStop.Location = new System.Drawing.Point(6, 6);
            this.btnMonitorStartStop.Name = "btnMonitorStartStop";
            this.btnMonitorStartStop.Size = new System.Drawing.Size(75, 23);
            this.btnMonitorStartStop.TabIndex = 0;
            this.btnMonitorStartStop.Text = "Start";
            this.btnMonitorStartStop.UseVisualStyleBackColor = true;
            this.btnMonitorStartStop.Click += new System.EventHandler(this.btnMonitorStartStop_Click);
            // 
            // listBoxMonitor
            // 
            this.listBoxMonitor.Dock = System.Windows.Forms.DockStyle.Fill;
            this.listBoxMonitor.FormattingEnabled = true;
            this.listBoxMonitor.Location = new System.Drawing.Point(0, 35);
            this.listBoxMonitor.Name = "listBoxMonitor";
            this.listBoxMonitor.Size = new System.Drawing.Size(506, 207);
            this.listBoxMonitor.TabIndex = 1;
            // 
            // wizardPage3
            // 
            this.wizardPage3.Controls.Add(this.lstDB);
            this.wizardPage3.Controls.Add(this.label7);
            this.wizardPage3.Dock = System.Windows.Forms.DockStyle.Fill;
            this.wizardPage3.IsFinishPage = false;
            this.wizardPage3.Location = new System.Drawing.Point(0, 0);
            this.wizardPage3.Name = "wizardPage3";
            this.wizardPage3.Size = new System.Drawing.Size(506, 242);
            this.wizardPage3.TabIndex = 3;
            this.wizardPage3.ShowFromNext += new System.EventHandler(this.wizardPage3_ShowFromNext);
            // 
            // lstDB
            // 
            this.lstDB.FormattingEnabled = true;
            this.lstDB.Location = new System.Drawing.Point(13, 19);
            this.lstDB.Name = "lstDB";
            this.lstDB.PreviousSelectedIndex = 0;
            this.lstDB.Size = new System.Drawing.Size(343, 186);
            this.lstDB.TabIndex = 2;
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(10, 3);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(84, 13);
            this.label7.TabIndex = 1;
            this.label7.Text = "Select database";
            // 
            // txtStartTime
            // 
            this.txtStartTime.Location = new System.Drawing.Point(15, 163);
            this.txtStartTime.Name = "txtStartTime";
            this.txtStartTime.Size = new System.Drawing.Size(175, 21);
            this.txtStartTime.TabIndex = 21;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(12, 147);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(146, 13);
            this.label1.TabIndex = 22;
            this.label1.Text = "Upload start time (hh:mm:ss)";
            // 
            // NewBrikkesysComp
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(506, 290);
            this.Controls.Add(this.wizard1);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Name = "NewBrikkesysComp";
            this.Text = "New Brikkesys-connection";
            this.wizard1.ResumeLayout(false);
            this.wizardPage6.ResumeLayout(false);
            this.panelMonitorTop.ResumeLayout(false);
            this.wizardPage1.ResumeLayout(false);
            this.wizardPage1.PerformLayout();
            this.wizardPage5.ResumeLayout(false);
            this.wizardPage5.PerformLayout();
            this.wizardPage3.ResumeLayout(false);
            this.wizardPage3.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private Gui.Wizard.Wizard wizard1;
        private Gui.Wizard.WizardPage wizardPage1;
        private System.Windows.Forms.TextBox txtUser;
        private System.Windows.Forms.TextBox txtPort;
        private System.Windows.Forms.TextBox txtHost;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.TextBox txtPw;
        private System.Windows.Forms.Label label5;
        private Gui.Wizard.WizardPage wizardPage3;
        private System.Windows.Forms.Label label7;
        private Gui.Wizard.WizardPage wizardPage5;
        private System.Windows.Forms.TextBox txtCompID;
        private System.Windows.Forms.Label label9;
        private System.Windows.Forms.TextBox txtOrganizer;
        private System.Windows.Forms.Label organizer;
        private DBListBox lstDB;
        private System.Windows.Forms.TextBox txtIdOffset;
        private System.Windows.Forms.Label label16;
        private System.Windows.Forms.TextBox txtStartTime;
        private System.Windows.Forms.Label label1;
        private Gui.Wizard.WizardPage wizardPage6;
        private System.Windows.Forms.Panel panelMonitorTop;
        private System.Windows.Forms.Button btnMonitorStartStop;
        private System.Windows.Forms.ListBox listBoxMonitor;
    }
}