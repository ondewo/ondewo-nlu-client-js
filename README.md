<p align="center">
  <a href="https://www.ondewo.com">
    <img alt="ONDEWO Logo" src="https://raw.githubusercontent.com/ondewo/ondewo-logos/master/github/ondewo_logo_github_2.png"/>
  </a>
  <h1 align="center">
    ONDEWO NLU Client JavaScript
  </h1>
  <p align="center">
    <a href="https://badge.fury.io/js/%40ondewo%2Fondewo-nlu-client-js"><img src="https://badge.fury.io/js/%40ondewo%2Fondewo-nlu-client-js.svg" alt="npm version" height="32"></a>
  </p>
</p>

## Overview

`@ondewo/nlu-client-js` is a compiled version of the [ONDEWO NLU API](https://github.com/ondewo/ondewo-nlu-api). Here you can find the NLU API [documentation](https://ondewo.github.io).

## Setup

Using NPM:

```shell
npm i --save @ondewo/ondewo-nlu-client-js
```

Using GitHub:

```shell
git clone https://github.com/ondewo/ondewo-nlu-client-js.git ## Clone repository
cd ondewo-nlu-client-js                                      ## Change into repo-directoy
npm i                                                        ## Install dependencies
```

## Package structure

```
npm
├── api
│   ├── ondewo_nlu_api.js
│   ├── ondewo_nlu_api.min.js
│   └── ondewo_nlu_api.min.js.map
├── LICENSE
├── package.json
└── README.md
```

[comment]: <> (START OF GITHUB README)

## Build

The `make build` command is dependent on 2 `repositories` and their speciefied `version`:

- [ondewo-nlu-api](https://github.com/ondewo/ondewo-nlu-api) -- `NLU_API_GIT_BRANCH` in `Makefile`
- [ondewo-proto-compiler](https://github.com/ondewo/ondewo-proto-compiler) -- `ONDEWO_PROTO_COMPILER_GIT_BRANCH` in `Makefile`

Other than creating the proto-code, `build` also installs the `dev-dependencies` and changes the owner of the proto-code-files from `root` to the `current user`.

> :white_check_mark: The js-compiler (version ~4.1.1) will prompt to download webpack -- write yes / y to finish the build

## GitHub Repository - Release Automation

The repository is published to GitHub and NPM by the Automated Release Process of ONDEWO.

TODO after PR merge:

- checkout master
  ```shell
  git checkout master
  ```
- pull newest state
  ```shell
  git pull
  ```
- Adjust `ONDEWO_NLU_VERSION` in the `Makefile` <br><br>
- Add new Release Notes to `src/RELEASE.md` in following format:

  ```
  ## Release ONDEWO NLU Js Client X.X.X    <----- Beginning of Notes

  ...<NOTES>...

  *****************                             <----- End of Notes
  ```

- release
  ```shell
  make ondewo_release
  ```
  <br>
  The release process can be divided into 6 Steps:

1. `build` specified version of the `ondewo-nlu-api`
2. `commit and push` all changes in code resulting from the `build`
3. Publish the created `npm` folder to `npmjs.com`
4. Create and push the `release branch` e.g. `release/1.3.20`
5. Create and push the `release tag` e.g. `1.3.20`
6. Create a new `Release` on GitHub

> :warning: The Release Automation checks if the build has created all the proto-code files, but it does not check the code-integrity. Please build and test the generated code prior to starting the release process.

[comment]: <> (END OF GITHUB README)
