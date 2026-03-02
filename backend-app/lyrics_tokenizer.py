import html
import logging
import re
import unicodedata

from jamdict import Jamdict
from sudachipy import Dictionary, SplitMode

from config import JAMDICT_DB_PATH
from decorators import log_call

logger = logging.getLogger(__name__)


class JamdictNotAvailableError(Exception):
    """Raised when jamdict database cannot be loaded."""


_tokenizer = None
_jamdict = None


def _get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = Dictionary().create()
    return _tokenizer


def _get_jamdict():
    global _jamdict
    if _jamdict is None:
        try:
            _jamdict = Jamdict(db_file=JAMDICT_DB_PATH)
        except Exception as e:
            logger.error("_get_jamdict: failed to load err=%s", e)
            _jamdict = False  # Mark as failed so we don't retry
    return _jamdict if _jamdict else None


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
        'entries': [e.to_dict() for e in result.entries],
        'names': [n.to_dict() for n in result.names] if result.names else [],
        'found': len(result.entries) > 0 or (result.names and len(result.names) > 0),
    }
    if result.chars:
        data['chars'] = [
            {'literal': getattr(c, 'literal', str(c)), 'meanings': c.meanings()}
            for c in result.chars
        ]
    else:
        data['chars'] = []
    return data


@log_call
def extract_lyrics_text(lyrics_data: dict) -> str:
    """Extract plain text from lyrics data (plainLyrics or syncedLyrics)."""
    if not isinstance(lyrics_data, dict):
        return ''
    plain = (
        lyrics_data.get('plainLyrics')
        or lyrics_data.get('plain')
        or lyrics_data.get('lyrics')
        or ''
    )

    if isinstance(plain, str) and plain.strip():
        return plain
    synced = lyrics_data.get('syncedLyrics') or lyrics_data.get('synced')

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


def remove_english_letters(text: str) -> str:
    """Remove all ASCII letters (a-z, A-Z) from text and normalize whitespace."""
    text = re.sub(r'[a-zA-Z]', '', text)
    
    return re.sub(r'\s+', ' ', text).strip()


MAX_SENTENCE_LEN = 100


def _truncate_around_match(line: str, match: str) -> str:
    """Return a substring of line centered on match, max MAX_SENTENCE_LEN chars."""
    if len(line) <= MAX_SENTENCE_LEN:
        return line

    idx = line.find(match)
    match_pos = max(0, idx)

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
    Uses surface_forms for matching when provided (handles Japanese verb conjugation).
    If the line exceeds MAX_SENTENCE_LEN, returns a truncated substring centered on the word.
    The matched word is wrapped in <b> tags for bold display in Anki."""
    if not lyrics_text:
        return ''
    # Prefer newline-separated lines; fall back to space-separated phrases (cleaned text)
    raw_lines = lyrics_text.splitlines()
    lines = [line.strip() for line in raw_lines if line.strip()]
    if not lines:
        lines = [p.strip() for p in lyrics_text.split() if p.strip()]
    if not lines:
        lines = [lyrics_text.strip()] if lyrics_text.strip() else []

    candidates = [word] if word else []
    if surface_forms:
        candidates = list(dict.fromkeys(surface_forms + candidates))
    for line in lines:
        for c in candidates:
            if c and c in line:
                truncated = _truncate_around_match(line, c)
                escaped = html.escape(truncated)
                escaped_match = html.escape(c)
                return escaped.replace(escaped_match, f'<b>{escaped_match}</b>', 1)
    return ''


def _should_keep_token(token: str) -> bool:
    """Filter out single hiragana, single katakana, and punctuation."""
    if not token:
        return False
        
    # Filter tokens that are only punctuation
    if all(unicodedata.category(c).startswith('P') for c in token):
        return False

    if len(token) > 1:
        return True

    char = token[0]
    # Single hiragana (U+3040–U+309F)
    if '\u3040' <= char <= '\u309F':
        return False

    # Single katakana (U+30A0–U+30FF)
    if '\u30A0' <= char <= '\u30FF':
        return False

    # Single punctuation
    if unicodedata.category(char).startswith('P'):
        return False
    
    return True


def _tokenize_lyrics_impl(text: str) -> list[tuple[str, dict, list[str]]]:
    """Internal implementation of tokenize_lyrics."""
    if not text or not text.strip():
        return []

    text = remove_english_letters(text)

    if not text:
        return []

    tokenizer = _get_tokenizer()
    jam = _get_jamdict()
    morphemes = tokenizer.tokenize(text, SplitMode.A)
    # Build dict_form -> [surface_forms] for sentence matching (handles conjugation)
    dict_to_surfaces: dict[str, list[str]] = {}
    for m in morphemes:
        surf = m.surface().strip()
        dform = m.dictionary_form()
        if surf and _should_keep_token(surf) and _should_keep_token(dform):
            dict_to_surfaces.setdefault(dform, []).append(surf)
    unique_words = list(dict_to_surfaces.keys())

    if jam is None and unique_words:
        raise JamdictNotAvailableError(
            'Jamdict database is not available. Ensure jamdict.db is in backend-app/data/ '
            'or set JAMDICT_DB_PATH environment variable.'
        )

    if jam is None:
        return []

    tokenized = [
        (word, _lookup_word(jam, word), dict_to_surfaces[word])
        for word in unique_words
    ]
    found_count = sum(1 for _, r, _ in tokenized if r.get('found'))

    # If all lookups returned empty, jamdict may be corrupted. Retry with a fresh instance.
    if found_count == 0 and len(tokenized) > 0:
        global _jamdict
        _jamdict = None
        jam = _get_jamdict()

        if jam is not None:
            tokenized = [
                (word, _lookup_word(jam, word), dict_to_surfaces[word])
                for word in unique_words
            ]
            found_count = sum(1 for _, r, _ in tokenized if r.get('found'))
    return tokenized


@log_call
def tokenize_lyrics(text: str) -> list[tuple[str, dict, list[str]]]:
    """Tokenize lyrics and return unique (word, jamdict_result, surface_forms) tuples.
    surface_forms are used for sentence extraction (handles Japanese verb conjugation)."""
    return _tokenize_lyrics_impl(text)
