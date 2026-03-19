import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from .config import USER_DATA_DIR, STATE_FILE_EXT
from .log_manager import log_python

def save_state(data, name=None):
    """保存状态到文件"""
    if not name:
        name = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 清理文件名中的非法字符
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    if not safe_name:
        safe_name = "unnamed"
    filename = USER_DATA_DIR / f"{safe_name}{STATE_FILE_EXT}"
    # 避免覆盖，如果存在则添加数字后缀
    counter = 1
    while filename.exists():
        filename = USER_DATA_DIR / f"{safe_name}_{counter}{STATE_FILE_EXT}"
        counter += 1
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        log_python('info', f"状态已保存: {filename}")
        return {"success": True, "filename": str(filename), "name": filename.stem}
    except Exception as e:
        log_python('error', f"保存状态失败: {e}")
        return {"success": False, "error": str(e)}

def load_state(name):
    """加载指定名称的状态"""
    # 查找匹配的文件（可能包含空格等）
    for f in USER_DATA_DIR.glob(f"*{STATE_FILE_EXT}"):
        if f.stem == name:
            filename = f
            break
    else:
        return {"success": False, "error": "文件不存在"}
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        log_python('info', f"状态已加载: {filename}")
        return {"success": True, "data": data}
    except Exception as e:
        log_python('error', f"加载状态失败: {e}")
        return {"success": False, "error": str(e)}

def delete_state(name):
    """删除指定名称的存档"""
    for f in USER_DATA_DIR.glob(f"*{STATE_FILE_EXT}"):
        if f.stem == name:
            try:
                f.unlink()
                log_python('info', f"存档已删除: {f}")
                return {"success": True}
            except Exception as e:
                log_python('error', f"删除存档失败: {e}")
                return {"success": False, "error": str(e)}
    return {"success": False, "error": "文件不存在"}

def delete_all_states():
    """删除所有存档"""
    count = 0
    errors = []
    for f in USER_DATA_DIR.glob(f"*{STATE_FILE_EXT}"):
        try:
            f.unlink()
            count += 1
        except Exception as e:
            errors.append(str(f))
            log_python('error', f"删除 {f} 失败: {e}")
    log_python('info', f"已删除 {count} 个存档")
    return {"success": True, "count": count, "errors": errors}

def copy_state(source_name, target_name=None):
    """复制存档"""
    source_file = None
    for f in USER_DATA_DIR.glob(f"*{STATE_FILE_EXT}"):
        if f.stem == source_name:
            source_file = f
            break
    if not source_file:
        return {"success": False, "error": "源文件不存在"}
    
    if not target_name:
        target_name = f"{source_name}_copy"
    # 确保目标文件名唯一
    target_file = USER_DATA_DIR / f"{target_name}{STATE_FILE_EXT}"
    counter = 1
    while target_file.exists():
        target_file = USER_DATA_DIR / f"{target_name}_{counter}{STATE_FILE_EXT}"
        counter += 1
    try:
        shutil.copy2(source_file, target_file)
        log_python('info', f"存档已复制: {source_file} -> {target_file}")
        return {"success": True, "target": target_file.stem}
    except Exception as e:
        log_python('error', f"复制存档失败: {e}")
        return {"success": False, "error": str(e)}

def rename_state(source_name, target_name):
    """重命名存档"""
    source_file = None
    for f in USER_DATA_DIR.glob(f"*{STATE_FILE_EXT}"):
        if f.stem == source_name:
            source_file = f
            break
    if not source_file:
        return {"success": False, "error": "源文件不存在"}
    target_file = USER_DATA_DIR / f"{target_name}{STATE_FILE_EXT}"
    if target_file.exists():
        return {"success": False, "error": "目标名称已存在"}
    try:
        source_file.rename(target_file)
        log_python('info', f"存档已重命名: {source_file} -> {target_file}")
        return {"success": True}
    except Exception as e:
        log_python('error', f"重命名失败: {e}")
        return {"success": False, "error": str(e)}

def list_saves():
    """列出所有保存的状态文件"""
    files = USER_DATA_DIR.glob(f"*{STATE_FILE_EXT}")
    saves = []
    for f in files:
        saves.append({
            "name": f.stem,
            "path": str(f),
            "mtime": f.stat().st_mtime
        })
    saves.sort(key=lambda x: x['mtime'], reverse=True)
    return saves
