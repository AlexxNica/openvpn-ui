# OpenVPN GUI

- Provides a small web service to generate credentials for an OpenVPN infrastructure
- It supports multiple VPN endpoints using the same CA
- Must be installed along with the CA provided by [easy-rsa](https://github.com/OpenVPN/easy-rsa)
- It is not wise to expose this to the public - preferrably use intranet or an IP filter

## TODO

- List certificates
- Revoke certificates
- Friendly error page
- Password generation

## Setup

- Create a file called `config.yml` using `config.yml.dist` as reference
- Create and set Github client secrets if you want auth, must be set as env vars
- Install dependencies: `npm install`
- Run server: `node server.js`

## Docker/Compose

- Will build and run this app on `localhost:9000`
- Will also launch an OpenVPN container providing the PKI certs
- Useful for development, definitely _not intended for production usage_
- Note: the `ca` container will only generate the PKI and then exit with code `0`

```sh
GITHUB_CLIENT_ID=<your-client-id-here>
GITHUB_CLIENT_SECRET=<your-secret-here>
make up
```

## Authorization

- So far supports Github OAuth server side flow
- You need to register an app to obtain a client id and client secret
- Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in your shell

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

- See [setup-certs.sh](openvpn/setup-certs.sh) for an example how to generate CA certs and keys
- Development server uses dummy DH params, prod should use `./easy-rsa gen-dh`
