import os
import sys
import time
import signal
import platform
import subprocess
import webbrowser
import re
import threading
import atexit
import tempfile
import socket
import json
from pathlib import Path

# 添加 Python 模块路径
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

# ========== 配置参数 ==========
USER_TMP_DIR = BASE_DIR / "user" / "tmp"
USER_LOG_PYTHON_DIR = BASE_DIR / "user" / "log" / "Python"

USER_TMP_DIR.mkdir(parents=True, exist_ok=True)
USER_LOG_PYTHON_DIR.mkdir(parents=True, exist_ok=True)

PID_FILE = USER_TMP_DIR / "server.pid"
LOG_FILE = USER_LOG_PYTHON_DIR / "server.log"

SERVER_HOST = "localhost"
SERVER_PORT = 8000
SERVER_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"

# 健康检查超时（秒）
HEALTH_CHECK_TIMEOUT = 5
# 进程启动超时（秒）
STARTUP_TIMEOUT = 10
# 健康检查重试间隔（秒）
HEALTH_CHECK_INTERVAL = 0.5

# ANSI 转义序列正则
ANSI_ESCAPE = re.compile(r'\x1b\[[0-9;]*m')

# 全局变量
_server_process = None
_log_thread = None
_log_file_handle = None
_shutting_down = False
_temp_script_path = None  # 临时脚本路径，用于清理


def clean_ansi(text):
    """移除 ANSI 转义序列"""
    return ANSI_ESCAPE.sub('', text)


def is_server_running():
    """检查服务器是否运行中（通过PID文件）"""
    if not PID_FILE.exists():
        return False
    try:
        pid = int(PID_FILE.read_text().strip())
        # 检查进程是否存在
        os.kill(pid, 0)
        return True
    except (ValueError, ProcessLookupError, PermissionError, OSError):
        # PID 无效或进程不存在，清理 PID 文件
        PID_FILE.unlink(missing_ok=True)
        return False


def kill_process(pid):
    """强制终止进程（跨平台）"""
    if platform.system() == "Windows":
        subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, check=False)
    else:
        try:
            os.kill(pid, signal.SIGTERM)
            # 等待进程退出（最多3秒）
            for _ in range(30):
                try:
                    os.kill(pid, 0)
                    time.sleep(0.1)
                except ProcessLookupError:
                    break
            # 如果还未退出，强制终止
            try:
                os.kill(pid, 0)
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        except ProcessLookupError:
            pass


def cleanup_pid_file():
    """清理 PID 文件"""
    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except Exception:
            pass


def cleanup_temp_script():
    """清理临时启动脚本"""
    global _temp_script_path
    if _temp_script_path and Path(_temp_script_path).exists():
        try:
            Path(_temp_script_path).unlink()
        except Exception:
            pass
    _temp_script_path = None


def cleanup_process():
    """清理子进程、日志线程和临时文件"""
    global _server_process, _log_thread, _log_file_handle, _shutting_down
    if _shutting_down:
        return
    _shutting_down = True

    # 终止子进程
    if _server_process and _server_process.poll() is None:
        try:
            _server_process.terminate()
            _server_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            _server_process.kill()
        except Exception:
            pass

    # 关闭日志文件
    if _log_file_handle:
        try:
            _log_file_handle.close()
        except Exception:
            pass

    # 清理 PID 文件
    cleanup_pid_file()
    # 清理临时脚本
    cleanup_temp_script()


def check_server_ready(host, port, timeout=HEALTH_CHECK_TIMEOUT):
    """
    通过 HTTP GET /api/ping 检查服务器是否真正就绪
    返回 (是否就绪, 错误信息)
    """
    import urllib.request
    import urllib.error

    url = f"http://{host}:{port}/api/ping"
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, method='GET')
            with urllib.request.urlopen(req, timeout=1) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    if data.get('success'):
                        return True, None
        except (urllib.error.URLError, socket.error, json.JSONDecodeError) as e:
            # 继续等待
            pass
        time.sleep(HEALTH_CHECK_INTERVAL)
    return False, f"服务器在 {timeout} 秒内未响应 /api/ping"


