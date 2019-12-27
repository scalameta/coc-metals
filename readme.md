
# coc-metals

![coc-metals](https://i.imgur.com/zofu4VI.png)
![npm](https://img.shields.io/npm/v/coc-metals?style=flat-square)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ce92ac.svg?style=flat-square)](https://github.com/prettier/prettier) [![Greenkeeper badge](https://badges.greenkeeper.io/ckipp01/coc-metals.svg)](https://greenkeeper.io/)

## Table of Contents
  - [Requirements](#requirements)
  - [Installing coc-metals](#installing-coc-metals)
  - [Importing a build](#importing-a-build)
    - [Custom sbt launcher](#custom-sbt-launcher)
    - [Speeding up import](#speeding-up-import)
    - [Importing changes](#importing-changes)
  - [Configure Java version](#configure-java-version)
  - [Using latest Metals SNAPSHOT](#using-latest-metals-snapshot)
  - [List all workspace compile errors](#list-all-workspace-compile-errors)
  - [Run doctor](#run-doctor)
  - [Other Available Commands](#other-available-commands)
  - [Show document symbols](#show-document-symbols)
  - [Available Configuration Options](#available-configuration-options)
  - [Enable on type formatting for multiline string formatting](#enable-on-type-formatting-for-multiline-string-formatting)
  - [Shut down the language server](#shut-down-the-language-server)
  - [Statusline integration](#statusline-integration)
  - [Formatting on save](#formatting-on-save)
  - [Gitignore](#gitignore)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)
  - [Theme](#theme)

### Requirements

***`coc-metals` works with both [vim](https://www.vim.org/) and [neovim](https://neovim.io/), but
I've found the experience to be a bit smoother on neovim.***

- [coc.nvim](https://github.com/neoclide/coc.nvim) - There are detailed instructions in their repo on
how to get set up and running quickly.
- Java 8 or 11 provided by OpenJDK or Oracle. Eclipse OpenJ9 is not supported, please make sure the
JAVA_HOME environment variable points to a valid Java 8 or 11 installation.
- ***`coc.nvim` doesn't come with a default mapping for LSP commands, so you need to configure this in
order for any of the commands to work. You can find an example configuration and instructions
[here](coc-mappings.vim)***

### Installing coc-metals

Once you have `coc.nvim` installed, you can then install Metals a few different ways, but the
easiest is by running.

```vim
:CocInstall coc-metals
```

If you'd like to use the latest changes on master, you can also just build from source by using
`:CocInstall` with the repository url.

```vim
:CocInstall https://github.com/ckipp01/coc-metals
```

If you'd like to use the latest changes on master, but manage it using a plugin
manager to download the extension, then if you are using [`vim-plug`](https://github.com/junegunn/vim-plug)
for example, enter the following into where you manage your plugins:

```vim
Plug 'ckipp01/coc-metals', {'do': 'yarn install --frozen-lockfile'}
```

Then, issue a `:PlugInstall` to install the extension, and regularly a `:PlugUpdate` to update it
and pull in the latest changes.

*** Keep in mind that if you are installing directly from the repo via `:CocInstall` with the
repository url or through a plugin manager, remove `coc-metals` with `:CocUninstall coc-metals`
before you add it in with one of the other methods to not conflict with one another.

### Importing a build

The first time you open Metals in a new workspace it prompts you to import the build. Click
"Import build" to start the installation step.

![Build Import](https://i.imgur.com/1EyQPTC.png)

  - "Not now" disables this prompt for 2 minutes.
  - "Don't show again" disables this prompt forever, use rm -rf .metals/ to re-enable the prompt.
  - Use tail -f .metals/metals.log to watch the build import progress.
  - Behind the scenes, Metals uses Bloop to import sbt builds, but you don't need Bloop installed
  on your machine to run this step.

Once the import step completes, compilation starts for your open *.scala files.

Once the sources have compiled successfully, you can navigate the codebase with goto definition.

#### Custom sbt launcher

By default, Metals runs an embedded sbt-launch.jar launcher that respects .sbtopts and .jvmopts.
However, the environment variables SBT_OPTS and JAVA_OPTS are not respected.

Update the metals.sbtScript setting to use a custom sbt script instead of the default Metals
launcher if you need further customizations like reading environment variables.

![Sbt Launcher](https://i.imgur.com/kbxNKzI.png)

#### Speeding up import

The "Import build" step can take a long time, especially the first time you run it in a new build.
The exact time depends on the complexity of the build and if library dependencies need to be
downloaded. For example, this step can take everything from 10 seconds in small cached builds up to
10-15 minutes in large uncached builds.

Consult the Bloop documentation to learn how to speed up build import.

#### Importing changes

When you change build.sbt or sources under project/, you will be prompted to re-import the build.

![Build Re-Import](https://i.imgur.com/iocTVb6.png)

### Configure Java version
The `coc-metals` extension uses by default the `JAVA_HOME` environment variable
(via [`find-java-home`](https://www.npmjs.com/package/find-java-home)) to locate the `java` executable.

![No Java Home](https://i.imgur.com/clDfPMk.png)

If no `JAVA_HOME` is detected you can then Open Settings by following the instructions or do it at
a later time by using `:CocConfig` or `:CocConfigLocal` which will open up your configuration where
you can manually enter your JAVA_HOME location.

![Enter Java Home](https://i.imgur.com/wVThrMq.png)

`coc.nvim` uses [jsonc](https://code.visualstudio.com/docs/languages/json) as
a configuration file format. It's basically json with comment support.

In order to get comment highlighting, please add:

```vim
autocmd FileType json syntax match Comment +\/\/.\+$+
```

### Using latest Metals SNAPSHOT

Update the "Server Version" setting to try out the latest pending Metals
features.

After updating the version, you'll be triggered to reload the window.
This will be necessary before the new version will be downloaded and used.

![Update Metals Version](https://i.imgur.com/VUCdQvi.png)


### List all workspace compile errors

To list all compilation errors and warnings in the workspace, run the following
command.

```vim
:CocList diagnostics
```

Or use the default recommended mapping `<space> a`.

This is helpful to see compilation errors in different files from your current
open buffer.

![Diagnostics](https://i.imgur.com/cer22HW.png)

### Run doctor

To troubleshoot problems with your build workspace, open your coc commands by either
using `:CocCommand` or the recommend mapping `<space> c`. This will open your command
window allowing you to search for `metals.doctor-run` command.

![Run Doctor Command](https://i.imgur.com/QaqhxF7.png)

This command opens an embedded doctor in your preview window. If you're not familiar with
having multiple windows, you can use `<C-w> + w` to jump into it.

![Embedded Doctor](https://i.imgur.com/McaAFv5.png)

### Other Available Commands

  - `metals.restartServer`
  - `metals.build-import`
  - `metals.build-connect`
  - `metals.sources-scan`
  - `metals.compile-cascade`
  - `metals.compile-cancel`
  - `metals.doctor-run`
  - `metals.logs-toggle`

### Show document symbols

Run `:CocList outline` to show a symbol outline for the current file or use the
default mapping `<space> o`.

![Document Symbols](https://i.imgur.com/gEhAXV4.png)


### Available Configuration Options

The following configuration options are currently available. The easiest way to set these
configurations is to enter `:CocConfig` or `:CocLocalConfig` to set your global or local
configuration settings respectively.

If you'd like to get autocompletion help for the configuration values you can install [coc-json](https://github.com/neoclide/coc-json).


   Configuration Option     |      Description
----------------------------|---------------------------
`metals.serverVersion`      | The version of the Metals server artifact. Requires reloading the window.
`metals.serverProperties`   | Optional list of properties to pass along to the Metals server. By default, the environment variable `JAVA_OPTS` and `.jvmopts` file are respected.
`metals.javaHome`           | Optional path to the Java home directory. Requires reloading the window.\n\nDefaults to the most recent Java 8 version computed by the `locate-java-home` npm package.
`metals.sbtScript`          | Optional absolute path to an `sbt` executable to use for running `sbt bloopInstall`. By default, Metals uses `java -jar sbt-launch.jar` with an embedded launcher while respecting `.jvmopts` and `.sbtopts`.\n\nUpdate this setting if your `sbt` script requires more customizations like using environment variables.
`metals.millScript`         | Optional absolute path to a `mill` executable to use for running `mill mill.contrib.Bloop/install`. By default, Metals uses an embedded `millw` script while respecting `.mill-version` file. Update this setting if your `mill` script requires more customizations.
`metals.mavenScript`        | Optional absolute path to a `mvn` executable to use for running `mvn ch.epfl.scala:maven-bloop_2.10:<bloop_version>:bloopInstall`. By default, Metals uses an embedded `mvnw` script. Update this setting if your `mvn` script requires more customizations.
`metals.gradleScript`       | Optional absolute path to a `gradle` executable to use for running `gradle bloopInstall`. By default, Metals uses an embedded `gradlew` script. Update this setting if your `gradle` script requires more customizations.
`metals.pantsTargets`       | The pants targets to export.  Space separated list of Pants targets to export, for example `src/main/scala:: src/main/java::`. Syntax such as `src/{main,test}::` is not supported."
`metals.scalafmtConfigPath` | Optional custom path to the .scalafmt.conf file. Should be relative to the workspace root directory and use forward slashes `/` for file separators (even on Windows).
`metals.customRepositories` | Optional list of custom resolvers passed to Coursier when fetching metals dependencies.\n\nFor documentation on accepted values see the [Coursier documentation](https://get-coursier.io/docs/other-repositories). The extension will pass these to Coursier using the COURSIER_REPOSITORIES environment variable after joining the custom repositories with a pipe character (|).

### Enable on type formatting for multiline string formatting

![on-type](https://i.imgur.com/astTOKu.gif)

To properly support adding `|` in multiline strings we are using the
`onTypeFormatting` method. To enable the functionality you need to enable
`coc.preferences.formatOnType` setting.

![coc-preferences-formatOnType](https://i.imgur.com/RWPHt2q.png)

### Shut down the language server

The Metals server is shutdown when you exit vim as you normally would.

```vim
:wq
```

This step clean ups resources that are used by the server.

### Statusline integration

`coc.nvim` has multiple ways to integrate with various statusline plugins. You can find instructions
for each of them located [here](https://github.com/neoclide/coc.nvim/wiki/Statusline-integration).
Two noteworthy things that they add are the ability to see diagnostic information in the current
buffer...

![Diagnostic statusline](https://i.imgur.com/7uNYTYl.png)

... and also progress information for longer standing processes.

![Progress item](https://i.imgur.com/AAWZ4o4.png)

If you don't use a statusline integration, but would still like to see this information, the easiest
way is to add the following to your `.vimrc`.

```vim
set statusline^=%{coc#status()}
```
The `coc#status()` function will display both status and diagnostic information. However, if you are
using an integration like I am in the photos that display your diagnostic information in the far
right, but you'd like to see the status information in the middle, you can make a small function to
just grab that information, and use it in your statusline. This is what I use for lightline to
display only the status information in the middle of the statusline (`section_c`).

```vim
function! CocExtensionStatus() abort
  return get(g:, 'coc_status', '')
endfunction
let g:airline_section_c = '%f%{CocExtensionStatus()}'
```

### Formatting on save

If you'd like to have `:w` format using Metals + Scalafmt, then make sure you have the following in
your `:CocConfig`.

```json
"coc.preferences.formatOnSaveFiletypes": ["scala"]
```
### Gitignore

The Metals server places logs and other files in the .metals/ directory. The Bloop compile server
places logs and compilation artifacts in the .bloop directory. A Bloop plugin that generates Bloop
configuration is added in the project/metals.sbt file. It's recommended to ignore these
directories and file from version control systems like git.

```git
# ~/.gitignore
.metals/
.bloop/
project/metals.sbt
```

### Troubleshooting

If you have any questions or issues with coc-metals, please submit an [issue](https://github.com/ckipp01/coc-metals/issues)
in this repo if it pertains to the extension. If the issues is general to Metals, please submit it
in the [Metals issue repo](https://github.com/scalameta/metals/issues). If you have any feature
requests, we also have a feature request [issue repo](https://github.com/scalameta/metals-feature-requests).

### Contributing

If you're interested in contributing, please visit the [CONTRIBUTING](CONTRIBUTING.md) guide for
help on getting started. You can also take a look at the [project board](https://github.com/ckipp01/coc-metals/projects/1)
to get an idea of what is being looked at or currently being worked on.

### Theme

The screen shots are a mixture of both vim and neovim. The theme is
[onedark](https://github.com/joshdick/onedark.vim) with syntax highlighting added by
[vim-scala](https://github.com/derekwyatt/vim-scala). The status bar is
[vim-airline](https://github.com/vim-airline/vim-airline), and vim in being ran in
[iTerm2](https://iterm2.com/).
