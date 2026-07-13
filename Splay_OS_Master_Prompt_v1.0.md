# Splay OS Master Prompt v1.0

## Purpose

This document is the canonical master prompt for continuing Splay OS
development across new chats.

## Vision

Splay OS is a browser-based spatial thinking environment for decision
making. One state powers: - Desktop Spatial Canvas - Mobile View -
Snapshot Export - Cloud Edition

Never fork the data model.

------------------------------------------------------------------------

# Core Principles

1.  Single Source of Truth

-   Shared state
-   Shared schema
-   Shared rendering rules

2.  Preview First Development always targets:

`release/preview/splay_os_preview.html`

Promotion only occurs through:

`python main.py`

Pipeline:

preview → stable → docs

------------------------------------------------------------------------

# Architecture

Cloud Edition - Supabase Auth - Cloud Save/Load - Offline Cache -
Realtime - Conflict Resolution

Desktop - Spatial Canvas - Orb - Minimap - Focus View

Mobile - Live Mobile View - Shared Cloud State - No separate schema

Snapshot Export - Read-only HTML snapshot - Independent from Mobile View

------------------------------------------------------------------------

# Security

Always preserve: - CSP - HTML escaping - Attribute escaping - Safe URL
validation - Import validation - Prototype pollution protection -
Runtime-only state exclusion - RLS (`auth.uid() = user_id`)

Never introduce: - eval - new Function - document.write - unsafe URL
execution

------------------------------------------------------------------------

# Coding Rules

-   Minimal changes
-   Preserve backward compatibility
-   Do not redesign without evidence
-   Maintain Desktop behavior
-   Mobile improvements must not change schema

------------------------------------------------------------------------

# Release Rules

Only edit preview.

Never edit stable directly.

Before completion:

-   node --check
-   git diff --check
-   python -B main.py --dry-run

User alone executes:

python main.py

------------------------------------------------------------------------

# Mobile Development Rules

The goal is not redesign.

The goal is improving issues confirmed on real iPhone devices.

Workflow:

1.  Collect real-device issues
2.  Prioritize
3.  Fix one issue
4.  Verify
5.  Regression test
6.  Repeat

Do not batch unrelated UI changes.

------------------------------------------------------------------------

# Desktop Protection

Never regress:

-   Canvas
-   Node editing
-   Minimap
-   Orb
-   Focus View
-   Import/Export
-   Cloud Save
-   Realtime

------------------------------------------------------------------------

# Testing Checklist

Desktop - Login - Canvas - Cloud - Realtime

Mobile - Safe Area - Keyboard - Overview - Navigation - Detail -
Responsive widths

Cross-device - Desktop ↔ Mobile sync - Offline recovery - Conflict
handling

------------------------------------------------------------------------

# Long-term Roadmap

1.  Mobile UI refinement
2.  Shared workspace features
3.  Collaboration
4.  Presence
5.  Comments
6.  Permissions
7.  Public publishing

------------------------------------------------------------------------

# New Chat Startup

At the beginning of every new thread:

1.  Read this master prompt.
2.  Ask the user for newly observed issues from real iPhone usage.
3.  Convert observations into a prioritized issue list.
4.  Implement one issue at a time.
5.  Verify before moving on.

This document is the canonical development guide for Splay OS.
