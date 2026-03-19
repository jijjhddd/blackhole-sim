from flask import Blueprint, request, jsonify
from .state_manager import save_state, load_state, list_saves, delete_state, delete_all_states, copy_state, rename_state
from .log_manager import js_log_manager, log_python

api_bp = Blueprint('api', __name__)

@api_bp.route('/save', methods=['POST'])
def api_save():
    """保存状态"""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "无数据"}), 400
    name = data.get('name')
    result = save_state(data.get('state', {}), name)
    return jsonify(result)

@api_bp.route('/load', methods=['GET'])
def api_load():
    """加载状态"""
    name = request.args.get('name')
    if not name:
        return jsonify({"success": False, "error": "缺少 name 参数"}), 400
    result = load_state(name)
    return jsonify(result)

@api_bp.route('/delete', methods=['DELETE'])
def api_delete():
    """删除单个存档"""
    name = request.args.get('name')
    if not name:
        return jsonify({"success": False, "error": "缺少 name 参数"}), 400
    result = delete_state(name)
    return jsonify(result)

@api_bp.route('/delete_all', methods=['DELETE'])
def api_delete_all():
    """删除所有存档"""
    result = delete_all_states()
    return jsonify(result)

@api_bp.route('/copy', methods=['POST'])
def api_copy():
    """复制存档"""
    data = request.get_json()
    if not data or 'source' not in data:
        return jsonify({"success": False, "error": "缺少 source 参数"}), 400
    source = data['source']
    target = data.get('target')
    result = copy_state(source, target)
    return jsonify(result)

@api_bp.route('/rename', methods=['POST'])
def api_rename():
    """重命名存档"""
    data = request.get_json()
    if not data or 'source' not in data or 'target' not in data:
        return jsonify({"success": False, "error": "缺少 source 或 target 参数"}), 400
    result = rename_state(data['source'], data['target'])
    return jsonify(result)

@api_bp.route('/saves', methods=['GET'])
def api_list_saves():
    """列出所有保存"""
    saves = list_saves()
    return jsonify({"success": True, "saves": saves})

@api_bp.route('/jslog', methods=['POST'])
def api_js_log():
    """接收前端发送的 JavaScript 日志"""
    log_entry = request.get_json()
    if not log_entry:
        return jsonify({"success": False}), 400
    js_log_manager.add_log(log_entry)
    return jsonify({"success": True})

@api_bp.route('/jslog', methods=['GET'])
def api_get_js_logs():
    """获取 JavaScript 日志"""
    limit = request.args.get('limit', type=int)
    level = request.args.get('level')
    logs = js_log_manager.get_logs(limit, level)
    return jsonify({"success": True, "logs": logs})

@api_bp.route('/jslog/clear', methods=['POST'])
def api_clear_js_logs():
    """清空 JavaScript 日志"""
    js_log_manager.clear_logs()
    return jsonify({"success": True})
