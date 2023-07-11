 
const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');

//script paths
//var jsFiles = ['src/main.js', 'src/bangle.js', 'src/eSense.js', 'src/helper.js'];
var jsFiles = [
    'app/main.js',
    'app/bangleMenu.js',
    'app/eSenseMenu.js',
    'app/bangle.js',
    'app/eSense.js',
    'app/eSenseHelper.js',
];
let jsDest = 'out';


gulp.task('default', function() {
    return gulp.src(jsFiles)
        .pipe(concat('app.js'))
        .pipe(gulp.dest(jsDest))
        .pipe(rename('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(jsDest));
});

