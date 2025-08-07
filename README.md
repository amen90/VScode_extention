# STM32 Package Manager

A Visual Studio Code extension that provides an interface similar to STM32Cube for VS Code, allowing you to import STM32 packages, select boards, and manage projects.

## Features

- **Package Import**: Browse and import STM32 packages from your filesystem
- **Board Selection**: Choose from available boards with visual previews
- **Project Templates**: Select and import project templates for your chosen board
- **Multiple Toolchains**: Support for various toolchains (GCC, Keil, IAR, STM32CubeIDE)
- **Project Management**: Easy project import and workspace setup

## Installation

1. Clone this repository to your local machine
2. Open the project in VS Code
3. Run `npm install` to install dependencies
4. Press `F5` to run the extension in a new Extension Development Host window

## Usage

### Opening the Package Manager

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "STM32: Import STM32 Package" or "STM32: Open Package Manager"
3. Select the command to open the package manager interface

### Importing a Package

1. Click the "Browse..." button next to the Repository field
2. Select your STM32 package folder (e.g., STM32Cube_FW_U5_V1.3.0)
3. The extension will analyze the package and populate available options

### Selecting a Board

1. After importing a package, select a board from the Board dropdown
2. If available, a board preview with image and description will be shown
3. The extension will automatically load available projects for the selected board

### Importing a Project

1. Select a project template from the Template dropdown
2. Enter a name for your project
3. Choose the location where you want to import the project
4. Click "Import" to create the project

## Supported Package Structure

The extension expects STM32 packages to follow the standard structure:

```
STM32Package/
├── Projects/
│   ├── BoardName1/
│   │   ├── ProjectName1/
│   │   └── ProjectName2/
│   └── BoardName2/
├── Examples/
│   ├── BoardName1/
│   └── BoardName2/
├── Applications/
└── package.pdsc (optional)
```

## Supported File Types

- **Package Descriptors**: `.pdsc`, `.xml`, `package.json`
- **Project Files**: Keil (`.uvprojx`), IAR (`.eww`), STM32CubeIDE, Eclipse (`.cproject`), Makefile
- **Board Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`

## Development

### Prerequisites

- Node.js (version 16 or higher)
- Visual Studio Code
- TypeScript

### Building

```bash
npm install
npm run compile
```

### Running

1. Open the project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window will open with the extension loaded

### Testing

The extension can be tested by:

1. Creating a mock STM32 package structure
2. Using the package manager to import and select components
3. Verifying that projects are correctly imported

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Changelog

### 0.0.1

- Initial release
- Basic package import functionality
- Board selection with preview
- Project template selection and import
- Support for multiple toolchains 