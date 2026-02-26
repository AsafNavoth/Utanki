import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useReactQuery } from '../hooks/useReactQuery'
import type { LrclibSearchResult } from '../types/lrclib'
import { SearchBar } from './SearchBar'
import { SearchResultsList } from './SearchResultsList'
import { SearchErrorMessage } from './SearchErrorMessage'
import { LoadingReplacer } from './LoadingReplacer'
import { LyricsModal } from './LyricsModal'

export const SearchView = () => {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<LrclibSearchResult | null>(
    null
  )

  const lyricsModalProps = selectedTrack
    ? {
        open: true,
        lyricsId: selectedTrack.id,
        trackName: selectedTrack.trackName,
        artistName: selectedTrack.artistName,
        albumName: selectedTrack.albumName,
      }
    : {
        open: false,
        lyricsId: null as number | null,
        trackName: '',
        artistName: '',
        albumName: '',
      }

  const handleSearch = () => {
    const trimmed = searchInput.trim()
    if (trimmed) setSearchQuery(trimmed)
  }

  const { data, isLoading, error } = useReactQuery<LrclibSearchResult[]>({
    queryKey: ['lyrics', searchQuery],
    url: '/api/search',
    config: { params: { q: searchQuery } },
    enabled: !!searchQuery,
  })

  const showEmptyState = data && data.length === 0 && searchQuery && !isLoading

  const showSearchResults = data && data.length > 0

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        width: '50%',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={handleSearch}
      />
      <LoadingReplacer isLoading={isLoading} />
      <SearchErrorMessage error={error ?? null} />
      {showSearchResults && (
        <SearchResultsList
          results={data}
          onTrackClick={(track) => setSelectedTrack(track)}
        />
      )}
      <LyricsModal
        {...lyricsModalProps}
        onClose={() => setSelectedTrack(null)}
      />
      {showEmptyState && (
        <Typography color="text.secondary">No results found</Typography>
      )}
    </Box>
  )
}
