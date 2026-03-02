import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { flexColumnHalf } from '../../utils/commonStyles'
import { useSnackbar } from '../../contexts/snackbar/snackbarContext'
import { useReactQuery } from '../../hooks/useReactQuery'
import type { LrclibSearchResult } from '../../types/lrclib'
import { SearchBar } from './SearchBar'
import { SearchResultsList } from './SearchResultsList'
import { LoadingReplacer } from '../common/LoadingReplacer'
import { LyricsModal } from '../lyrics/LyricsModal'

export const SearchView = () => {
  const { enqueueErrorSnackbar } = useSnackbar()
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
        lyricsId: null,
        trackName: '',
        artistName: '',
        albumName: '',
      }

  const handleSearch = () => {
    const trimmed = searchInput.trim()
    if (trimmed) setSearchQuery(trimmed)
  }

  const { data, isLoading } = useReactQuery<LrclibSearchResult[]>({
    queryKey: ['lyrics', searchQuery],
    url: '/api/search',
    config: { params: { q: searchQuery } },
    enabled: !!searchQuery,
    throwOnError: (err) => {
      enqueueErrorSnackbar(err, 'Search failed')

      return false
    },
  })

  const showEmptyState = data && data.length === 0 && searchQuery && !isLoading

  const showSearchResults = data && data.length > 0

  return (
    <Box sx={flexColumnHalf}>
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={handleSearch}
      />
      <LoadingReplacer isLoading={isLoading} />
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
