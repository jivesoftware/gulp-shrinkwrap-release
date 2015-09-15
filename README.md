gulp-shrinkwrap-release
=============

Provides an automatic way to do a release of your npm modules to Git and publish it to NPM Repository.

## Usage
`npm install gulp-shrinkwrap-release --save-dev`

```javascript
var gulp = require('gulp');
require('gulp-shrinkwrap-release')(gulp);
```

## How it works

1. Checks out a local release branch
2. Shrinkwraps dependencies
3. Create a tag based on version specified in package.json
4. Publish the project to NPM repository
5. Checks out the original branch
6. Bumps the version of package.json, bower.json or/and manifest.json

## How to release

```gulp release```

## How to release from different folder

```gulp release --rootDir=/path/to/project```

## Different ways to bump the version after release

command              | version
---------------------|-----------------
gulp release         | v0.0.1 -> v0.0.2 
gulp release --minor | v0.0.1 -> v0.1.0 
gulp release --major | v0.0.1 -> v1.0.1

### If you want only to bump the version

command              | version
---------------------|-----------------
gulp bump            | v0.0.1 -> v0.0.2 
gulp bump --minor    | v0.0.1 -> v0.1.0 
gulp bump --major    | v0.0.1 -> v1.0.1
 
## How to release from different branch
 
```gulp release --branch=branch_name```

