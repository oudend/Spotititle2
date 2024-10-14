# Spotititle 2

Spotititle is a Tauri-based application designed to display realtime song lyrics in a subtitle window. It uses a [SP DC token](#get-the-sp-dc-token) that allows the backend to fetch the current song playing and its corresponding lyrics. The app consists of two windows: one for configuring settings, and handling the SP DC token, and another to display the subtitles.

> Spotititle 2 is a feature-complete upgrade of a C++ project called [Spotititle](https://github.com/oudend/spotititle).

![Demo](./assets/images/demo.gif)
![Home](./assets/images/home.png)
![Settings](./assets/images/settings.png)

### Table of Contents

- [Get the SP DC Token](#get-the-sp-dc-token)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Build](#build)
- [Usage](#usage)
- [Directory Structure](#directory-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Get the SP DC Token

To obtain the `sp_dc` token on _chrome_, follow these steps:

1. **Open an Incognito Window:**

   - Go to [Spotify Web](https://open.spotify.com) and log in with your Spotify credentials.

2. **Open Developer Tools:**

   - Right-click anywhere on the page and select `Inspect`, or press `F12` to open the browser’s Developer Tools.

3. **Navigate to the Application Tab:**

   - In the Developer Tools window, select the `Application` tab at the top.

4. **Locate the Cookie:**

   - From the left sidebar, expand `Storage > Cookies > open.spotify.com`.
   - Look for a cookie named `sp_dc`.

5. **Copy the Token:**

   - Right-click on the `sp_dc` cookie, then copy its value.

6. **Important:**
   - **Do not log out** of Spotify in that window after copying the token. Logging out will invalidate the cookies.
7. **Close the Incognito Window:**
   - Safely close the window once the token is copied.

## Prerequisites

Ensure that you have the following installed:

- [Node.js](https://nodejs.org/) (version 16 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Rust](https://www.rust-lang.org/) (required for Tauri)
- [Tauri CLI](https://tauri.app/)

You can install Tauri CLI by running:

```bash
cargo install tauri-cli
```

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/oudend/Spotititle2.git
   ```

2. Navigate to the project directory:

   ```bash
   cd spotititle
   ```

3. Install the dependencies:

   Using npm:

   ```bash
   npm install
   ```

   Using yarn:

   ```bash
   yarn install
   ```

## Development

To run the app in development mode:

```bash
npx tauri dev
```

This will start the development server with hot reloading for the React components and the Tauri app.

## Build

To build the app for production:

```bash
npx tauri build
```

The build artifacts will be generated in the `src-tauri/target/release/` directory.

## Usage

You can download the latest version of Spotititle from the [Releases](https://github.com/oudend/Spotititle2/releases) page.

1. Launch the app.
2. In the **Main Window**, input your SP DC token.
3. Once authenticated, the app will start displaying the current song and lyrics in the **Subtitles Window**.

## Directory Structure

```bash
.
├── src/                   # React app source code
├── src-tauri/             # Tauri-related files
│   ├── src/               # Rust source code for Tauri app
│   ├── tauri.conf.json    # Tauri configuration
├── public/                # Static assets for the React app
└── README.md              # Project documentation
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature/bugfix.
3. Commit your changes and push the branch to your fork.
4. Open a pull request.

### Before Submitting a Pull Request:

- Run the project locally to test your changes.

## License

This project is licensed under the Mozilla Public License Version 2.0 License. See the [LICENSE](LICENSE) file for more details.

## Contact

If you have any questions, feel free to open an issue or contact me on Discord: `@oudend`.
