# Contributing to coc-metals

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

The issue you are trying to fix or the feature you are trying to implement may
actually be part of [Metals](https://github.com/scalameta/metals), maybe part of
[Bloop](https://scalacenter.github.io/bloop/), or even
[coc.nvim](https://github.com/neoclide/coc.nvim) so it's always best to double
check if you're not sure.

## coc.nvim

coc-metals is a `coc.nvim` extension, so firstly, it's important to get an idea
of how `coc.nvim` works.  They have a great wiki with a lot of resources about
how to configure and use `coc.nvim`, and they have a specific page dedicated to
extension which can be found
[here](https://github.com/neoclide/coc.nvim/wiki/Using-coc-extensions).

`coc.nvim` will try to load extensions that are located under
`$VIMCONFIG/coc/extensions`. What I've found to be the easiest to do while
developing is to add `"coc-metals": "*"` to dependences in the `package.json`
file located in this directory. Then, create a symbolic link from where you have
cloned this repo to the `node_modules` directory.  On my machine, it looks like
this.

```sh
ln -s ~/Documents/js-workspace/coc-metals ~/.config/coc/extensions/node_modules/coc-metals
```

This will allow you be able to just build in the git repo, and then restart coc,
and have the new extension working.

## coc-metals

`coc-metals` is basically the [Metals VS Code
extension](https://marketplace.visualstudio.com/items?itemName=scalameta.metals)
ported over to be a `coc.nvim` extension. The API's are very similar, so you'll
see identical code in some situations.  The project is written in
[TypeScript](https://www.typescriptlang.org/), built with
[Parcel](https://parceljs.org/), and formatted with
[Prettier](https://prettier.io/).

To build the project locally

```sh
yarn build
```

To format the project

```sh
yarn format
```
## LSP

More than likely, whatever you are looking to implement will have something to
do with LSP. It will be helpful to read through the official [Language Server
Protocol](https://microsoft.github.io/language-server-protocol/) site if you're
not familiar with the spec. It's a great resource.

Finally, don't be afraid to ask questions.
