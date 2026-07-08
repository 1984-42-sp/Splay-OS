# Splay OS Development Rules for AI

## Base Rule

Do not change existing behavior unless explicitly requested.

Splay OS is now a long-term project.
Every change must preserve stability.

## Change Management

When asking an AI to modify Splay OS, always specify:

- current base version
- exact target version
- purpose of the change
- allowed changes
- prohibited changes
- quality checks
- output filename

## Prohibited by Default

Unless explicitly requested, do not change:

- existing UI layout
- Orb behavior
- Workspace behavior
- Node drag
- Node resize
- Object Editor
- Shape Inspector
- Connection structure
- localStorage key
- JSON export/import
- existing CSS design
- existing keyboard shortcuts

## Preferred Implementation Style

Use additive extension.

Prefer:

- adding small functions
- adding small CSS classes
- reusing existing functions
- preserving data compatibility

Avoid:

- full rewrites
- broad refactoring
- renaming core functions
- changing storage schema without migration
- redesigning UI without permission

## Versioning

Use semantic-style project versions:

- v0.6.x for current single-file engine development
- v0.7.x for spatial/group/layer foundation
- v1.0.0 for stable daily-use release

Every stable release should be committed to Git and tagged.

Example:

git tag v0.6.3.2
git push origin v0.6.3.2

## AI Prompt Template

When asking AI for implementation:

1. State the base file.
2. State the exact target version.
3. Say that unrequested changes are prohibited.
4. List features to implement.
5. List protected existing features.
6. Require full HTML output.
7. Require JS syntax check.
8. Require manual behavior checklist.

## Current Priority

Next target:

v0.6.4 Selection / Group Engine

Core features:

- multi-select
- batch move
- batch delete
- move selected nodes to another workspace
- group nodes
- group move
