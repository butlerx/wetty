const gulp = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const babel = require('gulp-babel');
const shell = require('gulp-shell');
const del = require('del');

const compress = () =>
  gulp
    .src(['./src/hterm_all.js', './src/wetty.js'])
    .pipe(concat('wetty.js'))
    .pipe(babel())
    .pipe(
      minify({
        ext: {
          min: '.min.js',
        },
        exclude    : ['tasks'],
        noSource   : true,
        ignoreFiles: ['.combo.js', '*.min.js'],
      }),
    )
    .pipe(gulp.dest('./public/wetty'));

gulp.task('default', gulp.series(compress));

gulp.task(
  'upgrade',
  gulp.series(
    shell.task(
      [
        'git clone https://chromium.googlesource.com/apps/libapps',
        'LIBDOT_SEARCH_PATH=$(pwd)/libapps ./libapps/libdot/bin/concat.sh -i ./libapps/hterm/concat/hterm_all.concat -o ./src/hterm_all.js',
      ],
      {
        verbose: true,
      },
    ),
    () => del(['./libapps']),
  ),
);
