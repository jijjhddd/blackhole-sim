import os
import sys
import time
import signal
import platform
import subprocess
import webbrowser
import threading
from pathlib import Path

# 添加 Python 模块路径
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

# ========== 配置参数 ==========
PID_FILE = Path("server.pid")
LOG_FILE = Path("server.log")
SERVER_HOST = "localhost"
SERVER_PORT = 8000
SERVER_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"
# =============================

def is_server_running():
    if not PID_FILE.exists():
        return False
    try:
        pid = int(PID_FILE.read_text().strip())
        os.kill(pid, 0)
        return True
    except (ValueError, ProcessLookupError, PermissionError, OSError):
        return False

def kill_process(pid):
    if platform.system() == "Windows":
        subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, check=False)
    else:
        os.kill(pid, signal.SIGTERM)

def start_server():
    if is_server_running():
        print("服务器已在运行中。")
        return

    # 创建启动脚本（加入路径设置）
    run_script = f'''import sys
sys.path.insert(0, r'{BASE_DIR}')
from code.Python.app import create_app
app = create_app()
app.run(host="{SERVER_HOST}", port={SERVER_PORT}, debug=False, use_reloader=False)
'''
    temp_file = Path("_run_server.py")
    temp_file.write_text(run_script, encoding='utf-8')

    log_fp = open(LOG_FILE, "a", encoding="utf-8")
    cmd = [sys.executable, str(temp_file)]
    process = subprocess.Popen(
        cmd,
        stdout=log_fp,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0
    )
    log_fp.close()

    PID_FILE.write_text(str(process.pid))
    print(f"服务器已启动，PID: {process.pid}，访问地址: {SERVER_URL}")
    print(f"日志输出至: {LOG_FILE}")

    time.sleep(1.5)  # 等待服务器初始化
    if not is_server_running():
        print("警告：服务器可能未能正常启动。")

    temp_file.unlink(missing_ok=True)

def stop_server():
    if not is_server_running():
        print("服务器未运行。")
        return
    pid = int(PID_FILE.read_text().strip())
    print(f"正在停止服务器 (PID: {pid})...")
    kill_process(pid)
    PID_FILE.unlink(missing_ok=True)
    print("服务器已停止。")

def view_log():
    log_path = Path("user/log/Python/python.log")
    if not log_path.exists():
        print("Python 日志文件不存在。")
        return

    print(f"正在实时查看 Python 日志文件: {log_path}")
    print("按 'q' 退出日志查看。")
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            f.seek(0, 2)
            import sys, select
            while True:
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
    if not is_server_running():
        print("服务器未运行，请先启动服务器。")
        return
    webbrowser.open(SERVER_URL)
    print("已在浏览器中打开网页。")

def exit_script():
    if is_server_running():
        stop_server()
    print("退出脚本。")
    sys.exit(0)

def show_menu():
    print("\n" + "=" * 40)
    print("         服务器管理菜单")
    print("=" * 40)
    print("1. 启动服务器")
    print("2. 停止服务器")
    print("3. 打开网页")
    print("4. 查看 Python 日志")
    print("5. 退出脚本并关闭服务器")
    print("=" * 40)
    return input("请选择操作 (1-5): ").strip()

def main():
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
