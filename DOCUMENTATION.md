# Flux Client - Documentation

**Version**: 1.1.0
**License**: AGPLv3
**Platform**: Windows, Linux, macOS

Flux Client is a modern, minimalist desktop Git GUI with multi-account support. It provides a unified interface for managing local Git repositories and GitHub cloud operations, featuring staging, committing, branching, pull requests, GitHub Actions, issues, an integrated terminal, command palette, and more.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Features](#features)
   - [Multi-Account Management](#1-multi-account-management)
   - [Repository Management](#2-repository-management)
   - [Changes Tab - Staging & Committing](#3-changes-tab---staging--committing)
   - [File Browser](#4-file-browser)
   - [Commit History](#5-commit-history)
   - [Branch Management](#6-branch-management)
   - [Cloud Repositories](#7-cloud-repositories)
   - [Pull Requests](#8-pull-requests)
   - [GitHub Actions](#9-github-actions)
   - [Issues](#10-issues)
   - [Settings](#11-settings)
   - [Integrated Terminal](#12-integrated-terminal)
   - [Activity Log](#13-activity-log)
   - [Command Palette](#14-command-palette)
   - [Macros](#15-macros)
   - [Time Machine (Reflog)](#16-time-machine-reflog)
   - [Conflict Resolution](#17-conflict-resolution)
   - [Tag Management](#18-tag-management)
   - [Theme Toggle](#19-theme-toggle)
   - [Auto-Updates](#20-auto-updates)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Data Flow & IPC Architecture](#data-flow--ipc-architecture)
8. [State Management](#state-management)
9. [Electron Services](#electron-services)
10. [Build & Release](#build--release)

---

## Architecture Overview

Flux Client follows a classic Electron architecture with a clear separation between the main process and the renderer process:

```
┌─────────────────────────────────────────────────────────┐
│                   Renderer Process                       │
│  React + TypeScript + Zustand + Tailwind CSS            │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐  │
│  │  Stores  │ │Components│ │   Hooks    │ │   Libs   │  │
│  └────┬─────┘ └─────┬────┘ └─────┬──────┘ └────┬─────┘  │
│       └─────────────┼───────────┼───────────────┘        │
│                     │    IPC Invoke / Send                │
├─────────────────────┼────────────────────────────────────┤
│                     │    Context Bridge (Preload)         │
├─────────────────────┼────────────────────────────────────┤
│                   Main Process                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐              │
│  │GitService │ │AuthService│ │GitHubSvc  │              │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘              │
│  ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐              │
│  │TerminalSvc│ │UpdaterSvc │ │RepoScanner│              │
│  └───────────┘ └───────────┘ └───────────┘              │
└─────────────────────────────────────────────────────────┘
         │                │                │
    Git CLI          GitHub API      File System
```

- **Renderer**: React app with Zustand state management, Tailwind CSS for styling, and Framer Motion for animations.
- **Main Process**: Electron main with six service classes handling Git operations, GitHub API calls, authentication, terminal management, repo scanning, and auto-updates.
- **Communication**: IPC (Inter-Process Communication) via Electron's `ipcMain.handle` / `ipcRenderer.invoke` pattern, exposed through a context bridge in the preload script.

---

## Technology Stack

| Category      | Technology                  | Purpose                              |
|---------------|-----------------------------|--------------------------------------|
| Runtime       | Electron 28.2.5             | Desktop application framework        |
| Frontend      | React 18.3.1                | UI component library                 |
| Language      | TypeScript 5.4.3            | Type-safe development                |
| Bundler       | Vite 5.2.6                  | Fast build tool with HMR             |
| Styling       | Tailwind CSS 3.4.1          | Utility-first CSS framework          |
| State         | Zustand 4.5.2               | Lightweight state management         |
| Animations    | Framer Motion 11.0.8        | Declarative animations               |
| Code Editor   | Monaco Editor 4.7.0         | Diff viewer and code display         |
| Terminal      | xterm.js 5.3.0 + node-pty   | Integrated terminal emulation        |
| Graphs        | ReactFlow 11.11.4           | Workflow visualization diagrams      |
| YAML          | js-yaml 4.1.1               | GitHub Actions YAML parsing          |
| Layout        | Dagre 0.8.5                 | Automatic graph layout               |
| Dates         | date-fns 4.1.0              | Date formatting and manipulation     |
| Icons         | Lucide React, React Icons   | UI iconography                       |
| Updates       | electron-updater 6.7.3      | Auto-update mechanism                |

---

## Project Structure

```
flux-client/
├── electron/                          # Main process
│   ├── main.ts                        # Window creation, IPC handlers, app lifecycle
│   ├── preload.ts                     # Context bridge (electronAPI)
│   └── services/
│       ├── auth.service.ts            # GitHub OAuth, encrypted token storage
│       ├── git.service.ts             # Git CLI wrapper (child_process.execFile)
│       ├── github.service.ts          # GitHub REST API client
│       ├── repo-scanner.service.ts    # Recursive git repo discovery
│       ├── terminal.service.ts        # PTY terminal management
│       └── updater.service.ts         # Auto-update lifecycle
│
├── src/                               # Renderer process
│   ├── main.tsx                       # React DOM entry point
│   ├── App.tsx                        # Root layout, keyboard shortcuts, IPC listeners
│   ├── index.css                      # Global styles, Tailwind imports
│   ├── electron.d.ts                  # TypeScript declarations for window.electronAPI
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AccountSidebar.tsx     # Left-most sidebar: account avatars + add/remove
│   │   │   ├── RepoSidebar.tsx        # Repository list, search, scan, sort
│   │   │   ├── MainView.tsx           # Tab bar, breadcrumb, tab router
│   │   │   ├── ActionBar.tsx          # Context-sensitive action buttons
│   │   │   ├── BottomTerminal.tsx     # xterm terminal integration
│   │   │   └── ActivityPanel.tsx      # Command execution log
│   │   │
│   │   ├── tabs/
│   │   │   ├── ChangesTab.tsx         # File staging, diff viewer, commit form
│   │   │   ├── FilesTab.tsx           # Repository file browser
│   │   │   ├── HistoryTab.tsx         # Commit log with details
│   │   │   ├── BranchesTab.tsx        # Branch list, create, merge, rebase, delete
│   │   │   ├── CloudReposTab.tsx      # GitHub repository browser
│   │   │   ├── SettingsTab.tsx        # Repository and app settings
│   │   │   ├── PullRequestsTab.tsx    # Pull request list and creation
│   │   │   ├── ActionsTab.tsx         # GitHub Actions workflows
│   │   │   └── IssuesTab.tsx          # GitHub issues viewer
│   │   │
│   │   ├── common/
│   │   │   ├── CommandPalette.tsx     # Ctrl+K command search interface
│   │   │   ├── CodeEditor.tsx         # Monaco-based code viewer
│   │   │   ├── DiffEditor.tsx         # Monaco-based diff viewer
│   │   │   ├── Modal.tsx             # Base modal component
│   │   │   ├── Button.tsx            # Reusable button
│   │   │   ├── Badge.tsx             # Status badge
│   │   │   ├── Avatar.tsx            # User avatar
│   │   │   ├── UpdateToast.tsx       # Update notification popup
│   │   │   ├── ErrorBoundary.tsx     # React error boundary
│   │   │   ├── PRStatus.tsx          # PR status indicator
│   │   │   └── ThemeToggle.tsx       # Dark/light mode switch
│   │   │
│   │   ├── modals/
│   │   │   ├── NewRepoModal.tsx       # Create or clone a new repository
│   │   │   ├── CloneModal.tsx         # Clone repository dialog
│   │   │   ├── CommitDetailsModal.tsx # Full commit detail view
│   │   │   ├── CreatePRModal.tsx      # Pull request creation form
│   │   │   ├── MacroEditorModal.tsx   # Command macro editor
│   │   │   ├── PublishRepoModal.tsx   # Publish local repo to GitHub
│   │   │   └── TimeMachineModal.tsx   # Reflog navigation and restore
│   │   │
│   │   ├── conflicts/
│   │   │   ├── ConflictPanel.tsx      # Merge conflict overlay
│   │   │   └── ConflictResolver.tsx   # Conflict resolution logic
│   │   │
│   │   ├── diff/
│   │   │   └── DiffViewer.tsx         # Raw diff display
│   │   │
│   │   ├── actions/                   # GitHub Actions sub-components
│   │   │   ├── ActionsView.tsx        # Main Actions layout
│   │   │   ├── WorkflowSidebar.tsx    # Workflow list sidebar
│   │   │   ├── WorkflowRunsList.tsx   # Run history list
│   │   │   ├── WorkflowRunDetails.tsx # Run detail with job logs
│   │   │   └── WorkflowEditor.tsx     # YAML workflow editor
│   │   │
│   │   └── workflow/                  # Visual workflow builder
│   │       ├── WorkflowVisualizer.tsx # ReactFlow diagram renderer
│   │       ├── NodePropertiesPanel.tsx# Node property editor
│   │       └── nodes/                # Custom ReactFlow node types
│   │
│   ├── stores/                        # Zustand state management
│   │   ├── ui.store.ts               # UI state (tabs, modals, notifications, theme)
│   │   ├── repo.store.ts            # Repos, git state, file statuses, commits
│   │   ├── account.store.ts         # Accounts, active account, tokens
│   │   ├── command-palette.store.ts # Command palette visibility, macros
│   │   ├── activity.store.ts        # Activity log entries
│   │   └── actions.store.ts         # GitHub Actions workflows and runs
│   │
│   ├── hooks/
│   │   ├── useGit.ts                # Git operation wrapper hook
│   │   └── useTerminal.ts           # Terminal lifecycle hook
│   │
│   └── lib/
│       ├── command-registry.ts      # Command registry with fuzzy search scoring
│       ├── default-commands.ts      # Built-in command definitions
│       ├── github-types.ts          # GitHub API TypeScript interfaces
│       ├── ipc.ts                   # IPC helper wrappers
│       ├── repo-utils.ts           # Repo-to-cloud matching utilities
│       ├── constants.ts            # App-wide constants
│       ├── workflow.layout.ts      # Dagre layout for workflow graphs
│       ├── yamlToGraph.ts          # YAML -> ReactFlow graph conversion
│       └── graphToYaml.ts          # ReactFlow graph -> YAML conversion
│
├── index.html                        # Vite entry HTML
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript config (renderer)
├── tsconfig.node.json               # TypeScript config (electron/node)
├── vite.config.ts                   # Vite build configuration
├── tailwind.config.js               # Tailwind theme and extensions
├── electron-builder.yml             # Electron Builder packaging config
├── .github/workflows/
│   ├── release.yml                  # CI/CD: build & release
│   └── Test.yml                     # CI: testing workflow
└── scripts/
    └── inject-env.js               # Build-time env injection
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Git** installed and available on PATH
- A **GitHub account** for cloud features

### Development

```bash
# Install dependencies
npm install

# Start development (Vite + Electron)
npm run electron:dev
```

This launches the Vite dev server on `http://localhost:5173` and opens Electron pointing to it, with DevTools auto-opened.

### Production Build

```bash
# Full build (TypeScript + Vite + Electron Builder)
npm run electron:build
```

Produces installers in the `release/` directory.

---

## Features

### 1. Multi-Account Management

**Components**: `AccountSidebar.tsx`, `account.store.ts`, `auth.service.ts`

Flux Client supports connecting multiple GitHub accounts simultaneously, enabling users to work across personal, work, and client projects without switching tools.

**How it works**:

- **Adding an account**: Clicking the "+" button in the left sidebar initiates a GitHub OAuth flow. The app registers a custom protocol handler (`gitflow://`) to capture the OAuth callback. Upon successful authentication, the account's username, avatar URL, and OAuth token are stored.

- **Token security**: OAuth tokens are encrypted at rest using AES-256-CBC encryption in the `auth.service.ts`. Tokens are stored in Electron's `userData` directory in an encrypted format and decrypted on demand when API calls require authentication.

- **Account types**: Each account can be categorized as `personal`, `work`, or `client`. The type is displayed as a color-coded dot on the avatar (green for personal, blue for work, amber for client).

- **Active account**: Clicking an avatar in the sidebar sets it as the active account. The active account is indicated by an animated indigo ring. The active account's token is used for all GitHub operations (push, pull, PR creation, etc.).

- **Removing accounts**: Right-clicking an account avatar opens a context menu with a "Remove Account" option. This removes the encrypted token from storage and removes the account from the store.

- **Persistence**: Accounts are loaded on app startup via `loadAccounts()`, which fetches stored accounts from the auth service and populates tokens for each.

---

### 2. Repository Management

**Components**: `RepoSidebar.tsx`, `repo.store.ts`, `repo-scanner.service.ts`

Repositories can be added through three methods: scanning a directory, cloning from GitHub, or creating a new one.

**Scanning for repos**:
- Click the scan button in the repo sidebar to choose a directory. The `RepoScannerService` recursively walks the directory tree looking for `.git` folders.
- Found repositories are de-duplicated against existing entries and added to the repo list.
- Repos display their name, current branch, and a dirty indicator (amber dot) if there are uncommitted changes.

**Repository list**:
- Repos are displayed in the collapsible left sidebar (240px wide, toggleable).
- Repos can be searched by name using the search field at the top.
- Repos are sorted by last-opened timestamp, with the most recently used at the top.
- Clicking a repo sets it as the active repository, which triggers automatic refresh of status, branches, and commit log.

**Persistence**:
- The repo list and active repo path are persisted to disk via Electron's `storage` IPC channel (key-value store in `userData`).
- On startup, saved repos and the last active repo are restored.

**Setting the active repo**:
- Switching repos resets all transient state (file statuses, commits, branches, diff).
- The `lastOpened` timestamp is updated.
- Cloud repos are auto-loaded if not already fetched (needed for Settings/PRs tabs).

---

### 3. Changes Tab - Staging & Committing

**Component**: `ChangesTab.tsx`

The Changes tab is the primary workspace for daily Git operations. It provides a split-pane view with a file list on the left and a diff viewer on the right.

**File status display**:
- Files are grouped into "Staged" and "Unstaged" sections.
- Each file shows its path and status with color-coded badges:
  - Green: Added/Untracked
  - Orange: Modified
  - Red: Deleted
  - Yellow: Renamed
  - Amber: Conflict

**Staging operations**:
- **Stage individual files**: Click the "+" icon next to an unstaged file.
- **Unstage individual files**: Click the "-" icon next to a staged file.
- **Stage all**: Button to stage all unstaged files at once.
- **Unstage all**: Button to unstage all staged files.

**Diff viewing**:
- Clicking a file loads its diff in the right panel.
- Uses Monaco Editor's diff viewer showing the original (HEAD) version alongside the modified (working tree) version.
- Supports syntax highlighting based on file extension (TypeScript, JavaScript, JSON, etc.).
- For new/untracked files, only the "modified" (new content) panel is populated.
- For deleted files, only the "original" (HEAD content) panel is populated.

**Committing**:
- A commit message textarea is provided at the bottom of the staged files section.
- **Commit only**: Commits staged changes locally without pushing.
- **Commit & Push**: Commits and immediately pushes to the remote using the active account's token. If the push fails (e.g., remote is ahead), the commit is preserved locally and the user is notified.
- If no GitHub account is linked, commits are made locally with an informational notification.
- The commit message is cleared only after a successful operation.

**Additional per-file actions**:
- **Discard changes**: Reverts a modified file to its HEAD state (`git checkout -- <file>`).
- **Clean file**: Removes an untracked file (`git clean -f <file>`).

---

### 4. File Browser

**Component**: `FilesTab.tsx`

The Files tab provides a read-only file browser for the active repository.

- Displays the repository's file tree with expandable directories.
- Files can be clicked to view their content in the Monaco code editor.
- Provides syntax highlighting for common file types.

---

### 5. Commit History

**Component**: `HistoryTab.tsx`, `CommitDetailsModal.tsx`

The History tab shows the commit log for the active repository.

**Commit log**:
- Displays up to 100 most recent commits.
- Each entry shows the short hash, commit message, author name, and relative date.
- Refs (branches, tags) are shown as badges next to relevant commits.

**Commit details**:
- Clicking a commit opens the `CommitDetailsModal` showing full commit information (hash, author, email, date, full message).
- From the details modal, users can:
  - **Cherry-pick** the commit onto the current branch.
  - **Checkout** the commit (detached HEAD).
  - **Revert** the commit.

**Commit operations** (available via Action Bar and Command Palette):
- **Undo last commit** (`git reset --soft HEAD~1`): Keeps changes staged.
- **Revert last commit** (`git revert HEAD`): Creates a new commit that undoes the last one.
- **Delete last commit**: Hard reset + force push (with confirmation dialog warning about data loss).
- **Squash commits**: Combines N recent commits into one with a new message.
- **Reword commit**: Changes the message of the most recent commit (`git commit --amend`).

---

### 6. Branch Management

**Component**: `BranchesTab.tsx`

The Branches tab provides comprehensive branch operations.

**Branch list**:
- Shows all local and remote branches.
- The current branch is highlighted.
- Each branch shows its last commit message.

**Operations**:
- **Create branch**: Opens an inline form to create a new branch from the current HEAD. The branch is automatically checked out after creation.
- **Checkout branch**: Switches to the selected branch. If there are uncommitted changes, they are automatically stashed before checkout and popped afterward.
- **Delete branch**: Deletes a local branch (with confirmation). Cannot delete the currently checked-out branch.
- **Delete remote branch**: Removes a branch from the remote repository.
- **Merge branch**: Merges the selected branch into the current branch. Auto-stashes/pops dirty changes. Notifies on success or conflict.
- **Rebase branch**: Rebases the current branch onto the selected branch. Auto-stashes/pops dirty changes.
- **Publish branch**: Pushes the current branch to the remote with the `-u` (set-upstream) flag, establishing tracking.

---

### 7. Cloud Repositories

**Component**: `CloudReposTab.tsx`

The Cloud tab connects to GitHub and displays all repositories accessible to the active account.

**Features**:
- Lists all repositories from the authenticated GitHub account.
- Shows repository metadata: name, description, visibility (public/private), language, stars, forks, last updated.
- Supports filtering/searching repos by name.

**Operations**:
- **Clone repository**: Opens a clone dialog where the user selects a destination directory. Cloning shows real-time progress messages. After cloning, the repo is auto-scanned and added to the local repo list.
- **Create new repository**: Opens the New Repo modal with three creation modes:
  - **Local only**: Initializes a `git init` in a selected directory with optional README creation.
  - **GitHub only**: Creates a repository on GitHub via the API.
  - **Both**: Creates locally, creates on GitHub, adds the remote, and pushes the initial commit.
- **Publish local repo**: For repos that exist locally but not on GitHub, creates the GitHub repository and links it.
- **Rename repository**: Renames a repository on GitHub.
- **Toggle visibility**: Switches a repository between public and private.
- **Sync fork**: For forked repositories, syncs with the upstream repository.

---

### 8. Pull Requests

**Component**: `PullRequestsTab.tsx`, `CreatePRModal.tsx`

The PRs tab provides pull request management for the active repository's corresponding GitHub repo.

**Viewing PRs**:
- Lists all open pull requests.
- Each PR shows: title, number, author, creation date, labels, and review status.
- PR status checks (CI/CD results) are displayed inline.

**Operations**:
- **Create PR**: Opens the `CreatePRModal` form where users specify:
  - Title and description (body)
  - Head branch (source) and base branch (target)
  - The PR is created via the GitHub API.
- **Checkout PR**: Fetches and checks out a PR's branch locally for testing/review.
- **View check runs**: Displays CI/CD check statuses for the PR's head commit.

**Repo matching**: The app matches the active local repository to its GitHub counterpart by comparing remote URLs, enabling automatic PR loading when switching repos.

---

### 9. GitHub Actions

**Components**: `ActionsTab.tsx`, `ActionsView.tsx`, `WorkflowSidebar.tsx`, `WorkflowRunsList.tsx`, `WorkflowRunDetails.tsx`, `WorkflowEditor.tsx`, `WorkflowVisualizer.tsx`

The Actions tab provides a comprehensive GitHub Actions management interface.

**Workflow browsing**:
- Lists all workflows defined in the repository's `.github/workflows/` directory.
- Shows workflow name, file path, and state (active/disabled).
- Selecting a workflow shows its run history.

**Run management**:
- Displays workflow runs with status (success, failure, in-progress, queued), triggering event, branch, duration, and timestamp.
- Clicking a run shows detailed information including:
  - Individual job breakdowns
  - Step-by-step execution logs
  - Timing information per step
- **Trigger workflow**: Manually dispatch a workflow run.
- **Cancel run**: Cancel an in-progress workflow run.
- **Re-run workflow**: Re-trigger a failed or completed run.

**Visual workflow editor**:
- Parses workflow YAML files and converts them to interactive ReactFlow diagrams using `yamlToGraph.ts`.
- Jobs are displayed as connected nodes with their steps listed inside.
- Nodes can be inspected via the `NodePropertiesPanel` for detailed configuration.
- Layout is automatically computed using the Dagre graph layout algorithm.
- Changes can be exported back to YAML via `graphToYaml.ts`.

---

### 10. Issues

**Component**: `IssuesTab.tsx`

The Issues tab displays GitHub issues for the active repository.

- Lists open issues with title, number, author, labels, and creation date.
- Issues are loaded via the GitHub API using the active account's token.
- Provides a read-only view for tracking work items alongside code.

---

### 11. Settings

**Component**: `SettingsTab.tsx`

The Settings tab provides configuration options for the active repository and the application.

**Repository settings** (when a repo is linked to GitHub):
- Repository description, visibility, default branch.
- Collaborator management.
- Branch protection rules.
- Danger zone operations (rename, transfer, delete).

**Application settings**:
- Git configuration (user.name, user.email).
- Editor preferences.
- Terminal settings.

---

### 12. Integrated Terminal

**Components**: `BottomTerminal.tsx`, `terminal.service.ts`, `useTerminal.ts`

Flux Client includes a fully functional terminal emulator in the bottom panel.

**Implementation**:
- Uses **node-pty** on the main process to spawn a real pseudo-terminal (PTY) session.
- Uses **xterm.js** on the renderer side for terminal rendering with a custom dark theme.
- Data flows bidirectionally via IPC: user keystrokes are sent to the PTY, and PTY output is streamed back to xterm.js.

**Features**:
- **Context-aware**: When a repository is active, the terminal automatically changes directory to the repo path.
- **Token injection**: The active GitHub account's token and username are injected into the terminal environment, enabling authenticated git operations directly from the terminal.
- **Resizable**: The terminal panel height is adjustable (default 320px).
- **Auto-fit**: The terminal automatically adjusts its column/row count when the window is resized using the xterm `FitAddon`.
- **Web links**: Clickable URLs in terminal output via the `WebLinksAddon`.
- **Toggle**: Show/hide with `Ctrl+J` or by clicking the terminal toggle bar.

**Lifecycle**:
- Terminal PTY is created when first expanded and persists across show/hide toggles.
- PTY exit events are streamed back to the renderer.
- Terminal is lazily loaded — xterm.js is not initialized until the panel is first opened.

---

### 13. Activity Log

**Components**: `ActivityPanel.tsx`, `activity.store.ts`

The Activity Log tracks all Git commands executed by the application.

**Features**:
- Displays a chronological list of commands with:
  - Command name and arguments
  - Repository path
  - Status (running, success, error)
  - Duration in milliseconds
  - Error messages for failed commands
- Commands are streamed in real-time via IPC events (`activity:command-start`, `activity:command-complete`).
- Maintains up to 500 entries in a circular buffer (oldest entries are dropped).
- Accessible via the bottom panel toggle bar (next to "Terminal") or `Ctrl+Shift+A`.

---

### 14. Command Palette

**Components**: `CommandPalette.tsx`, `command-registry.ts`, `default-commands.ts`

The Command Palette provides quick access to all app actions via a fuzzy-search interface, similar to VS Code's Command Palette.

**Opening**: Press `Ctrl+K` from anywhere in the app (works even when the terminal or an input field is focused).

**Fuzzy search algorithm**:
- Matches are scored by comparing the search query against the command's label, keywords, and category.
- Scoring weights: label matches are weighted highest, then keywords, then category.
- Results are sorted by score in descending order.
- Only commands whose `isAvailable()` check passes are shown (e.g., Git commands require an active repo).

**Built-in commands** (registered on app startup):

| Command | Category | Shortcut | Description |
|---------|----------|----------|-------------|
| Go to Changes | navigation | Ctrl+1 | Switch to Changes tab |
| Go to Files | navigation | Ctrl+2 | Switch to Files tab |
| Go to History | navigation | Ctrl+3 | Switch to History tab |
| Go to Branches | navigation | Ctrl+4 | Switch to Branches tab |
| Go to Cloud | navigation | Ctrl+5 | Switch to Cloud tab |
| Go to Settings | navigation | Ctrl+6 | Switch to Settings tab |
| Go to Pull Requests | navigation | Ctrl+7 | Switch to PRs tab |
| Go to Actions | navigation | Ctrl+8 | Switch to Actions tab |
| Go to Issues | navigation | Ctrl+9 | Switch to Issues tab |
| Stage All Files | git | — | Stage all unstaged files |
| Unstage All Files | git | — | Unstage all staged files |
| Push | git | — | Push to remote |
| Sync (Pull & Push) | git | Ctrl+P | Pull then push |
| Stash Changes | git | Ctrl+Shift+Z | Stash working directory |
| Pop Stash | git | — | Apply and drop latest stash |
| Undo Last Commit | git | — | Soft reset HEAD~1 |
| Revert Last Commit | git | Ctrl+Shift+R | Create a revert commit |
| Create Branch | git | Ctrl+B | Switch to branches tab and open create form |
| Toggle Terminal | view | Ctrl+J | Show/hide terminal panel |
| Show Activity Log | view | Ctrl+Shift+A | Open activity log panel |
| Open Macro Editor | tools | Ctrl+Shift+M | Open macro management |
| Open Time Machine | view | — | Open reflog navigator |
| Refresh | view | F5 | Refresh status, branches, and log |
| Toggle Sidebar | view | — | Collapse/expand repo sidebar |
| New Repository | repo | Ctrl+Shift+N | Open new repo modal |
| Publish Branch | repo | Ctrl+Shift+P | Push branch with -u flag |

---

### 15. Macros

**Components**: `MacroEditorModal.tsx`, `command-palette.store.ts`

Macros allow users to record sequences of commands and replay them as a single action.

**Creating macros**:
- Open the Macro Editor via `Ctrl+Shift+M` or the Command Palette.
- Define a macro with:
  - **Name**: Display label for the macro.
  - **Steps**: Ordered list of commands to execute (selected from the command registry).
- Macros are saved to persistent storage and loaded on app startup.

**Executing macros**:
- Macros appear in the Command Palette alongside built-in commands.
- Running a macro executes each step sequentially.

**Use cases**: Automate repetitive workflows like "stage all → commit → push" or "stash → checkout main → pull → checkout feature → pop stash".

---

### 16. Time Machine (Reflog)

**Components**: `TimeMachineModal.tsx`, repo store's `loadReflog` / `restoreToReflog`

The Time Machine provides access to Git's reflog, enabling recovery from destructive operations.

**How it works**:
- Opens a modal showing the last 100 reflog entries.
- Each entry displays:
  - Short hash
  - Action type (commit, checkout, rebase, reset, etc.)
  - Description
  - Relative date
- Clicking "Restore" on an entry performs `git reset --hard <hash>`, moving HEAD to that point in history.
- After restoration, status, branches, and log are automatically refreshed.

**Accessible via**: Command Palette ("Open Time Machine") or the Action Bar.

---

### 17. Conflict Resolution

**Components**: `ConflictPanel.tsx`, `ConflictResolver.tsx`

When a sync/pull/merge operation results in merge conflicts, the Conflict Panel automatically appears as a full-screen overlay.

**Features**:
- Lists all files with conflicts.
- For each conflicted file, provides two resolution strategies:
  - **Ours**: Accept the current branch's version (`git checkout --ours`).
  - **Theirs**: Accept the incoming branch's version (`git checkout --theirs`).
- After resolving a file, it is automatically staged and the status refreshes.
- Successful resolution shows a notification and the conflict panel auto-dismisses when all conflicts are resolved.

**Trigger**: Conflict detection happens during `syncRepo()` — if the sync result includes a `conflicts` array, the UI store's `showConflicts()` is called, displaying the overlay.

---

### 18. Tag Management

**Available in**: `HistoryTab.tsx` (or via the repo store)

Git tags can be managed directly within the app.

**Operations**:
- **Create tag**: Create an annotated or lightweight tag at a specific commit or HEAD.
- **Push tag**: Push a tag to the remote repository.
- **Delete tag**: Remove a tag locally.
- **List tags**: View all tags with their dates, messages, and associated commit hashes.

---

### 19. Theme Toggle

**Component**: `ThemeToggle.tsx`, `ui.store.ts`

Flux Client supports dark and light themes.

- Toggle is located in the top-right of the title bar.
- Default theme is dark.
- Theme is applied by toggling the `dark` class on the `<html>` element, leveraging Tailwind CSS's dark mode variant.
- The custom color palette adapts based on the active theme:
  - **Dark**: Deep gray surfaces (#09090b to #27272a), white text.
  - **Light**: Corresponding lighter values.

---

### 20. Auto-Updates

**Components**: `UpdateToast.tsx`, `updater.service.ts`

Flux Client supports automatic updates via `electron-updater`.

**Flow**:
1. On app launch, the `UpdaterService` checks for available updates from the configured GitHub Releases feed.
2. If an update is available, a toast notification appears at the bottom of the screen.
3. The update is downloaded in the background.
4. The user can choose to install and restart, or dismiss the notification.
5. Update events (checking, available, downloaded, error) are streamed to the renderer via IPC.

---

## Keyboard Shortcuts

### Global Shortcuts (work everywhere, including inside the terminal)

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette |
| `Ctrl+J` | Toggle Terminal |

### App Shortcuts (disabled inside terminal and text inputs)

| Shortcut | Action |
|----------|--------|
| `F5` | Refresh (status, branches, log) |
| `Ctrl+1` through `Ctrl+9` | Switch to tab 1-9 |
| `Ctrl+,` | Open Settings tab |
| `Ctrl+P` | Quick Sync (pull + push) |
| `Ctrl+B` | Create new branch |
| `Ctrl+Shift+N` | New repository modal |
| `Ctrl+Shift+S` | Full sync (pull + push) |
| `Ctrl+Shift+P` | Publish branch to remote |
| `Ctrl+Shift+Z` | Stash changes |
| `Ctrl+Shift+R` | Revert last commit |
| `Ctrl+Shift+A` | Toggle Activity Log panel |
| `Ctrl+Shift+M` | Open Macro Editor |

### Input Exceptions

- `Ctrl+Enter` passes through when inside text inputs (used for submitting commit messages).
- All other keyboard shortcuts are suppressed when focus is in an `<input>` or `<textarea>`.

---

## Data Flow & IPC Architecture

### IPC Channel Categories

All communication between the renderer and main process goes through typed IPC channels:

| Prefix | Purpose | Examples |
|--------|---------|---------|
| `window:*` | Window control | `minimize`, `maximize`, `close` |
| `auth:*` | Authentication | `login`, `getToken`, `getAccounts`, `removeAccount` |
| `repo:*` | Repo scanning | `scan` |
| `git:*` | Git operations | `status`, `stage`, `commit`, `push`, `pull`, `sync`, `branch`, `merge`, `rebase`, `stash`, `diff`, `log`, `blame`, `reflog`, `cherryPick`, `squashCommits`, `rewordCommit`, `clone`, `init`, etc. |
| `github:*` | GitHub API | `listRepos`, `createRepo`, `getPullRequests`, `createPullRequest`, `listWorkflows`, `listWorkflowRuns`, `triggerWorkflow`, `listIssues`, etc. |
| `terminal:*` | Terminal PTY | `create`, `write`, `resize`, `kill`, `onData`, `onExit` |
| `update:*` | Auto-updates | `check`, `download`, `install`, events |
| `storage:*` | Persistence | `get`, `set` |
| `shell:*` | External actions | `openExternal`, `openPath` |
| `fs:*` | File operations | `readFile`, `writeFile`, `checkFileExists` |
| `dialog:*` | Native dialogs | `openDirectory` |

### Request Flow Example (Committing)

```
User clicks "Commit & Push"
  → ChangesTab.tsx calls repo.commitAndPush(message)
  → repo.store.ts invokes api().git.commit(path, message)
  → preload.ts electronAPI.git.commit → ipcRenderer.invoke('git:commit', path, msg)
  → main.ts ipcMain.handle('git:commit') → gitService.commit(path, msg)
  → git.service.ts spawns `git commit -m "msg"` via child_process.execFile
  → Result returns through the chain
  → repo.store.ts refreshes status and log
  → React components re-render via Zustand subscriptions
```

---

## State Management

Flux Client uses **Zustand** for state management with five independent stores:

### `ui.store.ts` — UI State
- Active tab (`changes`, `files`, `history`, `branches`, `cloud`, `settings`, `pull-requests`, `actions`, `issues`)
- Theme (dark/light)
- Sidebar collapsed state
- Terminal expanded state and height
- Selected file for diff viewing
- Commit message text
- Loading states (committing, syncing)
- Conflict panel visibility and file list
- Modal state (generic type + data pattern)
- Notification toasts (auto-dismiss after 4 seconds)
- Bottom panel mode (terminal vs activity)

### `repo.store.ts` — Repository State
- Repository list with metadata (name, path, branch, remoteUrl, dirty, lastOpened)
- Active repository path
- File statuses (path, status, staged)
- Commit log (hash, message, author, date, refs)
- Branch list (name, current, remote)
- Tags list
- Diff context (original/modified content for Monaco)
- Blame data
- Reflog entries
- Cloud repos from GitHub
- Pull requests and issues
- Clone progress
- All Git operation methods (50+ actions)

### `account.store.ts` — Account State
- Account list (id, username, avatarUrl, label, type, token)
- Active account ID
- CRUD operations for accounts
- Loads encrypted tokens on startup

### `command-palette.store.ts` — Command Palette State
- Open/closed visibility
- Search query
- Macro definitions
- Macro editor state
- Macro persistence (load/save)

### `activity.store.ts` — Activity Log State
- Entry list (command, status, duration, error)
- Add/update entry methods
- 500-entry circular buffer

### `actions.store.ts` — GitHub Actions State
- Workflows list
- Workflow runs
- Selected workflow/run
- Run details (jobs, steps, logs)
- Loading states

---

## Electron Services

### GitService (`electron/services/git.service.ts`)

Wraps the Git CLI using `child_process.execFile` for safe, non-shell command execution.

**Key implementation details**:
- **Token injection**: Uses the `GIT_ASKPASS` mechanism — creates a temporary script that echoes the OAuth token when Git asks for credentials. This avoids embedding tokens in remote URLs.
- **Cross-platform**: Handles both Unix and Windows paths, and uses platform-appropriate credential helpers.
- **Activity tracking**: Every command execution emits `activity:command-start` and `activity:command-complete` IPC events for the Activity Log.
- **Operations**: status, stage, unstage, commit, push (with optional force), pull, sync (pull+push with conflict detection), branch, checkout (with create flag), merge, rebase, stash/pop, diff, log, blame, reflog, clone (with progress), init, tag CRUD, cherry-pick, squash, reword, reset (soft/hard), revert, discard, clean, and more.

### AuthService (`electron/services/auth.service.ts`)

Handles GitHub OAuth authentication and secure token storage.

- **OAuth flow**: Opens a browser window to GitHub's OAuth authorization URL with the configured client ID. Captures the callback via the `gitflow://` custom protocol. Exchanges the authorization code for an access token via GitHub's token endpoint using the client secret.
- **Encryption**: Tokens are encrypted using Node.js `crypto` module with AES-256-CBC algorithm. A machine-specific encryption key is derived from app metadata.
- **Storage**: Encrypted tokens and account metadata are stored as JSON files in Electron's `userData` directory.

### GitHubService (`electron/services/github.service.ts`)

A pure HTTPS client for the GitHub REST API v3.

- Makes raw HTTPS requests to `api.github.com`.
- Handles pagination for large result sets.
- Supports: repository CRUD, pull request management, issue listing, check runs, workflow management, fork synchronization, collaborator management, and branch protection.
- Authentication via `Authorization: Bearer <token>` header.

### TerminalService (`electron/services/terminal.service.ts`)

Manages pseudo-terminal (PTY) instances using `node-pty`.

- Creates PTY processes with configurable shell, columns/rows, and environment.
- Supports multiple concurrent terminal instances (identified by ID).
- Streams data bidirectionally via IPC channels.
- Injects GitHub credentials and repo context into the terminal environment.
- Handles terminal resize events.
- Cleans up PTY processes on window close or app exit.

### RepoScannerService (`electron/services/repo-scanner.service.ts`)

Discovers Git repositories within a directory tree.

- Recursively walks directories looking for `.git` folders.
- Extracts repository metadata (name, current branch, last commit) using the GitService.
- Returns an array of `RepoInfo` objects for the renderer to consume.
- Skips common non-project directories (`node_modules`, `.git`, etc.) for performance.

### UpdaterService (`electron/services/updater.service.ts`)

Manages the application update lifecycle using `electron-updater`.

- Checks for updates from GitHub Releases.
- Downloads updates in the background.
- Notifies the renderer of update events (checking, available, not-available, downloaded, error).
- Supports user-initiated install-and-restart.

---

## Build & Release

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server only |
| `npm run build:electron` | Compile electron/ TypeScript + inject env vars |
| `npm run build` | Full build: TypeScript + Vite bundle + electron build |
| `npm run electron:dev` | Development mode: Vite + Electron with HMR |
| `npm run electron:build` | Production build: full build + Electron Builder packaging |
| `npm run lint` | ESLint on src/ and electron/ |

### Electron Builder Configuration

- **App ID**: Configurable in `electron-builder.yml`
- **Windows**: NSIS installer
- **Linux**: AppImage + .deb packages
- **Auto-update**: GitHub provider for update feed
- **Assets**: Icons and resources from `resources/` directory

### CI/CD Pipeline (`.github/workflows/release.yml`)

- **Trigger**: Git tags matching `v*` pushed to `main` or `master`.
- **Build matrix**: Windows and Linux.
- **Steps**: Checkout → Setup Node → Install dependencies → Build → Package → Create GitHub Release with artifacts.
- **Secrets**: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for OAuth configuration.

---

## Window Configuration

- **Frameless window**: Uses `frame: false` with custom titlebar overlay.
- **Title bar**: Matches the app's dark theme (`#09090b` background, `#a1a1aa` symbol color).
- **Dimensions**: Default 1400x900, minimum 1000x600.
- **Security**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (required for node-pty).
- **Single instance**: The app enforces single-instance mode to properly handle OAuth callbacks.
- **Protocol**: Registers `gitflow://` as a custom protocol for OAuth redirect handling.
