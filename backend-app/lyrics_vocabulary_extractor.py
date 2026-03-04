import html
import logging
import re
import threading
import unicodedata

from jamdict import Jamdict
from sudachipy import Dictionary, SplitMode

from config import JAMDICT_DB_PATH
from decorators import log_call

logger = logging.getLogger(__name__)


class JamdictNotAvailableError(Exception):
    """Raised when jamdict database cannot be loaded."""


# Module-level cache for the Sudachi tokenizer.
# _get_tokenizer() creates it on first call and stores it here for reuse.
_tokenizer = None

# Thread-local storage for Jamdict. Jamdict uses puchikarui, which uses SQLite.
# SQLite connections must only be used in the thread that created them. Flask runs
# each request in its own thread, so sharing a single Jamdict instance across
# requests causes "SQLite objects created in a thread can only be used in that same
# thread" errors when exporting multiple songs in sequence.
_jamdict_local = threading.local()


def _get_tokenizer():
    """Return the Sudachi tokenizer instance, creating it lazily on first use."""
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = Dictionary().create()
    return _tokenizer


def _get_jamdict():
    """Return thread-local Jamdict instance, creating it lazily. None if DB unavailable."""
    jam = getattr(_jamdict_local, 'jam', None)
    failed = getattr(_jamdict_local, 'failed', False)
    if jam is not None:
        return jam
    if failed:
        return None
    try:
        jam = Jamdict(db_file=JAMDICT_DB_PATH)
        _jamdict_local.jam = jam
        return jam
    except Exception as e:
        logger.error("_get_jamdict: failed to load err=%s", e)
        _jamdict_local.failed = True
        return None


def _empty_lookup_result() -> dict:
    """Return empty jamdict result for fallback when lookup fails."""
    return {'entries': [], 'names': [], 'chars': [], 'found': False}


def _lookup_word(jam, word: str) -> dict:
    """Look up a word in jamdict, returning empty result on failure."""
    try:
        result = jam.lookup(word)
        return _lookup_result_to_dict(result)
    except Exception:
        return _empty_lookup_result()


def _lookup_result_to_dict(result) -> dict:
    """Convert jamdict LookupResult to a JSON-serializable dict."""
    data = {
        'entries': [entry.to_dict() for entry in result.entries],
        'names': [name.to_dict() for name in result.names] if result.names else [],
        'found': len(result.entries) > 0 or (result.names and len(result.names) > 0),
    }
    if result.chars:
        data['chars'] = [
            {
                'literal': getattr(char_entry, 'literal', str(char_entry)),
                'meanings': char_entry.meanings(),
            }
            for char_entry in result.chars
        ]
    else:
        data['chars'] = []
    return data


@log_call
def extract_lyrics_text(lyrics_data: dict) -> str:
    """Extract plain text from lyrics data (plainLyrics or syncedLyrics)."""
    if not isinstance(lyrics_data, dict):
        return ''
    plain = lyrics_data.get('plainLyrics')

    if isinstance(plain, str) and plain.strip():
        return plain
    synced = lyrics_data.get('syncedLyrics')

    if isinstance(synced, list):
        # Array format: [{text: "...", startTime: 123}, ...]
        lines = [
            item.get('text', '') if isinstance(item, dict) else str(item)
            for item in synced
        ]
        return '\n'.join(line.strip() for line in lines if line.strip())

    if not isinstance(synced, str):
        return ''

    return re.sub(r'\[\d{1,2}:\d{2}\.\d{2}\]\s*', '', synced)


# Unicode ranges for Japanese: Hiragana, Katakana, Kanji (CJK), CJK punctuation, whitespace
_JAPANESE_CHAR_PATTERN = re.compile(
    r'[\u3040-\u309F'  # Hiragana
    r'\u30A0-\u30FF'  # Katakana
    r'\u4E00-\u9FFF'  # CJK Unified Ideographs
    r'\u3400-\u4DBF'  # CJK Unified Ideographs Extension A
    r'\u3000-\u303F'  # CJK Symbols and Punctuation (、。etc.)
    r'\s]'  # Whitespace
)


def remove_non_japanese_chars(text: str) -> str:
    """Remove all non-Japanese characters and normalize whitespace.
    Keeps Hiragana, Katakana, Kanji, CJK punctuation, and whitespace."""
    cleaned = ''.join(char for char in text if _JAPANESE_CHAR_PATTERN.match(char))
    return re.sub(r'\s+', ' ', cleaned).strip()


MAX_SENTENCE_LEN = 100


