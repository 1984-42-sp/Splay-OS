# Splay OS Roadmap

## v0.6.4 Selection / Group Engine

Goal:
Make nodes controllable as multiple objects.

Planned features:

- multi-select nodes
- rectangle selection
- shift-click selection
- selected node highlight
- batch move
- batch delete
- move selected nodes to another workspace
- group nodes by overlap or command
- move group as one unit
- ungroup

Important rule:
Do not break existing node drag, resize, shape editor, connection editor, or workspace behavior.

## v0.6.5 Workspace Summary Export (HTML)

Goal:
Make workspace contents readable outside Splay OS in a mobile-responsive format.

Planned export:
- HTML export (Summary Report)
- one workspace at a time
- mobile-readable and print-friendly
- Decision list
- Task list
- Memo list
- File list
- Connection summary

Recommended file format:
.html

Reason:
- readable on smartphone and any browser without extra tools
- print-friendly (easy to print or save as PDF)
- lighter and faster than full app HTML
- more human-friendly than JSON

Import should not be changed in this phase.

## v0.6.6 Summary HTML Export / Summary Report

Goal:
Export workspace contents as a standalone, lightweight, mobile-responsive HTML report, and manage exported reports within Splay OS.

Planned features:
- Standalone HTML summary export for active workspace.
- Structured presentation of Decisions, Tasks, Memos, Files, and Connections.
- Responsive, mobile-friendly design with print-friendly CSS.
- Summary Report Index/List managed inside Splay OS (viewing, deleting, regenerating).
- Metadata of generated summaries persisted in localStorage.

## v0.6.7 Visual Atmosphere

Goal:
Improve visual atmosphere without reducing readability.

Planned changes:
- dark background tone-up
- black to charcoal gray
- subtle star particles
- very light sparkle effect
- no excessive animation
- maintain text readability

3D visual style should be postponed.

## v0.7.0 Spatial OS Foundation

Goal:
Move toward a spatial thinking environment.

Planned direction:
- stronger canvas feel
- grouped spaces
- layers
- object focus mode
- 2.5D depth
- possible future 3D-style background

Do not rush full 3D.
The priority is operational stability.
