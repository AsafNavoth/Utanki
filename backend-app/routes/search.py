from flask import Blueprint, request, jsonify
import requests
from requests.exceptions import HTTPError, RequestException

from config import LRCLIB_ALLOWED_SEARCH_PARAMS, LRCLIB_BASE_URL
from decorators import log_route

search_bp = Blueprint('search', __name__)


@search_bp.route('/search')
@log_route
def search():
    """Search for lyrics in Lrclib. Accepts query params (q, track_name, etc).
    Requires at least one of q or track_name. Returns matching tracks."""
    search_params = {
        param_name: param_value
        for param_name, param_value in request.args.items()
        if param_name in LRCLIB_ALLOWED_SEARCH_PARAMS and param_value
    }

    if not search_params.get('q') and not search_params.get('track_name'):
        return jsonify({'error': 'At least one of q or track_name is required'}), 400

    try:
        lrclib_response = requests.get(
            f'{LRCLIB_BASE_URL}/api/search',
            params=search_params,
            timeout=10,
        )
        lrclib_response.raise_for_status()
        data = lrclib_response.json()
        return jsonify(data)

    except HTTPError:
        return jsonify(lrclib_response.json()), lrclib_response.status_code

    except RequestException as error:
        return (
            jsonify({'error': 'Failed to reach lyrics service', 'detail': str(error)}),
            502,
        )
