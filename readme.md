# coc-metals

WIP [coc.nvim](https://github.com/neoclide/coc.nvim) extension for [Metals](http://scalameta.org/metals/), the Scala Language Server.

This extension is meant to mimic the functionality provided by the [metals-vscode](https://github.com/scalameta/metals-vscode)extension.

## Requirements

Java 8 or 11 provided by OpenJDK or Oracle. Eclipse OpenJ9 is not supported, please make sure the JAVA_HOME environment variable points to a valid Java 8 or 11 installation.

You'll need to have [coc.nvim](https://github.com/neoclide/coc.nvim) installed.

## Quick Start

1. Install this extension by running:

```
:CocInstall coc-metals
```

Following the installation of the extension, you simply need to open up your scala project from the root of the project.
Then upon entering your `build.sbt` or any scala file, a few check will automatically be done.

1. Ensure that you have a valid Java installation
2. Ensures you have the most up to date Metals version listed in your config, or it will default to the latest stable release
3. If Metals is not available, it will download Metals

After the download, Metals will automatically start. At this point you should see the prompt to import your build.

### Troubleshooting

Again, this is currently a work in progress and many thing are not implemented yet. It's recommend to manually set up Metals with [coc.nvim](https://github.com/neoclide/coc.nvim) until more of the commands and configuration options are availabe. You can find instructions on the setup [here](http://scalameta.org/metals/docs/editors/vim.html) on the Metals website.

If you have any questions or issues with Metals, please submit an issue in the main Metals [issue repo](https://github.com/scalameta/metals/issues). If you have any feature requests, we have a feature request [issue repo](https://github.com/scalameta/metals-feature-requests) as well.
