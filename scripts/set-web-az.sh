#!/usr/bin/env bash
set -euo pipefail

index_path=${1:?Usage: set-web-az.sh /path/to/index.html}
if [[ ! -f "$index_path" ]]; then
  echo "index.html not found: $index_path" >&2
  exit 1
fi
if ! grep -q 'name="web-availability-zone"' "$index_path"; then
  echo "web-availability-zone meta tag not found: $index_path" >&2
  exit 1
fi

metadata_url=http://169.254.169.254/latest
token=$(curl --noproxy '*' -fsS --connect-timeout 2 --max-time 5 -X PUT \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' "$metadata_url/api/token")
zone=$(curl --noproxy '*' -fsS --connect-timeout 2 --max-time 5 \
  -H "X-aws-ec2-metadata-token: $token" \
  "$metadata_url/meta-data/placement/availability-zone")
if [[ ! "$zone" =~ ^[a-z0-9-]+$ ]]; then
  echo "Unexpected availability zone: $zone" >&2
  exit 1
fi

sed -i -E "s|(<meta name=\"web-availability-zone\" content=\")[^\"]*(\"[^>]*>)|\1${zone}\2|" "$index_path"
echo "WEB availability zone set to $zone in $index_path"
