# Keyboard Shortcuts Guide

Zen Reporter provides comprehensive, single-key and contextual keyboard shortcuts across the interactive HTML report dashboard to navigate views, switch runs, inspect test failures, browse attachments, and control themes without requiring a mouse.

---

> **Tip**: Press <kbd>?</kbd> at any time outside a text input to open the built-in keyboard shortcuts cheatsheet modal directly in the dashboard.

---

## Global Navigation Shortcuts

These shortcuts are globally accessible from any tab in the report when no modal is open and focus is not inside an editable text field.

| Shortcut                     | Action         | Description                                                                                                                                                         |
| :--------------------------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <kbd>1</kbd> – <kbd>8</kbd>  | Jump to Tab    | Instantly jump to any navigation tab by its index (`1`: Overview, `2`: Suites, `3`: Failures, `4`: Files, `5`: Projects, `6`: Trends, `7`: Insights, `8`: History). |
| <kbd>[</kbd>                 | Previous Tab   | Switch to the previous tab in the sidebar navigation order.                                                                                                         |
| <kbd>]</kbd>                 | Next Tab       | Switch to the next tab in the sidebar navigation order.                                                                                                             |
| <kbd>\</kbd>                 | Toggle Sidebar | Toggle the sidebar between expanded (with labels) and collapsed (icons-only) states.                                                                                |
| <kbd>P</kbd> or <kbd>←</kbd> | Previous Page  | Navigate to the previous page in paginated tables (e.g. Files, History, Insights) or modals (Run Switcher).                                                         |
| <kbd>N</kbd> or <kbd>→</kbd> | Next Page      | Navigate to the next page in paginated tables or modals.                                                                                                            |
| <kbd>R</kbd>                 | Scroll to Top  | Smoothly scroll the main report viewport back to the top of the page.                                                                                               |
| <kbd>Z</kbd>                 | Documentation  | Open the official Zen Reporter website documentation in a new browser tab.                                                                                          |

---

## Search & Quick Actions

| Shortcut       | Action             | Description                                                                                                                                            |
| :------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>/</kbd>   | Run Switcher       | Open the **Switch Execution Run** modal to browse or search across historical test runs.                                                               |
| <kbd>Q</kbd>   | Quick Run Switcher | Open the **Switch Run** quick dropdown in the header to toggle between recent runs without leaving the active view.                                    |
| <kbd>F</kbd>   | Focus Search       | Jump focus directly into the contextual search or filter input on the active tab (e.g. Suites search, Failure filter, File search, or History search). |
| <kbd>G</kbd>   | Copy Commit SHA    | Copy the active test run's Git commit SHA to the clipboard with an interactive toast notification.                                                     |
| <kbd>B</kbd>   | Copy Branch        | Copy the active test run's Git branch name to the clipboard with a toast notification.                                                                 |
| <kbd>C</kbd>   | Config Generator   | Open the interactive Playwright Configuration Generator modal.                                                                                         |
| <kbd>?</kbd>   | Cheatsheet         | Display the keyboard shortcuts cheatsheet modal.                                                                                                       |
| <kbd>Esc</kbd> | Smart Escape       | Blurs active search/text inputs on the first press; closes open modals, menus, and overlays on subsequent press.                                       |

---

## Contextual & Tab-Specific Shortcuts

### Suites & Failures Tabs

When viewing the **Suites** or **Failures** tabs, quick expansion toggles streamline analyzing large suites or error clusters:

| Shortcut     | Action       | Description                                                                                                                                |
| :----------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>X</kbd> | Expand All   | Expands all test suites or error failure clusters on the current view. If all items are already expanded, the action is safely ignored.    |
| <kbd>S</kbd> | Collapse All | Collapses all test suites or error failure clusters on the current view. If all items are already collapsed, the action is safely ignored. |

> **Note**: The `X` and `S` shortcuts are scoped exclusively to the Suites and Failures tabs and do not trigger when viewing other tabs (such as Overview or Trends).

