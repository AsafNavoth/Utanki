import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { flexColumnHalf } from '../../utils/commonStyles'
import { useSnackbar } from '../../contexts/snackbar/snackbarContext'
import { useReactQuery } from '../../hooks/useReactQuery'
import type { LrclibSearchResult } from '../../types/lrclib'
import { SearchBar } from './SearchBar'
import { SearchResultsList } from './SearchResultsList'
import { SearchResultsSkeleton } from '../common/LoadingSkeletons'
import { LyricsModal } from '../lyrics/LyricsModal'

type SearchViewProps = {
  hideTitle?: boolean
}

export const SearchView = ({ hideTitle = false }: SearchViewProps) => {
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
    queryKey: ['lyricsSearch', searchQuery],
    url: '/api/search',
    config: { params: { q: searchQuery } },
    enabled: !!searchQuery,
    throwOnError: (error) => {
      enqueueErrorSnackbar(error, 'Search failed')

      return false
    },
  })

  const showEmptyState = data && data.length === 0 && searchQuery && !isLoading

  const showSearchResults = data && data.length > 0

  return (
    <Box sx={flexColumnHalf}>
      {!hideTitle && <Typography variant="h6">Search</Typography>}
      <Typography variant="body2" color="text.secondary">
        Search for song lyrics with Japanese transcriptions to create Anki
        cards.
      </Typography>
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={handleSearch}
      />
      {isLoading && <SearchResultsSkeleton />}
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
