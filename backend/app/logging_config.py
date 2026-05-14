import logging
import sys


def setup_logging():
    """
    Configures logging for the entire application.

    Log levels (lowest to highest severity):
    DEBUG    → detailed info, useful during development
    INFO     → general events ("Worker started", "10 events processed")
    WARNING  → something unexpected but not breaking
    ERROR    → something failed, needs attention
    CRITICAL → system is broken
    """

    # Create a formatter — defines how log messages look
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler — prints logs to terminal
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    # File handler — writes logs to a file
    file_handler = logging.FileHandler("app.log")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.WARNING)  # Only warnings+ go to file

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)