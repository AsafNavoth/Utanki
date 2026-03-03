import {
  Box,
  List,
  ListItem,
  ListItemButton,
  Skeleton,
  styled,
} from '@mui/material'
import {
  getBorderedListStyle,
  getFlexColumnGapPlainStyle,
  scrollableListContainer,
} from '../../utils/commonStyles'

const SKELETON_CARD_COUNT = 6

const VERSE_LINE_WIDTHS = ['50%', '55%', '60%', '52%']

const NotesListSkeleton = styled(List)(({ theme }) => ({
  ...getBorderedListStyle({ theme, overflow: 'hidden', padding: 1 }),
}))

const SearchResultsListRoot = styled(List)(scrollableListContainer)

const VerseSkeleton = ({ verseIndex }: { verseIndex: number }) => (
  <>
    {VERSE_LINE_WIDTHS.map((width, i) => (
      <Skeleton
        key={`${verseIndex}-${i}`}
        variant="text"
        width={width}
        height={24}
        animation="wave"
      />
    ))}
  </>
)

export const LyricsSkeleton = () => (
  <Box sx={getFlexColumnGapPlainStyle({ gap: 1 })}>
    <VerseSkeleton verseIndex={0} />
    <Box sx={{ height: 8 }} />
    <VerseSkeleton verseIndex={1} />
    <Box sx={{ height: 8 }} />
    <VerseSkeleton verseIndex={2} />
  </Box>
)

export const NotesChecklistSkeleton = () => (
  <>
    <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
    <NotesListSkeleton dense>
      {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
        <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
          <Skeleton
            variant="rounded"
            width="100%"
            height={28}
            sx={{ borderRadius: 0.5 }}
          />
        </ListItem>
      ))}
    </NotesListSkeleton>
  </>
)

const SEARCH_RESULT_SKELETON_COUNT = 5

export const SearchResultsSkeleton = () => (
  <SearchResultsListRoot>
    {Array.from({ length: SEARCH_RESULT_SKELETON_COUNT }).map((_, index) => (
      <ListItem key={index} divider disablePadding>
        <ListItemButton disabled sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Skeleton variant="text" width="80%" height={24} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
        </ListItemButton>
      </ListItem>
    ))}
  </SearchResultsListRoot>
)
