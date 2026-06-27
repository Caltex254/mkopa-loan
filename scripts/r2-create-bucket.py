#!/usr/bin/env python3
"""Create the R2 bucket for KYC uploads and verify access."""
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import sys

R2_KEY = "1b3cb6073eea9d6d80b856d51e112ebc"
R2_SECRET = "1d5420fd4e2cae26917406095a20e1a74470335cd2828292bd1958dcdc5e16d2"
R2_ENDPOINT = "https://d7054cc8725155630503ec7d96c6acfb.r2.cloudflarestorage.com"
R2_BUCKET = "mkopa-loan-kyc"

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_KEY,
    aws_secret_access_key=R2_SECRET,
    region_name="auto",
    config=Config(signature_version="s3v4"),
)

# Try list-buckets first — this verifies credentials work
print("=== List buckets ===")
try:
    resp = s3.list_buckets()
    if resp.get("Buckets"):
        for b in resp["Buckets"]:
            print(f"  - {b['Name']} (created {b['CreationDate']})")
    else:
        print("  (no buckets yet)")
except ClientError as e:
    print(f"  ERROR: {e.response.get('Error', {}).get('Code')}: {e.response.get('Error', {}).get('Message')}")
    sys.exit(1)

# Create the bucket if it doesn't exist
print(f"\n=== Create bucket '{R2_BUCKET}' ===")
existing = {b["Name"] for b in resp.get("Buckets", [])}
if R2_BUCKET in existing:
    print(f"  Bucket '{R2_BUCKET}' already exists")
else:
    try:
        # R2 doesn't use us-east-1 as a location constraint; just create without LocationConstraint
        s3.create_bucket(Bucket=R2_BUCKET)
        print(f"  Bucket '{R2_BUCKET}' created successfully")
    except ClientError as e:
        print(f"  ERROR: {e.response.get('Error', {}).get('Code')}: {e.response.get('Error', {}).get('Message')}")
        sys.exit(1)

# Test put + get + delete to verify write access
print(f"\n=== Test write/read/delete on '{R2_BUCKET}' ===")
test_key = "_smoke_test_%d.txt" % __import__("time").time()
try:
    s3.put_object(Bucket=R2_BUCKET, Key=test_key, Body=b"smoke test ok", ContentType="text/plain")
    print(f"  PUT object '{test_key}' OK")
    obj = s3.get_object(Bucket=R2_BUCKET, Key=test_key)
    body = obj["Body"].read()
    assert body == b"smoke test ok", f"unexpected body: {body!r}"
    print(f"  GET object '{test_key}' OK (body={body!r})")
    s3.delete_object(Bucket=R2_BUCKET, Key=test_key)
    print(f"  DELETE object '{test_key}' OK")
except ClientError as e:
    print(f"  ERROR: {e.response.get('Error', {}).get('Code')}: {e.response.get('Error', {}).get('Message')}")
    sys.exit(1)

print("\n✅ R2 is fully working.")
