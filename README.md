# LiveRes
LiveRes is a client-server system for publishing live results from sport events. The web frontend is published here: http://liveres.freidig.idrett.no. For instructions and other questions, please contact: Pål Kittilsen, pal.kittilsen@gmail.com

This project is forked from Peter Löfås's [liveresults](https://github.com/petlof/liveresults). 

New features compared to origin project:

* Interface to eTiming with support of individual, mass start, chase start, relay, lap time race. Radio control setup is read from eTiming. Supports both Access and SQL server 
* Responsive web design (mobile friendly). Selecctable scroll or auto hide of columns if to narrow view
* Shows live ranking number on approaching intermediate time and in finish with difference to current leader
* Highlight single intermediate times (not just whole row)
* Single or double row view
* Relay and chase start views. Total time and leg times (with ranking number is shown)
* Supports classes with no show time or no ranking
* Bib number column and sorting
* Last update time view
* Norwegian language support
* Radio view for organizer (all with filter option):
   * Live scroll of finish
   * Live scroll of any selected radio control or all radio controls in one view
   * Start view showing line up for start. Integrated message system for communication with race admin
   * Left in forest function
* Admin page:
   * Configurable higlight duration
   * One or two line view by default
   * Tenth of second resolution
   * Mass start view
   * Qualification limits globally or by class names