---

### Run Switcher (Quick Menu & Full Modal)

When switching between test runs using either the top header quick dropdown (<kbd>Q</kbd>) or the full run switcher modal (<kbd>/</kbd>):

| Shortcut                                                   | Action           | Description                                                                                                                                                                                         |
| :--------------------------------------------------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>Q</kbd>                                               | Quick Menu       | Open the **Switch Run** quick dropdown in the header to toggle between recent runs without leaving the active view.                                                                                 |
| <kbd>1</kbd> – <kbd>5</kbd>                                | Select Run       | Select the corresponding test run by its positional index on the current page or menu dropdown.                                                                                                     |
| <kbd>L</kbd>                                               | Latest Run       | Instantly jump to the `Latest` test run (`L` or `l`), displayed with a dedicated `<kbd>L</kbd>` badge. If already viewing the latest run, a toast notifies the user that the run is already active. |
| <kbd>F</kbd>                                               | Focus Run Search | In the Run Switcher modal, focus the run search input to filter by run name, date, branch, or commit.                                                                                               |
| <kbd>P</kbd> / <kbd>N</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Paging Runs      | In the Run Switcher modal, navigate between pages of historical runs.                                                                                                                               |
| <kbd>Esc</kbd>                                             | Dismiss          | Close the run switcher menu or modal.                                                                                                                                                               |

---

### Universal Attachment Previewer

When inspecting test case attachments, screenshots, traces, or standard output in the Universal Preview modal:

| Shortcut                     | Action            | Description                                                                              |
| :--------------------------- | :---------------- | :--------------------------------------------------------------------------------------- |
| <kbd>P</kbd> or <kbd>←</kbd> | Previous Artifact | View the previous attachment in the test case artifact carousel.                         |
| <kbd>N</kbd> or <kbd>→</kbd> | Next Artifact     | View the next attachment in the test case artifact carousel.                             |
| <kbd>F</kbd>                 | Find in Artifact  | When viewing text attachments or stdout/stderr logs, focus the inline filter search bar. |
| <kbd>Esc</kbd>               | Close / Blur      | Blurs the search input if focused; closes the attachment previewer on next press.        |

---

## Appearance & Themes

| Shortcut     | Action            | Description                                                                                                        |
| :----------- | :---------------- | :----------------------------------------------------------------------------------------------------------------- |
| <kbd>D</kbd> | Cycle Dark Mode   | Cycle dark mode states: **System Mode** (follows OS preferences) → **Light Mode** → **Dark Mode**.                 |
| <kbd>T</kbd> | Cycle Color Theme | Cycle between WCAG-accessible dashboard color palettes: **Sage** (Emerald) → **Lotus** (Rose) → **Oasis** (Amber). |

---

## Keyboard Accessibility Invariants

1. **Input Shielding**: Single-key shortcuts are never triggered while typing inside text inputs, text areas, `<select>` elements, or `contenteditable` containers.
2. **Modifier Key Isolation**: Holding <kbd>Ctrl</kbd>, <kbd>Cmd</kbd> (<kbd>⌘</kbd>), or <kbd>Alt</kbd> bypasses all dashboard shortcuts, ensuring native browser hotkeys (such as <kbd>Ctrl+R</kbd> or <kbd>Cmd+F</kbd>) function without interference.
3. **Smart Escape (`Esc`)**: When typing inside search or filter boxes in modals, pressing <kbd>Esc</kbd> first clears focus from the input back to the modal container. Pressing <kbd>Esc</kbd> again cleanly dismisses the modal.
4. **Case-Insensitive Input**: All letter shortcuts (such as <kbd>L</kbd>, <kbd>X</kbd>, <kbd>S</kbd>, <kbd>D</kbd>, <kbd>T</kbd>) operate case-insensitively, accepting both uppercase and lowercase keystrokes while being uniformly styled as uppercase badges across the UI.
