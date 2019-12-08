# coc-metals

WIP [coc.nvim](https://github.com/neoclide/coc.nvim) extension for [Metals](http://scalameta.org/metals/), the Scala Language Server.

This extension is meant to mimic the functionality provided by the [metals-vscode](https://github.com/scalameta/metals-vscode) extension.

## Requirements

- [coc.nvim](https://github.com/neoclide/coc.nvim)
- Java 8 or 11 provided by OpenJDK or Oracle. Eclipse OpenJ9 is not supported, please make sure the JAVA_HOME environment variable points to a valid Java 8 or 11 installation.

## Quick Start

```
:CocInstall coc-metals
```

Following the installation of the extension, you simply need to open the directory that contains your scala project.
Then upon entering your `build.sbt` or any scala file, a few check will automatically be happen:

1. Ensure that you have a valid Java installation
2. Ensure you have the most up to date Metals version listed in your config, or it will default to the latest stable release
3. If Metals is not available, it will download Metals

After the download, Metals will automatically start. At this point you should see the prompt to import your build.

![Import Build](https://i.imgur.com/ygknUAt.png)

## coc.nvim mappings

There are no default mappings for `coc.nvim` doesn't come with default mappings, so you'll want to ensure you have the following added to your `.vimrc`

```vims
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

## Configuration

The following configuration are currently available. The easiest way to set these configurations is to enter `:CocConfig` or `:CocLocalConfig` to set your 
global or local configuration settings respectively. You are able to get autocompletion help for the configuration values if you install [coc-json](https://github.com/neoclide/coc-json).

![CocConfig](https://i.imgur.com/7wt4qJ7.png)

The following configuration options are available:

- `metals.serverVersion`: The version of the Metals server artifact. Requires reloading the window.
- `metals.serverProperties`: Optional list of properties to pass along to the Metals server. By default, the environment variable `JAVA_OPTS` and `.jvmopts` file are respected.
- `metals.javaHome`: Optional path to the Java home directory. Requires reloading the window.\n\nDefaults to the most recent Java 8 version computed by the `locate-java-home` npm package.
- `metals.sbtScript`: Optional absolute path to an `sbt` executable to use for running `sbt bloopInstall`. By default, Metals uses `java -jar sbt-launch.jar` with an embedded launcher while respecting `.jvmopts` and `.sbtopts`.\n\nUpdate this setting if your `sbt` script requires more customizations like using environment variables.
- `metals.millScript`: Optional absolute path to a `mill` executable to use for running `mill mill.contrib.Bloop/install`. By default, Metals uses an embedded `millw` script while respecting `.mill-version` file. Update this setting if your `mill` script requires more customizations.
- `metals.mavenScript`: Optional absolute path to a `mvn` executable to use for running `mvn ch.epfl.scala:maven-bloop_2.10:<bloop_version>:bloopInstall`. By default, Metals uses an embedded `mvnw` script. Update this setting if your `mvn` script requires more customizations.
- `metals.gradleScript`: Optional absolute path to a `gradle` executable to use for running `gradle bloopInstall`. By default, Metals uses an embedded `gradlew` script. Update this setting if your `gradle` script requires more customizations.
- `metals.scalafmtConfigPath`: Optional custom path to the .scalafmt.conf file. Should be relative to the workspace root directory and use forward slashes `/` for file separators (even on Windows).
- `metals.customRepositories`: Optional list of custom resolvers passed to Coursier when fetching metals dependencies.\n\nFor documentation on accepted values see the [Coursier documentation](https://get-coursier.io/docs/other-repositories). The extension will pass these to Coursier using the COURSIER_REPOSITORIES environment variable after joining the custom repositories with a pipe character (|).

## Available Commands

In order to either view or execute a commnad, enter `:CocCommand` which will bring up a fuzzy finder where you can search for any available `coc.nvim` or Metals command.

![CocCommand](https://i.imgur.com/ijrG2jU.png)

The following command are currently available:

- `metals.restartServer`
- `metals.build-import`
- `metals.build-connect`
- `metals.sources-scan`
- `metals.compile-cascade`
- `metals.compile-cancel`
- `metals.doctor-run`


### Troubleshooting

Again, this is currently a work in progress and many thing are not implemented yet. It's recommend to manually set up Metals with [coc.nvim](https://github.com/neoclide/coc.nvim) until more of the commands and configuration options are availabe. You can find instructions on the setup [here](http://scalameta.org/metals/docs/editors/vim.html) on the Metals website.

If you have any questions or issues with Metals, please submit an issue in the main Metals [issue repo](https://github.com/scalameta/metals/issues). If you have any feature requests, we have a feature request [issue repo](https://github.com/scalameta/metals-feature-requests) as well.
