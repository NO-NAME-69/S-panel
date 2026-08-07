"""
S Panel - Terminal Module
WebSocket-based terminal using PTY for real shell sessions.
"""

import asyncio
import fcntl
import os
import pty
import select
import struct
import subprocess
import termios

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from auth.middleware import get_current_user_ws
from config import TERMINAL_SHELL

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


@router.websocket("/ws")
async def terminal_websocket(websocket: WebSocket, token: str = ""):
    """WebSocket endpoint for terminal access."""
    # Authenticate
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()

    # Create a pseudo-terminal
    master_fd, slave_fd = pty.openpty()

    # Fork a shell process
    pid = os.fork()

    if pid == 0:
        # Child process
        os.close(master_fd)
        os.setsid()

        # Set the slave as the controlling terminal
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)

        # Redirect stdin/stdout/stderr to the slave PTY
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)

        if slave_fd > 2:
            os.close(slave_fd)

        # Set environment
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['SHELL'] = TERMINAL_SHELL

        # Execute shell
        os.execvpe(TERMINAL_SHELL, [TERMINAL_SHELL, '--login'], env)
    else:
        # Parent process
        os.close(slave_fd)

        # Set master_fd to non-blocking
        flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        try:
            # Task to read from PTY and send to WebSocket
            async def read_from_pty():
                loop = asyncio.get_event_loop()
                while True:
                    try:
                        await asyncio.sleep(0.01)
                        if select.select([master_fd], [], [], 0)[0]:
                            data = os.read(master_fd, 4096)
                            if data:
                                await websocket.send_text(data.decode('utf-8', errors='replace'))
                    except OSError:
                        break
                    except WebSocketDisconnect:
                        break

            # Task to read from WebSocket and write to PTY
            async def write_to_pty():
                while True:
                    try:
                        data = await websocket.receive_text()
                        # Handle resize events
                        if data.startswith('\x1b[RESIZE:'):
                            try:
                                parts = data.replace('\x1b[RESIZE:', '').replace(']', '').split(',')
                                cols, rows = int(parts[0]), int(parts[1])
                                winsize = struct.pack('HHHH', rows, cols, 0, 0)
                                fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                            except (ValueError, IndexError):
                                pass
                        else:
                            os.write(master_fd, data.encode('utf-8'))
                    except WebSocketDisconnect:
                        break
                    except OSError:
                        break

            # Run both tasks concurrently
            read_task = asyncio.create_task(read_from_pty())
            write_task = asyncio.create_task(write_to_pty())

            await asyncio.gather(read_task, write_task, return_exceptions=True)

        except Exception:
            pass
        finally:
            # Cleanup
            os.close(master_fd)
            try:
                os.kill(pid, 9)
                os.waitpid(pid, 0)
            except (ProcessLookupError, ChildProcessError):
                pass
            try:
                await websocket.close()
            except Exception:
                pass
