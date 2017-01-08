// Load plugins
var gulp         = require('gulp');
var sass         = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss    = require('gulp-minify-css');
var jshint       = require('gulp-jshint');
var uglify       = require('gulp-uglify');
var rename       = require('gulp-rename');
var concat       = require('gulp-concat');
var browserify   = require('browserify');
var del          = require('del');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');


// Build SCSS
gulp.task('css', function() {
	return sass('src/scss/main.scss', { style: 'expanded' })
		.pipe(autoprefixer('last 2 version'))
		.pipe(gulp.dest('built/css/'))
		.pipe(rename({suffix: '-min'}))
		.pipe(minifycss())
		.pipe(gulp.dest('built/css/'))
});


// Lint JS
gulp.task('lint', function() {
	return gulp.src('src/js/**/*.js')
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('default'))
});


// Build JS
gulp.task('js', function () {
	var b = browserify({
		entries: 'src/js/main.js',
		debug: true
	});

	return b.bundle()
		.pipe(source('main.js'))
		.pipe(buffer())
		.pipe(gulp.dest('built/js/'))
		.pipe(rename({suffix: '-min'}))
		.pipe(uglify())
		.pipe(gulp.dest('built/js/'))
});


// Copy Images to built directory
gulp.task('images', function() {
	return gulp.src('src/images/**/*').pipe(gulp.dest('built/images/'))
});


// Copy HTML to built directory
gulp.task('copy', function() {
	gulp.src('src/*.html').pipe(gulp.dest('built/'));
});


// Clean out built directory
gulp.task('clean', function(cb) {
	del(['built/**/*'], cb)
});


// Default task
gulp.task('default', ['clean'], function() {
	gulp.start('css', 'lint', 'js', 'images', 'copy');
});


// Watch files for changes
gulp.task('watch', function() {
	gulp.watch('src/**/*.html', ['copy']);
	// Watch .scss files
	gulp.watch('src/scss/**/*.scss', ['css']);
	// Watch .js files
	gulp.watch('src/js/**/*.js', ['lint', 'js']);
	// Watch image files
	gulp.watch('src/images/**/*', ['images']);
});
