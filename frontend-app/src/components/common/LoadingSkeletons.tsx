import { Box, List, ListItem, Skeleton } from '@mui/material'

const SKELETON_CARD_COUNT = 6

const VERSE_LINE_WIDTHS = ['50%', '55%', '60%', '52%']

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
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
    <List
      dense
      sx={{
        maxHeight: 300,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
      }}
    >
      {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
        <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
          <Skeleton
            variant="rounded"
            width="100%"
            height={28}
            sx={{ borderRadius: 0.5 }}
          />
        </ListItem>
      ))}
    </List>
  </>
)
