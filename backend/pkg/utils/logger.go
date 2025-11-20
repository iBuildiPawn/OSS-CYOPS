package utils

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Logger is the global logger instance
var Logger zerolog.Logger

// InitLogger initializes the global logger with configuration
func InitLogger(isDevelopment bool) {
	zerolog.TimeFieldFormat = time.RFC3339

	if isDevelopment {
		// Pretty console output for development
		output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
		Logger = zerolog.New(output).With().Timestamp().Caller().Logger()
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		// JSON output for production
		Logger = zerolog.New(os.Stdout).With().Timestamp().Caller().Logger()
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	log.Logger = Logger
	Logger.Info().Msg("Logger initialized")
}

// Info logs an info message
func Info(msg string) {
	Logger.Info().Msg(msg)
}

// Debug logs a debug message
func Debug(msg string) {
	Logger.Debug().Msg(msg)
}

// Error logs an error message
func Error(err error, msg string) {
	Logger.Error().Err(err).Msg(msg)
}

// Fatal logs a fatal message and exits
func Fatal(err error, msg string) {
	Logger.Fatal().Err(err).Msg(msg)
}

// Warn logs a warning message
func Warn(msg string) {
	Logger.Warn().Msg(msg)
}

// WithField creates a logger with a custom field
func WithField(key string, value interface{}) zerolog.Logger {
	return Logger.With().Interface(key, value).Logger()
}

// WithFields creates a logger with multiple custom fields
func WithFields(fields map[string]interface{}) zerolog.Logger {
	ctx := Logger.With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	return ctx.Logger()
}
