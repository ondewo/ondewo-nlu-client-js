<div align="center">
  <table>
    <tr>
      <td>
        <a href="https://ondewo.com/en/products/natural-language-understanding/">
            <img width="400px" src="https://raw.githubusercontent.com/ondewo/ondewo-logos/master/ondewo_we_automate_your_phone_calls.png"/>
        </a>
      </td>
    </tr>
    <tr>
       <td align="center">
          <a href="https://www.linkedin.com/company/ondewo "><img width="40px" src="https://cdn-icons-png.flaticon.com/512/3536/3536505.png"></a>
          <a href="https://www.facebook.com/ondewo"><img width="40px" src="https://cdn-icons-png.flaticon.com/512/733/733547.png"></a>
          <a href="https://twitter.com/ondewo"><img width="40px" src="https://cdn-icons-png.flaticon.com/512/733/733579.png"> </a>
          <a href="https://www.instagram.com/ondewo.ai/"><img width="40px" src="https://cdn-icons-png.flaticon.com/512/174/174855.png"></a>
          <a href="https://badge.fury.io/js/%40ondewo%2Fondewo-nlu-client-js"><img src="https://badge.fury.io/js/%40ondewo%2Fondewo-nlu-client-js.svg" alt="npm version" height="32"></a>
       </td>
    </tr>
  </table>
  <h1 align="center">
    ONDEWO NLU Client Javascript
  </h1>
</div>

## Overview

`@ondewo/nlu-client-js` is a compiled version of the [ONDEWO NLU API](https://github.com/ondewo/ondewo-nlu-api) using the [ONDEWO PROTO COMPILER](https://github.com/ondewo/ondewo-proto-compiler). Here you can find the NLU API [documentation](https://ondewo.github.io).

ONDEWO APIs use [Protocol Buffers](https://github.com/google/protobuf) version 3 (proto3) as their Interface Definition Language (IDL) to define the API interface and the structure of the payload messages. The same interface definition is used for gRPC versions of the API in all languages.

## Setup

Using NPM:

```shell
npm i --save @ondewo/ondewo-nlu-client-js
```

Using GitHub:

```shell
git clone https://github.com/ondewo/ondewo-nlu-client-js.git ## Clone repository
cd ondewo-nlu-client-js                                      ## Change into repo-directoy
make setup_developer_environment_locally                     ## Install dependencies
```

```
npm
├── api
│   ├── ondewo_nlu_api.js
│   ├── ondewo_nlu_api.min.js
│   └── ondewo_nlu_api.min.js.map
├── auth
│   └── offlineTokenProvider.js
├── LICENSE
├── package.json
└── README.md
```

## Authentication (Keycloak bearer)

Auth is bearer-only. Every gRPC-web call must carry a short-lived Keycloak **bearer** access token in the `Authorization` metadata header.

Obtain and auto-refresh a token with the offline-token helper shipped in `auth/offlineTokenProvider.js`. Its `login()` performs a one-time ROPC login (`grant_type=password`, `scope=offline_access`) against the **public** SDK client `ondewo-nlu-cai-sdk-public` (no client secret) and refreshes the access token in the background until it lapses.

```js
const { login } = require('@ondewo/ondewo-nlu-client-js/auth/offlineTokenProvider');

const provider = await login({
    keycloakUrl: 'https://localhost:8443/auth',
    realm: 'ondewo-ccai-platform',
    clientId: 'ondewo-nlu-cai-sdk-public',
    username: 'tech-user@example.com',
    password: 'super-secret'
});

const client = new AgentsPromiseClient('https://localhost:8443', null, null);
const metadata = { Authorization: provider.getAuthorizationHeader() };
const response = await client.listAgents(request, metadata);

provider.stop(); // stop the background refresh loop when done
```

## Build

- [ondewo-proto-compiler](https://github.com/ondewo/ondewo-proto-compiler) -- `ONDEWO_PROTO_COMPILER_GIT_BRANCH` in `Makefile`

> :white_check_mark: The js-compiler (version ~4.1.1) will prompt to download webpack -- write yes / y to finish the build

## GitHub Repository - Release Automation

The repository is published to GitHub and NPM by the Automated Release Process of ONDEWO.

TODO after PR merge:

- checkout master

  git checkout master

- pull newest state

  ```shell
  git pull

- Adjust `ONDEWO_NLU_VERSION` in the `Makefile` <br><br>

- Add new Release Notes to `src/RELEASE.md` in following format:

  ## Release ONDEWO NLU Js Client X.X.X    <----- Beginning of Notes

  ...<NOTES>...

  *****************                             <----- End of Notes

  ```

- release

  make ondewo_release

  ```

The release process can be divided into 6 Steps:

1. `build` specified version of the `ondewo-nlu-api`
2. `commit and push` all changes in code resulting from the `build`
3. Publish the created `npm` folder to `npmjs.com`
4. Create and push the `release branch` e.g. `release/1.3.20`
5. Create and push the `release tag` e.g. `1.3.20`
6. Create a new `Release` on GitHub

> :warning:  The Release Automation checks if the build has created all the proto-code files, but it does not check the code-integrity. Please build and test the generated code prior to starting the release process.
