module.exports = function (gulp) {

    var argv = require('yargs').argv;
    var bump = require('gulp-bump');
    var clean = require('gulp-clean');
    var fs = require('fs');
    var git = require('gulp-git');
    var path = require('path');
    var s = require('string');
    var shrinkwrap = require('gulp-shrinkwrap');
    var spawn = require('child_process').spawn;
    var tag_version = require('gulp-tag-version');
    var through = require('through2');
    var _ = require('lodash');

    var branch = argv.branch || 'master';
    var rootDir = path.resolve(argv.rootDir || './');

    if (!s(rootDir).endsWith('/')) {
        rootDir = rootDir + '/';
    }

    var pkg = require(rootDir + './package.json');
    var releaseBranch = 'release-' + pkg.version;

    var readPackageVersion = function(filePath) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')).version;
    };

    var commitIt = function (file, enc, cb) {
        if (file.isNull()) return cb(null, file);
        if (file.isStream()) return cb(new Error('Streaming not supported'));

        var commitMessage = "Bumps version to " + readPackageVersion(file.path);
        gulp.src('./*.json', {cwd: rootDir}).pipe(git.commit(commitMessage, {cwd: rootDir}));
    };

    var paths = {
        versionsToBump: _.map(['package.json', 'bower.json', 'manifest.json'], function (fileName) {
            return rootDir + fileName;
        })
    };

    gulp.task('ensure-clean-workspace', function(cb) {
        git.status({args: '--porcelain'}, function (err, stdout) {
            if (err) throw err;

            if (stdout !== '') {
                cb(new Error('Workspace isn\'t clean, aborting release'));
            } else {
                cb();
            }
        });
    });

    gulp.task('checkout-release-branch', ['checkout-workspace'], function(cb) {
        git.branch(releaseBranch, function(err) {
            if (err) {
                cb(err);
            } else {
                git.checkout(releaseBranch, function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb();
                    }
                });
            }
        });
    });

    function checkoutWorkspace(cb) {
        git.checkout(branch, function (err) {
            if (err) {
                cb(err);
            } else {
                cb();
            }
        });
    }

    gulp.task('checkout-workspace', ['ensure-clean-workspace'], checkoutWorkspace);
    gulp.task('restore-workspace', ['npm-publish'], function(cb) {
        checkoutWorkspace(function(err) {
            if (err) {
                cb(err);
            } else {
                git.branch(releaseBranch, {args: '-D'}, function(err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb();
                    }
                });
            }
        });
    });

    gulp.task('release', [
        'ensure-clean-workspace',
        'checkout-workspace',
        'checkout-release-branch',
        'npm-prune',
        'shrinkwrap-and-commit',
        'tag-and-push',
        'npm-publish',
        'restore-workspace',
        'bump'
    ]);

    gulp.task('npm-prune', ['checkout-release-branch'], function (done) {
        spawn('npm', ['prune'], {stdio: 'inherit'}).on('close', done);
    });

    gulp.task('shrinkwrap-and-commit', ['npm-prune'],
        function() {
            return gulp.src('package.json')
                .pipe(shrinkwrap())
                .pipe(gulp.dest('./'))
                // Add & Commit npm-shrinkwrap.json
                .pipe(git.add())
                .pipe(git.commit('Added npm-shrinkwrap.json'));
        }
    );

    gulp.task('tag-and-push', ['shrinkwrap-and-commit'], function () {
        var pkg = require(rootDir + './package.json');

        return gulp.src('./', {cwd: rootDir})
            .pipe(tag_version({version: pkg.version, cwd: rootDir}))
            .on('end', function () {
                git.push('origin', branch, {args: '--tags', cwd: rootDir});
            });
    });

    var versioning = function () {
        if (argv.minor) {
            return 'minor';
        }
        if (argv.major) {
            return 'major';
        }
        return 'patch';
    };

    gulp.task('bump', ['restore-workspace'], function () {
        gulp.src(paths.versionsToBump, {cwd: rootDir})
            .pipe(bump({type: versioning()}))
            .pipe(gulp.dest('./', {cwd: rootDir}))
            .pipe(through.obj(commitIt))
            .pipe(git.push('origin', branch, {cwd: rootDir}));
    });

    gulp.task('npm-publish', ['tag-and-push'], function (done) {
        if (!pkg.private) {
            spawn('npm', ['publish', rootDir], {stdio: 'inherit'}).on('close', done);
        } else {
            gutil.log('Package is marked private, skipping publishing to npm');
        }
    });

};
