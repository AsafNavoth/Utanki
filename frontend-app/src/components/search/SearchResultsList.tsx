import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  styled,
} from '@mui/material'
import type { LrclibSearchResult } from '../../types/lrclib'
import {
  getOnHoverStyle,
  scrollableListContainer,
} from '../../utils/commonStyles'

const SearchResultsListRoot = styled(List)(scrollableListContainer)

type SearchResultsListProps = {
  results: LrclibSearchResult[]
  onTrackClick: (track: LrclibSearchResult) => void
}

export const SearchResultsList = ({
  results,
  onTrackClick,
}: SearchResultsListProps) => (
  <SearchResultsListRoot>
    {results.map((track) => (
      <ListItem key={track.id} divider disablePadding>
        <ListItemButton
          onClick={() => onTrackClick(track)}
          sx={(theme) => ({ ...getOnHoverStyle({ theme }) })}
        >
          <ListItemText
            primary={track.trackName}
            secondary={`${track.artistName} • ${track.albumName}`}
          />
        </ListItemButton>
      </ListItem>
    ))}
  </SearchResultsListRoot>
)
