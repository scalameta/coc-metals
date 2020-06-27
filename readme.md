
# coc-metals

![coc-metals](https://i.imgur.com/zofu4VI.png)
![npm](https://img.shields.io/npm/v/coc-metals?style=flat-square)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ce92ac.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=scalameta/coc-metals)](https://dependabot.com)

`coc-metals` is the recommended `coc.nvim` extension for
[Metals](https://scalameta.org/metals/), the Scala language server. `coc-metals`
offers automated Metals installation, easy configuration, Metals-specific
commands, an embedded doctor, implementation of the decoration protocol, and
many other small features.

***NOTE: The readme is up-to-date with the master branch, so not all features
will be available if you're using the latest stable release. The [vim
page](https://scalameta.org/metals/docs/editors/vim.html) on the Metals site is
synced with the latest stable release***

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
  - [Worksheets](#worksheets)
  - [Tree View Protocol](#tree-view-protocol)
  - [Goto Super Method](#goto-super-method)
  - [All Available Commands](#all-available-commands)
  - [Show document symbols](#show-document-symbols)
  - [Available Configuration Options](#available-configuration-options)
  - [Enable on type formatting for multiline string formatting](#enable-on-type-formatting-for-multiline-string-formatting)
  - [Shut down the language server](#shut-down-the-language-server)
  - [Statusline integration](#statusline-integration)
  - [Formatting on save](#formatting-on-save)
  - [Debugging](#debugging)
  - [Gitignore](#gitignore)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)
  - [Theme](#theme)

### Requirements

***`coc-metals` works with both [Vim](https://www.vim.org/) and
[Neovim](https://neovim.io/), but we recommend neovim for a smoother experience
and extra features such as the decoration protocol.***

- [coc.nvim](https://github.com/neoclide/coc.nvim) - There are detailed
    instructions in their repo on how to get set up and running quickly.
- Java 8 or 11 provided by OpenJDK or Oracle. Eclipse OpenJ9 is not supported,
    please make sure the JAVA_HOME environment variable points to a valid Java 8 or
    11 installation.
- Node >= 10 in order for coc.nvim to work correctly.
- ***`coc.nvim` doesn't come with a default mapping for LSP commands, so you
    need to configure this in order for any of the commands to work. You can find
    an example configuration and instructions [here](coc-mappings.vim)***

### Installing coc-metals

Once you have `coc.nvim` installed, you can then install Metals a few different
ways, but the easiest is by running.

```vim
:CocInstall coc-metals
```

If you'd like to use the latest changes on master, you can also just build from
source by using `:CocInstall` with the repository url.

```vim
:CocInstall https://github.com/scalameta/coc-metals
```

If you'd like to use the latest changes on master, but manage it using a plugin
manager to download the extension, then if you are using
[`vim-plug`](https://github.com/junegunn/vim-plug) for example, enter the
following into where you manage your plugins:

```vim
Plug 'scalameta/coc-metals', {'do': 'yarn install --frozen-lockfile'}
```

Then, issue a `:PlugInstall` to install the extension, and regularly a
`:PlugUpdate` to update it and pull in the latest changes.

*** Keep in mind that if you are installing directly from the repo via
`:CocInstall` with the repository url or through a plugin manager, remove
`coc-metals` with `:CocUninstall coc-metals` before you add it in with one of
the other methods to not conflict with one another.

### Importing a build

The first time you open Metals in a new workspace it prompts you to import the
build. Click "Import build" to start the installation step.

![Build Import](https://i.imgur.com/1EyQPTC.png)

- "Not now" disables this prompt for 2 minutes.
- "Don't show again" disables this prompt forever, use rm -rf .metals/ to
    re-enable the prompt.
- Use tail -f .metals/metals.log to watch the build import progress.
- Behind the scenes, Metals uses Bloop to import sbt builds, but you don't need
    Bloop installed on your machine to run this step.

Once the import step completes, compilation starts for your open *.scala files.

Once the sources have compiled successfully, you can navigate the codebase with
goto definition.

#### Custom sbt launcher

By default, Metals runs an embedded sbt-launch.jar launcher that respects
.sbtopts and .jvmopts.  However, the environment variables SBT_OPTS and
JAVA_OPTS are not respected.

Update the metals.sbtScript setting to use a custom sbt script instead of the
default Metals launcher if you need further customizations like reading
environment variables.

![sbt-launcher](https://i.imgur.com/meciPTg.png)

#### Speeding up import

The "Import build" step can take a long time, especially the first time you run
it in a new build.  The exact time depends on the complexity of the build and if
library dependencies need to be downloaded. For example, this step can take
everything from 10 seconds in small cached builds up to 10-15 minutes in large
uncached builds.

Consult the Bloop documentation to learn how to speed up build import.

#### Importing changes

When you change build.sbt or sources under project/, you will be prompted to
re-import the build.

![Build Re-Import](https://i.imgur.com/iocTVb6.png)

### Configure Java version
The `coc-metals` extension uses by default the `JAVA_HOME` environment variable
(via [`find-java-home`](https://www.npmjs.com/package/find-java-home)) to locate
the `java` executable.

![No Java Home](https://i.imgur.com/clDfPMk.png)

If no `JAVA_HOME` is detected you can then Open Settings by following the
instructions or do it at a later time by using `:CocConfig` or `:CocConfigLocal`
which will open up your configuration where you can manually enter your
JAVA_HOME location.

![java-home](https://i.imgur.com/wK07Vju.png)

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

If you'd like to get all of the workspace diagnostics in your statusBar since by
default you will only see the diagnostics for the buffer, you can find a section
[here in the wiki](https://github.com/scalameta/coc-metals/wiki/Commonly-Asked-Questions#how-do-i-get-all-the-workspace-diagnostics-like-leader-a-gives-me-instead-of-just-the-local-buffer)
explaing how to do it.

### Run doctor

To troubleshoot problems with your build workspace, open your coc commands by either
using `:CocCommand` or the recommend mapping `<space> c`. This will open your command
window allowing you to search for `metals.doctor-run` command.

![Run Doctor Command](https://i.imgur.com/QaqhxF7.png)

This command opens an embedded doctor in your preview window. If you're not familiar with
having multiple windows, you can use `<C-w> + w` to jump into it.

![Embedded Doctor](https://i.imgur.com/McaAFv5.png)

### Worksheets

Metals allows users to create a `*.worksheet.sc` file and see evaluations right
in their file. In Vim, this is done using comments that are inserted which will
allow you to hover on them to expand. In Neovim, this is done using Neovim's
[virtual text](https://neovim.io/doc/user/api.html#nvim_buf_set_virtual_text())
to implement Metal's [Decoration
Protocol](https://scalameta.org/metals/docs/editors/decoration-protocol.html).
If using Neovim, make sure to have the following line included in your `.vimrc`
along with your `coc.nvim` mappings.  Also keep in mind that the worksheet needs
to be created inside of your project to have access to your dependencies etc. If
you create them in the root of your project for example, your worksheet will
only have access to the standard lib.

```vim
nmap <Leader>ws <Plug>(coc-metals-expand-decoration)
```
Then, when on the line that you'd like to expand the decoration to get the hover
information, execute a `<leader>ws` in order to see the expanded text for that
line.

![Decorations with worksheets](https://i.imgur.com/Bt6DMtH.png)

### Tree View Protocol

![Tree View Protocol](https://i.imgur.com/GvcU9Mu.gif)

coc-metals has a built-in implementation of the [Tree View
Protocol](https://scalameta.org/metals/docs/editors/tree-view-protocol.html).
If you have the [recommended mappings](coc-mappings.vim) copied, you'll notice
that in the bottom you'll have some TVP related settings. You can start by
opening the TVP panel by using the default `<space> t`. Once open, you'll see
there are three parts to the panel. The first being the `MetalsCompile` window
where you can see ongoing compilations, the second is the `MetalsPackages`
window where you are able to see a tree view of all your packages, and finally
the `metalsBuild` window where you have build related commands.

You are able to trigger the commands while being on top of the option you are
attempting to trigger and pressing `r`. You can change this default in the
settings. You can find all the relevant TVP settings below in the [Available
Configuration Options](#available-configuration-options).

### Goto Super Method

Depending on whether you're using Vim or Neovim, you'll have a slightly
different behavior with this feature. If you're using Neovim, you'll want to
ensure that you have `codeLens.enable` set to `true` in your Coc Config since
you'll be able to quickly see via code lenses which members are overridden.
Then, you'll be able to simply trigger a code lens action on the line of the
member that is overridden. The default mapping for this is `<leader> cl`.

If you're using Vim, you'll still have access to this functionality, but you'll
have to infer which members are overridden and utilize the
`metals.go-to-super-method` command.

There is also a `metals.super-method-hierarchy` command which will show you the
entire hierarchy of the overridden method.

![Goto super method](https://i.imgur.com/TkjolXq.png)

If you don't utilize this feature you can disable it by setting
`metals.superMethodLensesEnabled` to `false`.

### All Available Commands

  - `metals.restartServer`
  - `metals.build-import`
  - `metals.build-connect`
  - `metals.build-restart`
  - `metals.sources-scan`
  - `metals.compile-cascade`
  - `metals.compile-cancel`
  - `metals.doctor-run`
  - `metals.logs-toggle`
  - `metals.tvp`
  - `metals.tvp.view`
  - `metals.revealInTreeView`
  - `metals.new-scala-file`
  - `metals.new-scala-project`
  - `metals.go-to-super-method`
  - `metals.super-method-hierarchy`
  - `metals.ammonite-start`
  - `metals.ammonite-stop`

### Show document symbols

Run `:CocList outline` to show a symbol outline for the current file or use the
default mapping `<space> o`.

![Document Symbols](https://i.imgur.com/gEhAXV4.png)


### Available Configuration Options

The following configuration options are currently available. The easiest way to
set these configurations is to enter `:CocConfig` or `:CocLocalConfig` to set
your global or local configuration settings respectively.

If you'd like to get autocompletion help for the configuration values you can
install [coc-json](https://github.com/neoclide/coc-json).


   Configuration Option                         |      Description
----------------------------                    |---------------------------
`metals.enable`                                 | Enable the coc-metals extension (default true)
`metals.serverVersion`                          | The version of the Metals server artifact. Requires reloading the window.
`metals.serverProperties`                       | Optional list of properties to pass along to the Metals server. By default, the environment variable `JAVA_OPTS` and `.jvmopts` file are respected.
`metals.ammoniteJvmProperties`                  | Optional list of JVM properties to pass along to the Ammonite server. Each property needs to be a separate item. Example: `-Xmx1G` or `-Xms100M`
`metals.javaHome`                               | Optional path to the Java home directory. Requires reloading the window. Defaults to the most recent Java 8 version computed by the `locate-java-home` npm package.
`metals.sbtScript`                              | Optional absolute path to an `sbt` executable to use for running `sbt bloopInstall`. By default, Metals uses `java -jar sbt-launch.jar` with an embedded launcher while respecting `.jvmopts` and `.sbtopts`. Update this setting if your `sbt` script requires more customizations like using environment variables.
`metals.millScript`                             | Optional absolute path to a `mill` executable to use for running `mill mill.contrib.Bloop/install`. By default, Metals uses an embedded `millw` script while respecting `.mill-version` file. Update this setting if your `mill` script requires more customizations.
`metals.mavenScript`                            | Optional absolute path to a `mvn` executable to use for running `mvn ch.epfl.scala:maven-bloop_2.10:<bloop_version>:bloopInstall`. By default, Metals uses an embedded `mvnw` script. Update this setting if your `mvn` script requires more customizations.
`metals.gradleScript`                           | Optional absolute path to a `gradle` executable to use for running `gradle bloopInstall`. By default, Metals uses an embedded `gradlew` script. Update this setting if your `gradle` script requires more customizations.
`metals.pantsTargets`                           | The pants targets to export.  Space separated list of Pants targets to export, for example `src/main/scala:: src/main/java::`. Syntax such as `src/{main,test}::` is not supported."
`metals.scalafmtConfigPath`                     | Optional custom path to the .scalafmt.conf file. Should be relative to the workspace root directory and use forward slashes `/` for file separators (even on Windows).
`metals.customRepositories`                     | Optional list of custom resolvers passed to Coursier when fetching metals dependencies. For documentation on accepted values see the [Coursier documentation](https://get-coursier.io/docs/other-repositories). The extension will pass these to Coursier using the COURSIER_REPOSITORIES environment variable after joining the custom repositories with a pipe character (|).
`metals.bloopVersion`                           | This version will be used for the Bloop build tool plugin, for any supported build tool,while importing in Metals as well as for running the embedded server
`metals.bloopSbtAlreadyInstalled`               | If true, Metals will not generate a `project/metals.sbt` file under the assumption that sbt-bloop is already manually installed in the sbt build. Build import will fail with a 'not valid command bloopInstall' error in case Bloop is not manually installed in the build when using this option.
`metals.statusBarEnabled`                       | Turn on usage of the statusBar integration. Note: You need to ensure you are adding something like `%{coc#status()}` in order to display it, or use a plugin that includes a status integration.
`metals.superMethodLensesEnabled`               | Enable/disable goto super method code lens (default is true)
`metals.enableStripMarginOnTypeFormatting`      | When enabled, if you press the return key from the first line of a multiline string containing a pipe, it will automatically add `.stripMargin.` (default is true)
`metals.treeviews.toggleNode`                   | Expand / Collapse tree node (default `<CR>`)
`metals.treeviews.initialWidth`                 | Initial Tree Views panels (default `40`)
`metals.treeviews.initialViews`                 | Initial views that the Tree View Panel Displays. Don't mess with this unless you know what you're doing.
`metals.treeviews.gotoLastChild`                | Go to the last child Node (defalt `J`)
`metals.treeviews.gotoParentNode`               | Go to parent Node (default `p`)
`metals.treeviews.gotoFirstChild`               | Go to first child Node (default `K`)
`metals.treeviews.executeCommand`               | Execute command for node (default `r`)
`metals.treeviews.gotoPrevSibling`              | Go to prev sibling (default `<C-k>`)
`metals.treeviews.gotoNextSibling`              | Go to next sibling (default `<C-j>`)
`metals.treeviews.forceChildrenReload`          | Force the reloading of the children of this node. May be useful when the wrong result is cached and tree contains invalid data. (default `f`)
`metals.treeviews.executeCommandAndOpenTab`     | Execute command and open node under cursor in tab (if node is class, trait and so on) (default `t`)
`metals.treeviews.executeCommandAndOpenSplit`   | Execute command and open node under cursor in horizontal split (if node is class, trait and so on) (default `s`)
`metals.treeviews.executeCommandAndOpenVSplit`  | Execute command and open node under cursor in horizontal split (if node is class, trait and so on) (default `v`)

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

It's recommended to use a statusline integration with `coc-metals` in order to
allow messages to be displayed in your status line rather than as a message.
This will allow for a better experience as you can continue to get status
information while entering a command or responding to a prompt. However, we
realize that not everyone by default will have this setup, and since the user
needs to see messages about the status of their build, the following is
defaulted to false.

```json
"metals.statusBarEnabled": true
```

Again, it's recommended to make this active, and use a statusline plugin, or
manually add the coc status information into your statusline. `coc.nvim` has
multiple ways to integrate with various statusline plugins. You can find
instructions for each of them located
[here](https://github.com/neoclide/coc.nvim/wiki/Statusline-integration).  If
you're unsure of what to use,
[vim-airline](https://github.com/vim-airline/vim-airline) is a great minimal
choice that will work out of the box.

With [vim-airline](https://github.com/vim-airline/vim-airline), you'll notice
two noteworthy things. The first will be that you'll have diagnostic
information on the far right of your screen.

![Diagnostic statusline](https://i.imgur.com/7uNYTYl.png)

You'll also have metals status information in your status bar.

![Status bar info](https://i.imgur.com/eCAgrCn.png)

Without a statusline integration, you'll get messages like you see below.

![No status line](https://i.imgur.com/XF7A1BJ.png)

If you don't use a statusline plugin, but would still like to see this
information, the easiest way is to make sure you have the following in your
`.vimrc`.

```vim
set statusline^=%{coc#status()}%{get(b:,'coc_current_function','')}
```

### Formatting on save

If you'd like to have `:w` format using Metals + Scalafmt, then make sure you
have the following in your `:CocConfig`.

```json
"coc.preferences.formatOnSaveFiletypes": ["scala"]
```

### Debugging

coc-metals provides easy integration with the great
[vimspector](https://github.com/puremourning/vimspector) plugin that allows  you
to run a Debug Adapter Server and debug your application with minimum manual
steps.

#### Requirements:
- *This is only currently available for Neovim +0.4.3 for now until the
  the `launch.json` Metals expects can be mapped to match the `.vimspector.json`
  file that vimspector uses. For now, you'll need to trigger the `run` or `debug`
  with code lenses provided by Neovim.

- [vimspector](https://github.com/puremourning/vimspector) plugin - Basically you just
  need to add vimspector into vim's runtimepath, for example, if you are using vim-plug then
  add this line in .vimrc

```vim
Plug 'puremourning/vimspector'
```
#### Configuration:

- Set `codeLens.enable` to `true` in your `:CocConfig`
- Setup your [Vimspector Mappings](https://github.com/puremourning/vimspector#mappings)

The [vimspector documentation](https://github.com/puremourning/vimspector) is
quite robust, so please make sure to read through it.

There are multiple ways to have you base configuration for vimspector to work
with Metals. You can either set this up globally to work with all of your Scala
projects or for an individual  project.

_Global Example:_

Put your `coc-metals.json` file in the following directory:
`/path/to/vimspector/configurations/{os}/scala` (where `os` is `linux`, `macos`
or `windows`) with following content:

```json
{
  "configurations": {
    "coc-metals": {
      "adapter": {
        "port": "${port}",
        "variables": {
        }
      },
      "configuration": {
        "request": "launch"
      },
      "breakpoints": {
        "exception": {
          "caught": "N",
          "uncaught": "N"
        }
      }
    }
  }
}
```

You can also just place the same contents above in the root of your local
project in a `.vimspector.json` file, and it will work the same way.

With these configuration parameters the codeLens 'run' and 'debug' appear
against runnable classes (applications or tests) of your project. Then, you will
be able to trigger these codeLens actions (default mapping is `<leader> cl`) and
start Debug Adapter Server. Once Debug Adapter Server is started coc-metals will
transfer necessary information to vimspector to activate debugging.

For now both actions 'run' and 'debug' start vimspector in debug mode. This may
be improved in next versions.

### Gitignore

The Metals server places logs and other files in the .metals/ directory. The
Bloop compile server places logs and compilation artifacts in the .bloop
directory. A Bloop plugin that generates Bloop configuration is added in the
project/metals.sbt file. It's recommended to ignore these directories and file
from version control systems like git.

```git
# ~/.gitignore
.metals/
.bloop/
project/metals.sbt
```

### Troubleshooting

If you have any questions or issues with coc-metals, please submit an
[issue](https://github.com/scalameta/coc-metals/issues) in this repo if it
pertains to the extension. If the issues is general to Metals, please submit it
in the [Metals issue repo](https://github.com/scalameta/metals/issues). If you
have any feature requests, we also have a feature request [issue
repo](https://github.com/scalameta/metals-feature-requests). There is also a
section in the wiki for [Commonly Asked
Questions](https://github.com/scalameta/coc-metals/wiki/Commonly-Asked-Questions).
Fee free to peruse that to potentially find an answer you may be looking for.

### Contributing

If you're interested in contributing, please visit the
[CONTRIBUTING](CONTRIBUTING.md) guide for help on getting started.

### Theme

The screen shots are in [Neovim](https://neovim.io/). The theme is
[onedark](https://github.com/joshdick/onedark.vim) with syntax highlighting added by
[vim-scala](https://github.com/derekwyatt/vim-scala). The status bar is
[vim-airline](https://github.com/vim-airline/vim-airline), and all being ran in
[iTerm2](https://iterm2.com/).
