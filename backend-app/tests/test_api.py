import requests_mock
from unittest.mock import patch

from config import LRCLIB_BASE_URL
from lyrics_tokenizer import (
    get_sentence_for_word,
    remove_non_japanese_chars,
    _should_keep_token,
)


def test_should_keep_token_filters_single_hiragana_and_punctuation():
    assert _should_keep_token('桜')
    assert _should_keep_token('花')
    assert _should_keep_token('咲い')
    assert not _should_keep_token('の')
    assert not _should_keep_token('が')
    assert not _should_keep_token('た')
    assert not _should_keep_token('、')
    assert not _should_keep_token('。')
    assert not _should_keep_token('')


def test_remove_non_japanese_chars_strips_non_japanese():
    assert remove_non_japanese_chars('Hello 世界') == '世界'
    assert remove_non_japanese_chars('桜の花が咲いた') == '桜の花が咲いた'
    assert remove_non_japanese_chars('I love 日本') == '日本'
    assert remove_non_japanese_chars('abc') == ''
    assert remove_non_japanese_chars('   spaces   between   ') == ''
    assert remove_non_japanese_chars('Привет 世界') == '世界'
    assert remove_non_japanese_chars('café 桜') == '桜'


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


def test_export_anki_deck_returns_apkg_from_notes(client):
    """POST /api/lyrics/anki/deck builds deck from notes payload."""
    payload = {
        'deckName': 'Test Deck',
        'modelName': 'Lyrics Vocabulary',
        'notes': [
            {
                'fields': {
                    'Word': '花',
                    'Sentence': '花が咲く',
                    'Word Meaning': '<div>flower</div>',
                }
            },
            {
                'fields': {
                    'Word': '桜',
                    'Sentence': '桜の花',
                    'Word Meaning': '<div>cherry tree</div>',
                }
            },
        ],
    }
    response = client.post(
        '/api/lyrics/anki/deck',
        json=payload,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 200
    assert response.content_type == 'application/octet-stream'
    assert 'attachment' in response.headers.get('Content-Disposition', '')
    assert len(response.data) > 100


def test_export_anki_deck_returns_400_when_no_notes(client):
    payload = {'deckName': 'Test', 'modelName': 'Lyrics Vocabulary', 'notes': []}
    response = client.post(
        '/api/lyrics/anki/deck',
        json=payload,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 400


def test_export_anki_deck_returns_400_when_no_deck_name(client):
    payload = {
        'modelName': 'Lyrics Vocabulary',
        'notes': [{'fields': {'Word': '花', 'Sentence': '', 'Word Meaning': 'flower'}}],
    }
    response = client.post(
        '/api/lyrics/anki/deck',
        json=payload,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 400


@patch('routes.lyrics.build_anki_notes_json')
def test_export_anki_notes_returns_json(mock_build, client):
    mock_build.return_value = {
        'deckName': 'Test - Artist',
        'modelName': 'Lyrics Vocabulary',
        'notes': [
            {
                'fields': {
                    'Word': '花',
                    'Sentence': '花が咲く',
                    'Word Meaning': '<div>flower</div>',
                }
            },
        ],
    }
    lyrics_data = {
        'trackName': 'Test',
        'artistName': 'Artist',
        'plainLyrics': '花',
    }
    response = client.post(
        '/api/lyrics/anki/notes',
        json=lyrics_data,
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['deckName'] == 'Test - Artist'
    assert data['modelName'] == 'Lyrics Vocabulary'
    assert len(data['notes']) == 1
    fields = data['notes'][0]['fields']
    assert fields['Word'] == '花'
    assert fields['Sentence'] == '花が咲く'
    assert fields['Word Meaning'] == '<div>flower</div>'


TEST_LYRICS = '''おかわりするわ 飲み終わるまでにきてね

私の何かがおかしいの
意味ないことも楽しめるの
みんなが知らない海泳いで
さよなら明日も年頃よ

耳のそば 連絡ないまま 光らないな
いつまでも おりこうさんだね バカバカしいな'''


def test_get_sentence_for_word_finds_lines_with_surface_forms():
    """Sentence extraction finds lines using surface forms (handles conjugation)."""
    # 飲む has surface 飲み in "飲み終わるまでにきてね"
    assert (
        get_sentence_for_word('飲む', TEST_LYRICS, ['飲み'])
        == 'おかわりするわ <b>飲み</b>終わるまでにきてね'
    )
    # おかしい has surface おかしい in "私の何かがおかしいの"
    assert (
        get_sentence_for_word('おかしい', TEST_LYRICS, ['おかしい'])
        == '私の何かが<b>おかしい</b>の'
    )
    # 泳ぐ has surface 泳いで in "みんなが知らない海泳いで"
    assert (
        get_sentence_for_word('泳ぐ', TEST_LYRICS, ['泳いで'])
        == 'みんなが知らない海<b>泳いで</b>'
    )
    # 光る has surface 光らない in "光らないな"
    assert (
        get_sentence_for_word('光る', TEST_LYRICS, ['光らない'])
        == '耳のそば 連絡ないまま <b>光らない</b>な'
    )


def test_get_sentence_for_word_truncates_long_paragraphs():
    """Long paragraphs are truncated to a window around the word."""
    long_para = 'あ' * 50 + '花' + 'い' * 50  # 101 chars, 花 at position 50
    result = get_sentence_for_word('花', long_para)
    assert '花' in result
    assert '<b>花</b>' in result
    assert len(result) <= 115  # 100 + ellipsis + <b></b> tags
    assert result.startswith('…') or result.endswith('…')


@patch('anki_deck.tokenize_lyrics')
def test_build_anki_notes_json_includes_sentences_when_tokenizer_returns_surface_forms(
    mock_tokenize, client
):
    """Full API flow: notes include Sentence when tokenizer provides surface forms."""

    def _mock_entry(word, gloss):
        return {
            'kanji': [{'text': word}],
            'senses': [{'SenseGloss': [{'text': gloss, 'lang': 'eng'}]}],
        }

    mock_tokenize.return_value = [
        (
            '飲む',
            {'entries': [_mock_entry('飲む', 'to drink')], 'names': [], 'chars': []},
            ['飲み'],
        ),
        (
            'おかしい',
            {'entries': [_mock_entry('おかしい', 'strange')], 'names': [], 'chars': []},
            ['おかしい'],
        ),
    ]
    response = client.post(
        '/api/lyrics/anki/notes',
        json={
            'trackName': 'Test',
            'artistName': 'Artist',
            'plainLyrics': TEST_LYRICS,
        },
        headers={'Content-Type': 'application/json'},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert len(data['notes']) >= 1
    for note in data['notes']:
        fields = note['fields']
        assert 'Sentence' in fields
        assert fields['Sentence'], f"Word {fields.get('Word')} should have a sentence"


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
