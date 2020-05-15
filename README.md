# LiveRes
LiveRes is a client-server system for publishing live results from sport events. The web frontend is published here: http://liveres.freidig.idrett.no. For instructions and other questions, please contact: Pål Kittilsen, pal.kittilsen@gmail.com

This project is forked from Peter Löfås's [liveresults](https://github.com/petlof/liveresults). 

New features compared to origin project:

* Interface to eTiming with support of individual, mass start, chase start, relay, lap time race. Radio control setup is read from eTiming and automatically configured. Supports both Access and SQL server 
* Responsive web design (mobile friendly). Selecctable scroll or auto hide of columns if too narrow view
* Shows live rank number on approaching intermediate time and in finish with live difference to current leader
* Highlight single intermediate times (not just whole row) if race with radio controls
* Single or double row view
* Relay and chase start views. Total time and leg times (with ranking number)
* Supports classes with no-time show or no-rank
* Column for bib number with optional sorting
* Last-update-time view
* Norwegian language support
* Radio view for organizer (all with filter option):
   * Live scroll of finish
   * Live scroll of any selected radio control or all radio controls in a single view
   * Start view showing line up for start. Integrated message system for communication with race admin
   * Left in forest function
* Admin page:
   * Configurable highlight duration
   * Select one or two lines view by default
   * Tenths of seconds resolution
   * Mass start rakning
   * Global qualification limit or seperate limits by class names
   
![Mobile view](Doc/LiveResiPhone.png?raw=true "Example of mobile view")
![Class view](Doc/classview.png?raw=true "Example of class view")


