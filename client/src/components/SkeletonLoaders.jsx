import { Paper, Stack, Box, SimpleGrid, Skeleton } from '@mantine/core';

export function CalendarSkeleton() {
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const skeletonDays = Array.from({ length: 42 }, (_, i) => i);

  return (
    <Box>
      <Stack gap="xs">
        <SimpleGrid cols={7} spacing={0}>
          {WEEKDAYS.map((day) => (
            <Box key={day} p="xs" ta="center">
              <Skeleton height={16} width={30} mx="auto" />
            </Box>
          ))}
        </SimpleGrid>
        <SimpleGrid cols={7} spacing={2}>
          {skeletonDays.map((i) => (
            <Paper key={i} p="xs" h={160} withBorder className="skeleton-pulse">
              <Stack gap={4}>
                <Skeleton height={14} width={20} />
                <Skeleton height={24} mt={8} />
                <Skeleton height={24} />
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

export function PendingSidebarSkeleton() {
  const skeletonItems = Array.from({ length: 3 }, (_, i) => i);

  return (
    <Stack>
      <Skeleton height={24} width={150} mb="md" />
      <Stack gap="sm">
        {skeletonItems.map((i) => (
          <Paper key={i} p="sm" withBorder className="skeleton-pulse">
            <Stack gap="xs">
              <Skeleton height={16} />
              <Skeleton height={16} width="80%" />
              <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Skeleton height={20} width={60} />
                <Skeleton height={20} width={50} />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

export function ClassListSkeleton() {
  const skeletonClasses = Array.from({ length: 4 }, (_, i) => i);

  return (
    <Stack gap="xs">
      {skeletonClasses.map((i) => (
        <Paper key={i} p="sm" withBorder className="skeleton-pulse">
          <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton height={16} width={16} />
            <Skeleton height={16} style={{ flex: 1 }} />
            <Skeleton height={24} width={24} circle />
            <Skeleton height={24} width={24} circle />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}
