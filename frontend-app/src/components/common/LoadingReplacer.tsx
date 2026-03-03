import { Box, CircularProgress, styled } from '@mui/material'
import { flexCenter } from '../../utils/commonStyles'

const LoadingReplacerRoot = styled(Box)(({ theme }) => ({
  ...flexCenter,
  padding: theme.spacing(2),
}))

type LoadingReplacerProps = {
  isLoading: boolean
}

export const LoadingReplacer = ({ isLoading }: LoadingReplacerProps) =>
  isLoading ? (
    <LoadingReplacerRoot>
      <CircularProgress size={24} />
    </LoadingReplacerRoot>
  ) : null