def start_server():
    """启动服务器"""
    global _server_process, _log_thread, _log_file_handle, _temp_script_path

    # 如果已在运行，直接返回
    if is_server_running():
        print("服务器已在运行中。")
        return

    # 清理残留资源
    cleanup_pid_file()
    cleanup_temp_script()

    # 创建临时启动脚本（自动清理）
    run_script = f'''import sys
sys.path.insert(0, r'{BASE_DIR}')
from code.Python.app import create_app
app = create_app()
# 启动应用
app.run(host="{SERVER_HOST}", port={SERVER_PORT}, debug=False, use_reloader=False)
'''
    # 使用临时文件（自动删除）
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as tf:
        tf.write(run_script)
        _temp_script_path = tf.name

    # 构建干净的环境变量
    env = {}
    essential_keys = ['PATH', 'HOME', 'USER', 'LANG', 'LC_ALL', 'TMPDIR', 'TEMP', 'SYSTEMROOT', 'WINDIR']
    for key in essential_keys:
        if key in os.environ:
            env[key] = os.environ[key]
    # 移除可能干扰 Werkzeug 的变量
    env.pop("WERKZEUG_SERVER_FD", None)
    env.pop("WERKZEUG_RUN_MAIN", None)
    env["NO_COLOR"] = "1"

    # 启动子进程
    try:
        _server_process = subprocess.Popen(
            [sys.executable, _temp_script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            bufsize=1,
            env=env
        )
    except Exception as e:
        print(f"启动子进程失败: {e}")
        cleanup_temp_script()
        return

    # 写入 PID 文件
    PID_FILE.write_text(str(_server_process.pid))
    print(f"服务器已启动，PID: {_server_process.pid}，访问地址: {SERVER_URL}")
    print(f"日志输出至: {LOG_FILE}")

    # 注册退出清理
    atexit.register(cleanup_process)

    # 打开日志文件
    _log_file_handle = open(LOG_FILE, "a", encoding="utf-8")

    # 启动日志读取线程
    def reader_thread():
        try:
            for line in iter(_server_process.stdout.readline, ''):
                if not line:
                    break
                if _shutting_down:
                    break
                clean_line = clean_ansi(line)
                _log_file_handle.write(clean_line)
                _log_file_handle.flush()
        except (ValueError, OSError):
            pass
        except Exception as e:
            print(f"日志读取线程错误: {e}")
        finally:
            try:
                _log_file_handle.close()
            except Exception:
                pass

    _log_thread = threading.Thread(target=reader_thread, daemon=True)
    _log_thread.start()

    # 等待进程启动并进行健康检查
    print("等待服务器启动...")
    ready, error = check_server_ready(SERVER_HOST, SERVER_PORT, HEALTH_CHECK_TIMEOUT)
    if ready:
        print(f"服务器已就绪，监听 {SERVER_HOST}:{SERVER_PORT}")
    else:
        # 检查进程是否还活着
        if _server_process.poll() is not None:
            print(f"错误：服务器进程已退出，返回码: {_server_process.returncode}")
            # 尝试读取剩余输出
            try:
                remaining = _server_process.stdout.read()
                if remaining:
                    print(f"最后输出: {remaining}")
            except Exception:
                pass
            cleanup_process()
            return
        else:
            print(f"警告：服务器可能未能正常启动（健康检查超时 {HEALTH_CHECK_TIMEOUT} 秒）")
            print("请检查日志文件:", LOG_FILE)
            # 不终止进程，让用户自行检查
            # 但启动一个监控线程，若进程意外退出则清理
            def monitor():
                _server_process.wait()
                if not _shutting_down:
                    print(f"警告：服务器进程意外退出，返回码: {_server_process.returncode}")
                    cleanup_process()
            threading.Thread(target=monitor, daemon=True).start()


def stop_server():
    """停止服务器"""
    global _server_process

    if not is_server_running():
        print("服务器未运行。")
        return

    try:
        pid = int(PID_FILE.read_text().strip())
        print(f"正在停止服务器 (PID: {pid})...")
        kill_process(pid)
        time.sleep(0.5)

        # 清理 PID 文件
        cleanup_pid_file()
        cleanup_temp_script()

        # 如果有进程对象，等待其退出
        if _server_process and _server_process.poll() is None:
            try:
                _server_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                _server_process.kill()

        print("服务器已停止。")
    except (ValueError, FileNotFoundError):
        print("无法读取 PID 文件，尝试强制清理...")
        cleanup_process()


def view_log():
    """查看服务器日志（实时）"""
    if not LOG_FILE.exists():
        print("服务器日志文件不存在。")
        return

    print(f"正在实时查看服务器日志文件: {LOG_FILE}")
    print("按 'q' 退出日志查看。")

    try:
        import sys, select
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            f.seek(0, 2)  # 跳到文件末尾
            while True:
                if _shutting_down:
                    break
                if select.select([sys.stdin], [], [], 0)[0]:
                    ch = sys.stdin.read(1)
                    if ch.lower() == 'q':
                        print("\n退出日志查看。")
                        break
                line = f.readline()
                if line:
                    print(line, end="")
                else:
                    time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n退出日志查看。")


def open_webpage():
    """打开浏览器"""
    if not is_server_running():
        print("服务器未运行，请先启动服务器。")
        return
    webbrowser.open(SERVER_URL)
    print("已在浏览器中打开网页。")


def exit_script():
    """退出脚本"""
    print("正在退出...")
    cleanup_process()
    print("退出脚本。")
    sys.exit(0)


def show_menu():
    """显示菜单"""
    print("\n" + "=" * 40)
    print("         服务器管理菜单")
    print("=" * 40)
    print("1. 启动服务器")
    print("2. 停止服务器")
    print("3. 打开网页")
    print("4. 查看服务器日志")
    print("5. 退出脚本并关闭服务器")
    print("=" * 40)
    return input("请选择操作 (1-5): ").strip()


def main():
    """主函数"""
    try:
        while True:
            choice = show_menu()
            if choice == '1':
                start_server()
            elif choice == '2':
                stop_server()
            elif choice == '3':
                open_webpage()
            elif choice == '4':
                view_log()
            elif choice == '5':
                exit_script()
            else:
                print("无效选项，请输入 1、2、3、4 或 5。")
    except KeyboardInterrupt:
        print("\n收到中断信号，正在退出...")
        exit_script()


if __name__ == "__main__":
    main()
