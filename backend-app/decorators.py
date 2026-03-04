import functools
import logging

from flask import request

logger = logging.getLogger(__name__)


def _get_request_context():
    """Extract request context for logging."""
    request_context = {}

    if request.view_args:
        request_context.update(request.view_args)

    if request.method in ('POST', 'PUT', 'PATCH') and request.is_json:
        request_body = request.get_json(silent=True)
        if isinstance(request_body, dict):
            request_context['body_keys'] = list(request_body.keys())

    return request_context


def _get_response_info(return_value):
    """Extract status and optional error/size from route return value."""
    status_code = 200
    response_obj = return_value

    if isinstance(return_value, tuple):
        response_obj = return_value[0]
        status_code = return_value[1] if len(return_value) > 1 else 200

    response_info = {'status': status_code}

    try:
        response_json = response_obj.get_json(silent=True)

        if isinstance(response_json, dict):
            if 'error' in response_json:
                response_info['error'] = response_json['error']

    except Exception:
        pass

    if hasattr(response_obj, 'get_data'):
        response_bytes = response_obj.get_data()

        if response_bytes:
            response_info['size'] = len(response_bytes)

    return response_info


def _get_result_summary(result):
    """Return a short summary of a result for logging."""
    if result is None:
        return None

    if isinstance(result, (list, str, bytes)):
        return f"len={len(result)}"

    if isinstance(result, dict):
        return f"keys={len(result)}"

    return None


def log_call(func):
    """Decorator that logs function entry, exit, and exceptions. For non-route functions."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        func_name = func.__name__
        logger.info("%s: called", func_name)

        try:
            result = func(*args, **kwargs)
        except Exception as e:
            logger.exception("%s: %s", func_name, e)
            raise

        summary = _get_result_summary(result)
        if summary:
            logger.info("%s: success %s", func_name, summary)
        else:
            logger.info("%s: success", func_name)

        return result

    return wrapper


def log_route(route_func):
    """Decorator that logs route entry, exit, and exceptions."""

    @functools.wraps(route_func)
    def wrapper(*args, **kwargs):
        route_name = route_func.__name__
        request_context = _get_request_context()
        logger.info("%s: request %s", route_name, request_context)

        try:
            return_value = route_func(*args, **kwargs)
        except Exception as e:
            logger.exception("%s: %s", route_name, e)
            raise

        response_info = _get_response_info(return_value)
        status_code = response_info['status']

        if status_code >= 400:
            error_log_suffix = (
                f" error={response_info.get('error', '')!r}"
                if response_info.get('error')
                else ""
            )
            logger.warning(
                "%s: returned %s%s", route_name, status_code, error_log_suffix
            )
        else:
            success_extras = []
            if 'size' in response_info:
                success_extras.append(f"size={response_info['size']}")
            success_log_suffix = (
                " " + " ".join(success_extras) if success_extras else ""
            )
            logger.info(
                "%s: success status=%s%s", route_name, status_code, success_log_suffix
            )

        return return_value

    return wrapper
