 
const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');

//script paths
//var recordingAppFiles = ['src_recording/main.js', 'src_recording/bangle.js', 'src_recording/eSense.js', 'src_recording/helper.js'];
var jsFiles = [
    'app/stepCountScreen.js',
    //'app/dataPlotter.js',
    'app/main.js',
    'app/bangleMenu.js',
    'app/eSenseMenu.js',
    'app/bangle.js',
    'app/eSense.js',
    'app/eSenseHelper.js',
    'app/stepDetection.js',
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


var plotterFiles = [
    'app/dataPlotter.js',
    'app/main.js',
];

gulp.task('plotter', function() {
    return gulp.src(plotterFiles)
        .pipe(concat('plotter.js'))
        .pipe(gulp.dest(jsDest))
        .pipe(rename('plotter.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(jsDest));
});