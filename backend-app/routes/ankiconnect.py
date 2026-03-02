"""Proxy for AnkiConnect to avoid CORS when frontend calls from a different origin."""

import logging

import requests
from flask import Blueprint, jsonify, request, Response

logger = logging.getLogger(__name__)

ANKICONNECT_URL = 'http://localhost:8765'
ankiconnect_bp = Blueprint('ankiconnect', __name__, url_prefix='/ankiconnect')


@ankiconnect_bp.route('/', methods=['POST', 'OPTIONS'])
@ankiconnect_bp.route('', methods=['POST', 'OPTIONS'])
def proxy():
    """Forward JSON-RPC requests to AnkiConnect."""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        resp = requests.post(
            ANKICONNECT_URL,
            json=request.get_json(),
            headers={'Content-Type': 'application/json'},
            timeout=10,
        )
        return Response(
            resp.content,
            status=resp.status_code,
            mimetype='application/json',
        )
    except requests.RequestException as e:
        logger.warning("ankiconnect proxy: %s", e)
        return jsonify(
            error='Cannot connect to Anki. Make sure Anki is running and AnkiConnect is installed.',
            errorCode='ANKI_CONNECTION',
        ), 503
