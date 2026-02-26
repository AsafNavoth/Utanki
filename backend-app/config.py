import os

LRCLIB_BASE_URL = 'https://lrclib.net'
LRCLIB_ALLOWED_SEARCH_PARAMS = {'q', 'track_name', 'artist_name', 'album_name'}
MAX_LYRICS_CHARS = int(os.environ.get('MAX_LYRICS_CHARS', '5000'))
JAMDICT_DB_PATH = os.environ.get(
    'JAMDICT_DB_PATH',
    os.path.join(os.path.dirname(__file__), 'data', 'jamdict.db'),
)
