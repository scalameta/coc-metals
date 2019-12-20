
# coc-metals

![coc-metals](https://i.imgur.com/zofu4VI.png)
![npm](https://img.shields.io/npm/v/coc-metals?style=flat-square)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ce92ac.svg?style=flat-square)](https://github.com/prettier/prettier)

## Requirements

- [coc.nvim](https://github.com/neoclide/coc.nvim)
- Java 8 or 11 provided by OpenJDK or Oracle. Eclipse OpenJ9 is not supported, please make sure the JAVA_HOME environment variable points to a valid Java 8 or 11 installation.

### LSP commands key mapping

`coc.nvim` doesn't come with a default key mapping for LSP commands, so you need to
configure it yourself.

Here's a recommended configuration:

```vim
" ~/.vimrc
" Configuration for coc.nvim

" Smaller updatetime for CursorHold & CursorHoldI
set updatetime=300

" don't give |ins-completion-menu| messages.
set shortmess+=c

" always show signcolumns
set signcolumn=yes

" Some server have issues with backup files, see #649
set nobackup
set nowritebackup

" Better display for messages
set cmdheight=2

" Use <c-space> for trigger completion.
inoremap <silent><expr> <c-space> coc#refresh()

" Use <cr> for confirm completion, `<C-g>u` means break undo chain at current position.
" Coc only does snippet and additional edit on confirm.
inoremap <expr> <cr> pumvisible() ? "\<C-y>" : "\<C-g>u\<CR>"

" Use `[c` and `]c` for navigate diagnostics
nmap <silent> [c <Plug>(coc-diagnostic-prev)
nmap <silent> ]c <Plug>(coc-diagnostic-next)

" Remap keys for gotos
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

" Remap for do codeAction of current line
nmap <leader>ac <Plug>(coc-codeaction)

" Remap for do action format
nnoremap <silent> F :call CocAction('format')<CR>

" Use K for show documentation in preview window
nnoremap <silent> K :call <SID>show_documentation()<CR>

function! s:show_documentation()
  if &filetype == 'vim'
    execute 'h '.expand('<cword>')
  else
    call CocAction('doHover')
  endif
endfunction

" Highlight symbol under cursor on CursorHold
autocmd CursorHold * silent call CocActionAsync('highlight')

" Remap for rename current word
nmap <leader>rn <Plug>(coc-rename)

" Show all diagnostics
nnoremap <silent> <space>a  :<C-u>CocList diagnostics<cr>
" Find symbol of current document
nnoremap <silent> <space>o  :<C-u>CocList outline<cr>
" Search workspace symbols
nnoremap <silent> <space>s  :<C-u>CocList -I symbols<cr>
" Do default action for next item.
nnoremap <silent> <space>j  :<C-u>CocNext<CR>
" Do default action for previous item.
nnoremap <silent> <space>k  :<C-u>CocPrev<CR>
" Resume latest coc list
nnoremap <silent> <space>p  :<C-u>CocListResume<CR>

" Notify coc.nvim that <enter> has been pressed.
" Currently used for the formatOnType feature.
inoremap <silent><expr> <cr> pumvisible() ? coc#_select_confirm()
      \: "\<C-g>u\<CR>\<c-r>=coc#on_enter()\<CR>"
```

### Installing coc-metals

Once you have `coc.nvim` installed, you can then install Metals by running.

```vim
:CocInstall coc-metals
```

If you'd like to use the latest changes on master, you can also just build from source by using a plugin
manager to download the extension. If you do this and you've had `coc-metals` installed before with `:CocInstall`,
make sure you run `:CocUninstall coc-metals` to remove it. Then, if you are using [`vim-plug`](https://github.com/junegunn/vim-plug)
for example, enter the following into where you manage your plugins:

```vim
Plug 'ckipp01/coc-metals', {'do': 'yarn install --frozen-lockfile'}
```

Then, issue a `:PlugInstall` to install the extension, and regularly a `:PlugUpdate` to update it and pull in the latest changes.

### Importing a build

The first time you open Metals in a new workspace it prompts you to import the build. Click "Import build" to start the installation step.

![Build Import](https://i.imgur.com/1EyQPTC.png)

  - "Not now" disables this prompt for 2 minutes.
  - "Don't show again" disables this prompt forever, use rm -rf .metals/ to re-enable the prompt.
  - Use tail -f .metals/metals.log to watch the build import progress.
  - Behind the scenes, Metals uses Bloop to import sbt builds, but you don't need Bloop installed on your machine to run this step.

Once the import step completes, compilation starts for your open *.scala files.

Once the sources have compiled successfully, you can navigate the codebase with goto definition.

### Custom sbt launcher

By default, Metals runs an embedded sbt-launch.jar launcher that respects .sbtopts and .jvmopts. However, the environment variables SBT_OPTS and JAVA_OPTS are not respected.

Update the metals.sbtScript setting to use a custom sbt script instead of the default Metals launcher if you need further customizations like reading environment variables.

![Sbt Launcher](https://i.imgur.com/kbxNKzI.png)

### Speeding up import

The "Import build" step can take a long time, especially the first time you run it in a new build. The exact time depends on the complexity of the build and if library dependencies need to be downloaded. For example, this step can take everything from 10 seconds in small cached builds up to 10-15 minutes in large uncached builds.

Consult the Bloop documentation to learn how to speed up build import.

### Importing changes

When you change build.sbt or sources under project/, you will be prompted to re-import the build.

![Build Re-Import](https://i.imgur.com/iocTVb6.png)

## Configure Java version
The `coc-metals` extension uses by default the `JAVA_HOME` environment variable (via [`find-java-home`](https://www.npmjs.com/package/find-java-home)) to locate the `java` executable.

![No Java Home](https://i.imgur.com/clDfPMk.png)

If no `JAVA_HOME` is detected you can then Open Settings by following the instructions or do it at a later time by using `:CocConfig` or `:CocConfigLocal` which will open up your configuration where you can manually enter your JAVA_HOME location.

![Enter Java Home](https://i.imgur.com/wVThrMq.png)

`coc.nvim` uses [jsonc](https://code.visualstudio.com/docs/languages/json) as
a configuration file format. It's basically json with comment support.

In order to get comment highlighting, please add:

```vim
autocmd FileType json syntax match Comment +\/\/.\+$+
```

## Using latest Metals SNAPSHOT

Update the "Server Version" setting to try out the latest pending Metals
features.

After updating the version, you'll be triggered to reload the window.
This will be necessary before the new version will be downloaded and used.

![Update Metals Version](https://i.imgur.com/VUCdQvi.png)


## List all workspace compile errors

To list all compilation errors and warnings in the workspace, run the following
command.

```vim
:CocList diagnostics
```

Or use the default recommended mapping `<space> a`.

This is helpful to see compilation errors in different files from your current
open buffer.

![Diagnostics](https://i.imgur.com/cer22HW.png)

## Run doctor

To troubleshoot problems with your build workspace, open your coc commands by either
using `:CocCommand` or the recommend mapping `<space> c`. This will open your command
window allowing you to search for `metals.doctor-run` command.

![Run Doctor Command](https://i.imgur.com/QaqhxF7.png)

This command opens your browser with a table like this.

![Run Doctor](https://i.imgur.com/yelm0jd.png)

## Other Available Command

  - `metals.restartServer`
  - `metals.build-import`
  - `metals.build-connect`
  - `metals.sources-scan`
  - `metals.compile-cascade`
  - `metals.compile-cancel`
  - `metals.doctor-run`

## Show document symbols

Run `:CocList outline` to show a symbol outline for the current file or use the
default mapping `<space> o`.

![Document Symbols](https://i.imgur.com/gEhAXV4.png)


## Available Configuration Options

The following configuration options are currently available. The easiest way to set these configurations is to enter `:CocConfig` or `:CocLocalConfig` to set your global or local configuration settings respectively.

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

## Enable on type formatting for multiline string formatting

![on-type](https://i.imgur.com/astTOKu.gif)

To properly support adding `|` in multiline strings we are using the
`onTypeFormatting` method. To enable the functionality you need to enable
`coc.preferences.formatOnType` setting.

![coc-preferences-formatOnType](https://i.imgur.com/RWPHt2q.png)

### Close buffer without exiting

To close a buffer and return to the previous buffer, run the following command.

```vim
:bd
```

This command is helpful when navigating in library dependency sources in the .metals/readonly directory.

### Shut down the language server

The Metals server is shutdown when you exit vim as usual.

```vim
:wq
```

This step clean ups resources that are used by the server.

### Gitignore project/metals.sbt .metals/ and .bloop/

The Metals server places logs and other files in the .metals/ directory. The Bloop compile server places logs and compilation artifacts in the .bloop directory. Bloop plugin that generates Bloop configuration is added in the project/metals.sbt file. It's recommended to ignore these directories and file from version control systems like git.

```git
# ~/.gitignore
.metals/
.bloop/
project/metals.sbt
```

### Troubleshooting

If you have any questions or issues with coc-metals, please submit an [issue](https://github.com/ckipp01/coc-metals/issues) in this repo if it pertains to the extension. If the issues is general to Metals, please submit it in the [Metals issue repo](https://github.com/scalameta/metals/issues). If you have any feature requests, we also have a feature request [issue repo](https://github.com/scalameta/metals-feature-requests).

### Contributing

If you're interested in contributing, please visit the [CONTRIBUTING](CONTRIBUTING.md) guide for help on getting started.
You can also take a look at the [project board](https://github.com/ckipp01/coc-metals/projects/1) to get an idea of what is being
looked at or currently being worked on.
