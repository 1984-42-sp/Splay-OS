# Splay OS Current Architecture

## Current Version

Stable base:

v0.6.3.2 Connection Selection Hotfix

## Current Form

Splay OS is currently a single-file HTML application.

Core technologies:

- HTML
- CSS
- JavaScript
- localStorage
- SVG for connection lines
- no external libraries

## Main Objects

### Workspace

A workspace is a project space.

Current fields:

- id
- name
- description
- icon
- accentColor

### Node

A node is the main unit of information.

Current types:

- Decision
- Task
- Note
- Memo
- Meeting
- File / Link

Common fields:

- id
- type
- workspaceId
- title
- x
- y
- w
- h
- shape
- radius
- z
- links
- connections
- data

### Connection

A connection represents meaning between nodes.

Current fields:

- id
- targetId
- type
- label
- fromAnchor
- toAnchor
- style

Connection types:

- related
- evidence
- task
- risk
- decision
- file
- memo

## Current Interaction Model

Supported:

- Node drag
- Node resize
- Node shape editing
- Object Editor
- Workspace Orb
- Splay Orb
- Alt + Drag connection creation
- Alt + connection click selection
- Delete selected connection
- Task importance
- Task due visual state
- localStorage autosave
- JSON export/import

## Known Architecture Notes

localStorage is browser-specific.
Data is not shared between Edge, Vivaldi, Chrome, etc.

Current import/export is technical and JSON-based.
It is useful for backup, but not useful as a human-readable output.

Future export should generate readable workspace summaries.
