#!/bin/bash

PKI_DIR="/etc/openvpn"
SERVER_CERT="${PKI_DIR}/pki/issued/server.crt"


if [ -f "$SERVER_CERT" ]
then
  echo "Reusing existing certs"
  exit
fi

cp -R /usr/share/easy-rsa/* $PKI_DIR
cd $PKI_DIR

./easyrsa init-pki
echo "My OpenVPN" | ./easyrsa build-ca nopass

./easyrsa build-server-full server nopass
./easyrsa gen-crl

# needs to readable by openvpn running as nobody:nobody
cp -rfp pki/crl.pem .
chmod 644 crl.pem

cp /setup/dh.pem $PKI_DIR/pki/
