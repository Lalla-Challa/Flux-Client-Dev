# Flux Client

> **A modern, minimalist Desktop Git GUI built for speed and simplicity.**

Flux Client is a powerful, cross-platform Git client designed to streamline your development workflow. Built with Electron, React, and TypeScript, it combines a beautiful dark-mode interface with robust Git features, making complex operations intuitive and fast.

![License](https://img.shields.io/badge/license-AGPLv3-blue.svg)
![Version](https://img.shields.io/badge/version-1.1.2-green.svg)

## ✨ Features

- **🔐 Multi-Account Support**: seamless switching between Personal, Work, and Client GitHub accounts.
- **📈 Visual Git Graph**: Interactive commit history visualization to track branches and merges effortlessly.
- **⚡ Visual Workflow Editor**: Drag-and-drop CI/CD pipeline builder using React Flow.
- **🚀 GitHub Actions Dashboard**: Monitor, cancel, and re-run workflows directly from the app.
- **🤖 Omnipotent AI Agent**: An intelligent, context-aware assistant (powered by Groq & LLaMA 3.3) that can control the UI, run terminal commands, and visually build GitHub Actions workflows.
- **📝 Monaco-Powered Diff Viewer**: Syntax-highlighted code editor and diff viewer with inline blame.
- **💻 Integrated Terminal**: Context-aware terminal (xterm.js) that injects the correct Git credentials for the active profile.
- **🛡️ Merge Conflict Resolver**: One-click conflict resolution (Accept Theirs / Keep Yours).
- **☁️ Cloud Repos Management**: Clone, create, and manage repository visibility without leaving the app.

## 🛠 Tech Stack

- **Core**: [Electron](https://www.electronjs.org/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Terminal**: [xterm.js](https://xtermjs.org/) + [node-pty](https://github.com/microsoft/node-pty)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/GitFlow/flux-client.git
    cd flux-client
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Run the development server**

    Start the React renderer and Electron main process concurrently:

    ```bash
    npm run electron:dev
    ```

    The app should launch automatically.

## 📦 Building for Production

To create a production-ready installer for your OS (Windows, macOS, or Linux):

```bash
npm run electron:build
```

The output (installer/executable) will be in the `release/` directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3) - see the [LICENSE](LICENSE) file for details.
