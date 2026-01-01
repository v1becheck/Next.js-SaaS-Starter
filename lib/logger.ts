// Production logging utility
// Tradeoff: Simple console logging for now. In production, integrate with
// a logging service (e.g., Winston, Pino, or cloud logging like Datadog).

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: any
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  info(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'test') {
      const errorContext = {
        ...context,
        ...(error instanceof Error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }),
      }
      console.error(this.formatMessage('error', message, errorContext))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  // Request logging helper
  logRequest(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
    this.info('Request completed', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId,
    })
  }
}

export const logger = new Logger()

