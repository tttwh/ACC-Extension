# ACC - AI Conversation Curator

<div align="center">
  <img src="icons/icon128.png" alt="ACC Logo" width="100" height="100">
  <br>
  <b>Local-First Knowledge Management for AI Conversations</b>
  <br>
  <br>
</div>

## 📖 Introduction

**AI Conversation Curator (ACC)** is a Chrome Extension designed to bridge the gap between ephemeral AI chats and permanent knowledge bases. Unlike standard "Save as PDF" tools, ACC allows users to selectively save, tag, and index specific AI responses locally.

It features a unique **"Smart Positioning"** system that can restore the exact scroll position of a saved message within the original chat interface (ChatGPT, DeepSeek, etc.), even in dynamic Single Page Applications (SPAs).

## ✨ Key Features

* **⚡️ Smart Positioning System**:
    * **Tier 1**: Precise ID-based anchor linking (for ChatGPT).
    * **Tier 2**: Index-based positioning (Sequence tracking).
    * **Tier 3**: DNA/Text fingerprint matching (Fallback mechanism).
* **🔒 Privacy-First & Local**: Built on **IndexedDB**. No data is sent to external servers. All conversations remain on your device.
* **🎨 Modern Dashboard**:
    * Glassmorphism UI design.
    * Full **Dark Mode** support.
    * Local Mock Authentication system (Simulated Login/Lock screen).
* **🛠 Advanced Selection**:
    * **Floating Widget**: Select any text to save with auto-context detection.
    * **Injection Mode**: Save buttons injected directly into AI message bubbles.
* **⚡️ Performance**: Optimized with Vanilla JS (No heavy frameworks) and Virtual DOM techniques for list rendering.

## 🚀 Installation

1.  Clone this repository:
    ```bash
    git clone [https://github.com/YOUR_USERNAME/ACC-Extension.git](https://github.com/YOUR_USERNAME/ACC-Extension.git)
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the directory where you cloned this repository.

## 🛠 Tech Stack

* **Core**: Manifest V3, Service Workers
* **Language**: Vanilla JavaScript (ES6+)
* **Storage**: IndexedDB (Wrapped with custom `idb.js`)
* **Styling**: CSS3 (Variables, Flexbox/Grid)
* **Compatibility**: ChatGPT, DeepSeek, Kimi AI, Google AI Studio

## 📸 Screenshots

| Dashboard (Light) | Dashboard (Dark) |
|:---:|:---:|
| <img src="docs/screenshot_light.png" width="400"> | <img src="docs/screenshot_dark.png" width="400"> |

*(Note: You can upload your screenshots to a `docs` folder and link them here)*

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.