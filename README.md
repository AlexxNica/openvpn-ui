# OpenVPN GUI

- Provides a small web service to generate credentials for an OpenVPN [PKI](https://en.wikipedia.org/wiki/Public_key_infrastructure)
- Supports multiple VPN endpoints using the same CA
- It is not wise to expose this to the public - preferrably use intranet or an IP filter

## TODO

- List certificates
- Revoke certificates
- Friendly error page
- Password generation

## Usage

- Initialize a certificate authority, e.g. using [easy-rsa](https://github.com/OpenVPN/easy-rsa)
- Create `config.yml` using `config.yml.dist` as reference
- Create and set Github client secrets if you want auth, must be set in env
- Install dependencies: `npm install`
- Run server: `node server.js`

### Certificate Authority/PKI

- Neither OpenVPN nor the CA certs are part of this container (yet)
- It is assumed that the CA certs will be provided as mounted volumes
- For _testing_ [docker-compose.yml](./docker-compose.yaml) will provide a dummy CA
- See [setup-certs.sh](openvpn/setup-certs.sh) for how to generate CA certs and keys

### Docker/Compose

- Will build and run this app on `localhost:9000`
- OpenVPN container providing the PKI certs
- Useful for development, _not intended for production_
- Note: the `ca` container will only generate the PKI and then exit with code `0`

```sh
export GITHUB_CLIENT_ID=<your-client-id-here>
export GITHUB_CLIENT_SECRET=<your-secret-here>
make up
```

## Authorization

- Technically extensible/pluggable 
- So far only a Github OAuth provider is included

### Github OAuth

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

- 
- Development server uses dummy DH params, prod should use `./easy-rsa gen-dh`
