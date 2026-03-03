import type { Theme } from '@mui/material/styles'

export const getOnHoverStyle = ({ theme }: { theme: Theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
})

export const flexCenter = {
  display: 'flex',
  justifyContent: 'center',
}

const flexColumn = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

/** Flex row: center-aligned, with gap. */
export const getFlexRowCenterStyle = ({
  theme,
  gap = 2,
}: {
  theme: Theme
  gap?: number
}) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(gap),
})

/** Flex row: center-aligned, wrap, with gap. */
export const getFlexRowWrapStyle = ({
  theme,
  gap = 2,
}: {
  theme: Theme
  gap?: number
}) => ({
  ...getFlexRowCenterStyle({ theme, gap }),
  flexWrap: 'wrap',
})

/** Flex column with gap. */
export const getFlexColumnGapStyle = ({
  theme,
  gap = 2,
}: {
  theme: Theme
  gap?: number
}) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(gap),
})

/** Bordered scrollable list container. */
export const getBorderedListStyle = ({
  theme,
  overflow = 'auto',
  padding,
}: {
  theme: Theme
  overflow?: 'auto' | 'hidden'
  padding?: number
}) => ({
  maxHeight: 300,
  overflow,
  border: 1,
  borderColor: theme.palette.divider,
  borderRadius: theme.shape.borderRadius,
  ...(padding !== undefined && { padding: theme.spacing(padding) }),
})

export const flexColumnHalf = {
  ...flexColumn,
  flex: 1,
  height: '100%',
  width: { xs: '100%', sm: '50%' },
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
}

/** Scrollable list container (flex, minHeight 0, overflow auto). Plain object for styled(). */
export const scrollableListContainer = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
}

/** Flex column with gap. Plain object for styled() when theme callback causes type issues. */
export const getFlexColumnGapPlainStyle = ({
  gap = 2,
}: { gap?: number } = {}) => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
})
