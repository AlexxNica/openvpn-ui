# OpenVPN GUI

- Provides a small web service to generate credentials for an OpenVPN instance
- Must be installed along with a PKI provided by [easy-rsa](https://github.com/OpenVPN/easy-rsa)

## TODO

- Rewrite UI
- Authorization

## Setup

- Create a file called `config.yml` as follows using `config.yml.dist` as reference
- Install dependencies via `npm install`
- Run server via `node server.js`

## Docker/Compose

- Will build and run this app on `localhost:9000`
- Will also launch an OpenVPN container providing the PKI certs
- Useful for development, definitely _not intended for production usage_
- Note: the `ca` container will only generate the PKI and then exit with code 0

## Testing the API

- Generate cert:

  ```sh
  DATA='{"name": "someuser", "passphrase": "abc123"}'
  curl -XPOST -d "$DATA" -H"Content-type: application/json" localhost:9000/certs
  ```

- Get openvpn config:

  ```sh
  curl localhost:9000/configs/my-vpn/someuser.ovpn
  ```

## PKI

- See [setup-keys](openvpn/setup-keys/sh) for an example how to generate keys
- Development server uses dump DH params, prod should use `./easy-rsa gen-dh`
