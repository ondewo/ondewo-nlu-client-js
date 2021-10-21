#!/bin/sh

#survey, vtsi, etc.
TARGET_PRODUCT_NAME="$1"
API_VERSION_BRANCH="$2"
TARGET_ROOT_DIRECTORY="$3"

COMPANY_PREFIX="ondewo"
COMPANY_REPO_BASE_URL="https://github.com/ondewo"
CLIENT_TECHNOLOGY="js"

if [ -z "$TARGET_ROOT_DIRECTORY" ]; then
    TARGET_ROOT_DIRECTORY=~/repos
    mkdir -p "$TARGET_ROOT_DIRECTORY"
fi

if [ -z "$API_VERSION_BRANCH" ]; then
    API_VERSION_BRANCH=master
fi

API_REPO_NAME="$COMPANY_PREFIX-$TARGET_PRODUCT_NAME-api"

API_REPO_URL="$COMPANY_REPO_BASE_URL/$API_REPO_NAME"

#TARGET_NAME=$(echo "$API_REPO_NAME" | sed "s/-api/-client-js/")
TARGET_NAME="$COMPANY_PREFIX-$TARGET_PRODUCT_NAME-client-$CLIENT_TECHNOLOGY"

TARGET_REPO_URL="$COMPANY_REPO_BASE_URL/$TARGET_NAME"

REPO_DIR="$TARGET_ROOT_DIRECTORY/$TARGET_NAME"

if [ -d "$REPO_DIR" ]; then
    echo "$REPO_DIR already exists - exitting"
fi

echo "Copying files ..."

mkdir -p "$REPO_DIR"
#directory of script
TEMPLATE_DIR=$(dirname "$0")

cat "$TEMPLATE_DIR/package.json" | \
sed "s/survey/$TARGET_PRODUCT_NAME/g" | \
sed -E "s/\"apiversion\":.+/\"apiversion\": \"$API_VERSION_BRANCH\"/g" \
> "$REPO_DIR/package.json"
echo "Copy package.json -> replace name and version"

cp "$TEMPLATE_DIR/instantiate-js-repo.sh" "$REPO_DIR"
cp "$TEMPLATE_DIR/.gitignore" "$REPO_DIR"

mkdir -p "$REPO_DIR/src"
cp "$TEMPLATE_DIR/src/README.md" "$REPO_DIR/src"
cp "$TEMPLATE_DIR/src/RELEASE.md" "$REPO_DIR/src"

mkdir -p "$REPO_DIR/example"

cp "$TEMPLATE_DIR/example/index.html" "$REPO_DIR/example"
cp "$TEMPLATE_DIR/example/client.js" "$REPO_DIR/example"

CWD=$(pwd)

cd "$REPO_DIR" || exit

git init

cd "$REPO_DIR/src" || exit

git submodule add "$API_REPO_URL"
git submodule update --init --recursive --remote

cd "$REPO_DIR" || exit
git remote add origin "$TARGET_REPO_URL"
#git add -A

npm run checkout-api
npm run build || exit

git add -A
git commit -am "initial commit"
#git push

cd "$CWD"