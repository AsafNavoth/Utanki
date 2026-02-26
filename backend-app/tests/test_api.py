import requests_mock
from unittest.mock import patch

from config import LRCLIB_BASE_URL, MAX_LYRICS_CHARS
from lyrics_tokenizer import JamdictNotAvailableError, remove_english_letters, _should_keep_token


def test_should_keep_token_filters_single_hiragana_and_punctuation():
    assert _should_keep_token('桜') is True
    assert _should_keep_token('花') is True
    assert _should_keep_token('咲い') is True
    assert _should_keep_token('の') is False
    assert _should_keep_token('が') is False
    assert _should_keep_token('、') is False
    assert _should_keep_token('。') is False
    assert _should_keep_token('') is False


def test_remove_english_letters_strips_ascii_letters():
    assert remove_english_letters('Hello 世界') == '世界'
    assert remove_english_letters('桜の花が咲いた') == '桜の花が咲いた'
    assert remove_english_letters('I love 日本') == '日本'
    assert remove_english_letters('abc') == ''
    assert remove_english_letters('   spaces   between   ') == ''


def test_search_returns_400_when_no_query_params(client):
    response = client.get('/api/search')

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'At least one of q or track_name is required'
    }


def test_search_returns_400_when_empty_query(client):
    response = client.get('/api/search', query_string={'q': ''})

    assert response.status_code == 400


def test_search_returns_results_when_q_provided(client):
    mock_results = [
        {
            'id': 123,
            'trackName': 'Test Song',
            'artistName': 'Test Artist',
            'albumName': 'Test Album',
            'duration': 180,
            'instrumental': False,
        }
    ]

    with requests_mock.Mocker() as mock:
        mock.get(
            f'{LRCLIB_BASE_URL}/api/search',
            json=mock_results,
        )

        response = client.get('/api/search', query_string={'q': 'test song'})

    assert response.status_code == 200
    assert response.get_json() == mock_results


def test_search_forwards_only_allowed_params(client):
    with requests_mock.Mocker() as mock:
        mock.get(f'{LRCLIB_BASE_URL}/api/search', json=[])

        client.get(
            '/api/search',
            query_string={
                'q': 'test',
                'track_name': 'song',
                'artist_name': 'artist',
                'album_name': 'album',
                'disallowed_param': 'ignored',
            },
        )

        request_history = mock.request_history
        assert len(request_history) == 1
        assert request_history[0].qs == {
            'q': ['test'],
            'track_name': ['song'],
            'artist_name': ['artist'],
            'album_name': ['album'],
        }


def test_search_works_with_track_name_only(client):
    with requests_mock.Mocker() as mock:
        mock.get(f'{LRCLIB_BASE_URL}/api/search', json=[])

        response = client.get(
            '/api/search',
            query_string={'track_name': '22'},
        )

    assert response.status_code == 200


def test_get_lyrics_returns_lyrics_for_valid_id(client):
    mock_lyrics = {
        'id': 3396226,
        'trackName': '桜',
        'artistName': 'Test Artist',
        'albumName': 'Test Album',
        'duration': 233,
        'instrumental': False,
        'plainLyrics': '桜の花が咲いた',
        'syncedLyrics': '[00:17.12] 桜の花が咲いた',
    }

    with requests_mock.Mocker() as mock:
        mock.get(
            f'{LRCLIB_BASE_URL}/api/get/3396226',
            json=mock_lyrics,
        )

        response = client.get('/api/lyrics/3396226')

    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == mock_lyrics['id']
    assert data['plainLyrics'] == mock_lyrics['plainLyrics']


