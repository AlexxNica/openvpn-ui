# OpenVPN PKI UI

UI to generate client credentials for an OpenVPN server. Authentication middleware can be changed
if not using Google's G Suite.

## Installation

### Configuration

- Copy `config.yml.dist` to `config.yml`
- `sso`: SSO API endpoint, cookie name, see [Mini-SSO Google][1].
- `ca`: Path to your Certificate Authority certificate and key files used by [**OpenVPN instance**][2].
- `ovpn`: The `.ovpn` client configuration that that will be sent along with the generated 
  credentials. Ensure to *keep tokens* for CA/Cert/Key

### Install Dependencies & Run

```
npm install
NODE_ENV=development PORT=3000 node server.js
```

## References

[1]: https://github.com/ipernet/mini-sso-google
[2]: https://openvpn.net/index.php/open-source/documentation/howto.html#pki
