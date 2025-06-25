//Manual implementation of a logger
// logger.type("message");

/**
 * A class representing a logger that can log messages with different levels of severity.
 */
export default class Logger {
  /**
   * Logs an informational message to the console with a blue color.
   * @param message - The message to log.
   */
  static info(message: unknown) {
    console.log(
      '%c [INFO] ' + JSON.stringify(message),
      'background: rgb(46,46,254);'
    );
  }

  /**
   * Logs an error message to the console with a red color.
   * @param message - The error message to log.
   */
  static error(message: unknown) {
    console.error('%c [ERROR] ' + JSON.stringify(message));
  }

  /**
   * Logs a warning message to the console with a custom color.
   * @param message - The message to log.
   */
  static warn(message: unknown) {
    console.warn(
      '%c [WARN] ' + JSON.stringify(message),
      'background: rgb(141,84,14);'
    );
  }

  /**
   * Logs a debug message to the console with a green color.
   * @param message - The message to log.
   */
  static debug(message: unknown) {
    console.debug(
      '%c [DEBUG] ' + JSON.stringify(message),
      'background: rgb(12,91,12);color: white;'
    );
  }
}
