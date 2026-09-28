const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const configuredLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
const currentLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

function shouldLog(level) {
  return (LOG_LEVELS[level] ?? LOG_LEVELS.info) <= currentLevel;
}

function formatMessage(level, args) {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level.toUpperCase()}]`, ...args];
}

export const logger = {
  debug: (...args) => {
    if (shouldLog("debug")) console.debug(...formatMessage("debug", args));
  },
  info: (...args) => {
    if (shouldLog("info")) console.info(...formatMessage("info", args));
  },
  warn: (...args) => {
    if (shouldLog("warn")) console.warn(...formatMessage("warn", args));
  },
  error: (...args) => {
    if (shouldLog("error")) console.error(...formatMessage("error", args));
  },
};

export default logger;