def _truncate_around_match(line: str, match: str) -> str:
    """Return a substring of line centered on match, max MAX_SENTENCE_LEN chars."""
    if len(line) <= MAX_SENTENCE_LEN:
        return line

    index = line.find(match)
    match_pos = max(0, index)

    start = max(0, min(match_pos - MAX_SENTENCE_LEN // 2, len(line) - MAX_SENTENCE_LEN))
    end = start + MAX_SENTENCE_LEN

    excerpt = line[start:end]

    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(line) else ""

    return f"{prefix}{excerpt}{suffix}"


def get_sentence_for_word(
    word: str, lyrics_text: str, surface_forms: list[str] | None = None
) -> str:
    """Return the first line/phrase from lyrics_text that contains the word.
    Uses surface_forms for matching when provided.If the line exceeds MAX_SENTENCE_LEN,
    returns a truncated substring centered on the word. The matched word is
    wrapped in <b> tags for bold display in Anki."""
    if not lyrics_text:
        return ''
    # Prefer newline-separated lines; fall back to space-separated phrases (cleaned text)
    raw_lines = lyrics_text.splitlines()
    lines = [line.strip() for line in raw_lines if line.strip()]
    if not lines:
        lines = [phrase.strip() for phrase in lyrics_text.split() if phrase.strip()]
    if not lines:
        lines = [lyrics_text.strip()] if lyrics_text.strip() else []

    candidates = [word] if word else []
    if surface_forms:
        candidates = list(dict.fromkeys(surface_forms + candidates))
    for line in lines:
        for candidate in candidates:
            if candidate and candidate in line:
                truncated = _truncate_around_match(line, candidate)
                escaped = html.escape(truncated)
                escaped_match = html.escape(candidate)
                return escaped.replace(escaped_match, f'<b>{escaped_match}</b>', 1)
    return ''


def _contains_kanji(text: str) -> bool:
    """Return True if string contains any CJK ideograph (kanji)."""
    return any('\u4e00' <= char <= '\u9fff' for char in text)


def _should_keep_token(token: str) -> bool:
    """Filter out single hiragana, single katakana, and punctuation."""
    if not token:
        return False

    if len(token) > 1:
        # Multi-char tokens: keep unless all punctuation
        if all(unicodedata.category(char).startswith('P') for char in token):
            return False
        return True

    char = token[0]
    # Single hiragana (U+3040–U+309F)
    if '\u3040' <= char <= '\u309f':
        return False

    # Single katakana (U+30A0–U+30FF)
    if '\u30a0' <= char <= '\u30ff':
        return False

    # Single punctuation
    if unicodedata.category(char).startswith('P'):
        return False

    return True


def _lookup_words_in_jamdict(
    jam, unique_words: list[str], dict_to_surfaces: dict
) -> list:
    """Return list of (word, lookup_result, surface_forms) for each word."""
    return [
        (word, _lookup_word(jam, word), dict_to_surfaces[word]) for word in unique_words
    ]


def _count_successful_jamdict_lookups(vocabulary_lookups: list) -> int:
    """Return number of vocabulary lookups with a successful jamdict result."""
    return sum(
        1
        for _word, lookup_result, _surfaces in vocabulary_lookups
        if lookup_result.get('found')
    )


def _extract_vocabulary_from_lyrics_impl(
    text: str,
) -> list[tuple[str, dict, list[str]]]:
    """Internal implementation of extract_vocabulary_from_lyrics."""
    if not text or not text.strip():
        return []

    text = remove_non_japanese_chars(text)

    if not text:
        return []

    tokenizer = _get_tokenizer()
    jam = _get_jamdict()
    morphemes = tokenizer.tokenize(text, SplitMode.A)
    # Build dict_form -> [surface_forms] for sentence matching (handles conjugation)
    dict_to_surfaces: dict[str, list[str]] = {}
    for morpheme in morphemes:
        surface_form = morpheme.surface().strip()
        # normalized_form for kanji words; dictionary_form for hiragana-only to avoid adding
        # kanji that wasn't in the text.
        surface_has_kanji = _contains_kanji(surface_form)
        dict_form = (
            morpheme.normalized_form()
            if surface_has_kanji
            else morpheme.dictionary_form()
        )
        if (
            surface_form
            and _should_keep_token(surface_form)
            and _should_keep_token(dict_form)
        ):
            dict_to_surfaces.setdefault(dict_form, []).append(surface_form)
    unique_words = list(dict_to_surfaces.keys())

    if jam is None and unique_words:
        raise JamdictNotAvailableError(
            'Jamdict database is not available. Ensure jamdict.db is in /data/ '
            'or set JAMDICT_DB_PATH environment variable.'
        )

    if jam is None:
        return []

    vocabulary_lookups = _lookup_words_in_jamdict(jam, unique_words, dict_to_surfaces)
    found_count = _count_successful_jamdict_lookups(vocabulary_lookups)

    # If all lookups returned empty, jamdict may be corrupted. Retry with a fresh instance.
    if found_count == 0 and len(vocabulary_lookups) > 0:
        for attr in ('jam', 'failed'):
            if hasattr(_jamdict_local, attr):
                delattr(_jamdict_local, attr)
        jam = _get_jamdict()

        if jam is not None:
            vocabulary_lookups = _lookup_words_in_jamdict(
                jam, unique_words, dict_to_surfaces
            )
            found_count = _count_successful_jamdict_lookups(vocabulary_lookups)
    return vocabulary_lookups


@log_call
def extract_vocabulary_from_lyrics(text: str) -> list[tuple[str, dict, list[str]]]:
    """Extract vocabulary from lyrics: tokenize, lookup in jamdict, return (word, jamdict_result, surface_forms).
    surface_forms are used for sentence extraction (handles Japanese verb conjugation).
    """
    return _extract_vocabulary_from_lyrics_impl(text)