@patch('anki_deck.tokenize_lyrics')
def test_export_anki_returns_apkg_file(mock_tokenize, client):
    mock_tokenized = [
        ('桜', {'entries': [{'kanji': [{'text': '桜'}], 'kana': [{'text': 'さくら'}], 'senses': [{'SenseGloss': [{'text': 'cherry tree', 'lang': 'eng'}]}]}], 'names': [], 'chars': []}),
        ('花', {'entries': [{'kanji': [{'text': '花'}], 'kana': [{'text': 'はな'}], 'senses': [{'SenseGloss': [{'text': 'flower', 'lang': 'eng'}]}]}], 'names': [], 'chars': []}),
    ]
    mock_tokenize.return_value = mock_tokenized

    lyrics_data = {
        'id': 3396226,
        'trackName': '桜',
        'artistName': 'Test Artist',
        'plainLyrics': '桜の花が咲いた',
    }

    response = client.post(
        '/api/lyrics/anki',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )

    assert response.status_code == 200
    assert response.content_type == 'application/octet-stream'
    assert 'attachment' in response.headers.get('Content-Disposition', '')
    header = response.headers.get('Content-Disposition', '')
    assert 'filename="utanki.apkg"' in header
    assert len(response.data) > 100


def test_export_anki_returns_400_when_no_body(client):
    response = client.post(
        '/api/lyrics/anki',
        json=None,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code in (400, 415)


def test_export_anki_returns_413_when_text_too_long(client):
    lyrics_data = {
        'trackName': 'Test',
        'artistName': 'Artist',
        'plainLyrics': 'あ' * (MAX_LYRICS_CHARS + 1),
    }
    response = client.post(
        '/api/lyrics/anki',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 413
    assert f'Max {MAX_LYRICS_CHARS} characters' in response.get_json()['error']


@patch('anki_deck.tokenize_lyrics', side_effect=JamdictNotAvailableError('Jamdict database is not available.'))
def test_export_anki_returns_503_when_jamdict_unavailable(mock_tokenize, client):
    lyrics_data = {
        'trackName': 'Test',
        'artistName': 'Artist',
        'plainLyrics': '桜の花',
    }
    response = client.post(
        '/api/lyrics/anki',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 503
    assert 'Jamdict' in response.get_json()['error']


@patch('anki_deck.tokenize_lyrics', return_value=[('花', {'entries': [{'kanji': [{'text': '花'}], 'kana': [{'text': 'はな'}], 'senses': [{'SenseGloss': [{'text': 'flower', 'lang': 'eng'}]}]}], 'names': [], 'chars': []})])
def test_export_anki_uses_static_filename(mock_tokenize, client):
    lyrics_data = {
        'trackName': 'bad"name\r\nx:/track',
        'artistName': 'Artist',
        'plainLyrics': '花',
    }
    response = client.post(
        '/api/lyrics/anki',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 200
    header = response.headers.get('Content-Disposition', '')
    assert header == 'attachment; filename="utanki.apkg"'


@patch('anki_deck.tokenize_lyrics', return_value=[])
def test_export_anki_returns_422_when_no_cards(mock_tokenize, client):
    lyrics_data = {
        'trackName': 'Test',
        'artistName': 'Artist',
        'plainLyrics': 'Hello world',
    }
    response = client.post(
        '/api/lyrics/anki',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 422
    assert 'No vocabulary cards' in response.get_json()['error']


@patch('anki_deck.tokenize_lyrics')
def test_export_anki_returns_422_when_no_definitions_found(mock_tokenize, client):
    mock_tokenize.return_value = [
        ('word1', {'entries': [], 'names': [], 'chars': []}),
        ('word2', {'entries': [], 'names': [], 'chars': []}),
    ]

    lyrics_data = {
        'trackName': 'Test',
        'artistName': 'Artist',
        'plainLyrics': 'word1 word2',
    }
    response = client.post(
        '/api/lyrics/anki',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 422
    assert 'No definitions found' in response.get_json()['error']


def test_get_lyrics_returns_404_when_not_found(client):
    with requests_mock.Mocker() as mock:
        mock.get(
            f'{LRCLIB_BASE_URL}/api/get/999999999',
            status_code=404,
            json={
                'code': 404,
                'name': 'TrackNotFound',
                'message': 'Failed to find specified track',
            },
        )

        response = client.get('/api/lyrics/999999999')

    assert response.status_code == 404
