from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from requests.exceptions import HTTPError, RequestException

app = Flask(__name__)
CORS(app)

LRCLIB_BASE_URL = 'https://lrclib.net'


ALLOWED_SEARCH_PARAMS = {'q', 'track_name', 'artist_name', 'album_name'}


@app.route('/api/search')
def search():
    search_params = {
        param_name: param_value
        for param_name, param_value in request.args.items()
        if param_name in ALLOWED_SEARCH_PARAMS and param_value
    }

    if not search_params.get('q') and not search_params.get('track_name'):
        return jsonify({'error': 'At least one of q or track_name is required'}), 400

    try:
        lrclib_response = requests.get(
            f'{LRCLIB_BASE_URL}/api/search',
            params=search_params,
            # headers={'User-Agent': 'Utanki/1.0 (https://github.com/utanki)'},
            timeout=10,
        )
        lrclib_response.raise_for_status()

        return jsonify(lrclib_response.json())

    except HTTPError:

        return jsonify(lrclib_response.json()), lrclib_response.status_code
        
    except RequestException as e:
        
        return jsonify({'error': 'Failed to reach lyrics service', 'detail': str(e)}), 502


@app.route('/api/lyrics/<int:lyrics_id>')
def get_lyrics(lyrics_id):
    lrclib_response = requests.get(
        f'{LRCLIB_BASE_URL}/api/get/{lyrics_id}',
        timeout=10,
    )

    try:
        lrclib_response.raise_for_status()
    except HTTPError:
        return jsonify(lrclib_response.json()), lrclib_response.status_code

    return jsonify(lrclib_response.json())


if __name__ == '__main__':
    app.run(debug=True)
