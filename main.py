#!/usr/bin/env python3

"""
AgentCore Memory Browser - Run script

A web interface for browsing and exploring Amazon Bedrock AgentCore Memory resources.
"""

import argparse
import subprocess
import sys
import webbrowser
import time
import threading


def open_browser(host, port):
    """Open browser after a short delay"""
    time.sleep(2)  # Wait for server to start
    webbrowser.open(f"http://{host}:{port}")


def main():
    """Run the FastAPI application"""
    parser = argparse.ArgumentParser(
        description="AgentCore Memory Browser - A web interface for browsing Amazon Bedrock AgentCore Memory resources",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Start server on default port 8000
  %(prog)s --port 8080        # Start server on port 8080
  %(prog)s --host 0.0.0.0     # Allow connections from any host
  %(prog)s --no-browser       # Start without opening browser
  %(prog)s --no-reload        # Start without auto-reload for production
        """,
    )

    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind the server to (default: 127.0.0.1)",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind the server to (default: 8000)",
    )

    parser.add_argument(
        "--no-browser", action="store_true", help="Don't automatically open the browser"
    )

    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable auto-reload for production use",
    )

    args = parser.parse_args()

    try:
        print("Starting AgentCore Memory Browser...")
        print(f"Server will be available at http://{args.host}:{args.port}")

        # Start browser opening in background
        if not args.no_browser:
            browser_thread = threading.Thread(
                target=open_browser, args=(args.host, args.port)
            )
            browser_thread.daemon = True
            browser_thread.start()

        # Build uvicorn command
        uvicorn_cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "backend:app",
            "--host",
            args.host,
            "--port",
            str(args.port),
        ]

        # Add reload flag unless disabled
        if not args.no_reload:
            uvicorn_cmd.append("--reload")

        # Run FastAPI with uvicorn
        subprocess.run(uvicorn_cmd, check=True)

    except KeyboardInterrupt:
        print("\nApplication stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"Error running FastAPI: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
