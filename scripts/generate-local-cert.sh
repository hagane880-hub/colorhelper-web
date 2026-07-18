#!/bin/sh
set -eu

IP_ADDRESS="${1:-}"
CERTIFICATE_DIRECTORY="certificates"

if [ -z "$IP_ADDRESS" ]; then
  echo "使い方: npm run cert -- 192.168.1.54"
  exit 1
fi

mkdir -p "$CERTIFICATE_DIRECTORY"

printf '%s\n' \
  "[req]" \
  "distinguished_name=ca_name" \
  "[ca_name]" \
  "[ca_cert]" \
  "basicConstraints=critical,CA:TRUE" \
  "keyUsage=critical,keyCertSign,cRLSign" \
  "subjectKeyIdentifier=hash" \
  > "$CERTIFICATE_DIRECTORY/ca-ext.cnf"

if [ ! -f "$CERTIFICATE_DIRECTORY/color-helper-ca-key.pem" ] ||
  [ ! -f "$CERTIFICATE_DIRECTORY/color-helper-ca.pem" ] ||
  ! openssl x509 -in "$CERTIFICATE_DIRECTORY/color-helper-ca.pem" -noout -text | grep -q "CA:TRUE"; then
  openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$CERTIFICATE_DIRECTORY/color-helper-ca-key.pem" \
    -out "$CERTIFICATE_DIRECTORY/color-helper-ca.pem" \
    -subj "/CN=ColorHelper Local CA" \
    -config "$CERTIFICATE_DIRECTORY/ca-ext.cnf" \
    -extensions ca_cert
fi

openssl req -newkey rsa:2048 -sha256 -nodes \
  -keyout "$CERTIFICATE_DIRECTORY/server-key.pem" \
  -out "$CERTIFICATE_DIRECTORY/server.csr" \
  -subj "/CN=$IP_ADDRESS"

printf '%s\n' \
  "[server_cert]" \
  "subjectAltName=IP:$IP_ADDRESS" \
  "basicConstraints=CA:FALSE" \
  "keyUsage=digitalSignature,keyEncipherment" \
  "extendedKeyUsage=serverAuth" \
  > "$CERTIFICATE_DIRECTORY/server-ext.cnf"

openssl x509 -req -sha256 -days 825 \
  -in "$CERTIFICATE_DIRECTORY/server.csr" \
  -CA "$CERTIFICATE_DIRECTORY/color-helper-ca.pem" \
  -CAkey "$CERTIFICATE_DIRECTORY/color-helper-ca-key.pem" \
  -CAcreateserial \
  -out "$CERTIFICATE_DIRECTORY/server-cert.pem" \
  -extfile "$CERTIFICATE_DIRECTORY/server-ext.cnf" \
  -extensions server_cert

echo "HTTPS証明書を $IP_ADDRESS 用に生成しました。"
echo "秘密鍵を含む certificates/ は共有しないでください。"
