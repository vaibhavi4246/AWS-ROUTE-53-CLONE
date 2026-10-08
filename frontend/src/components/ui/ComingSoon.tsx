'use client';

import React from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { useFollow } from '@/hooks/useFollow';

/** Placeholder for the console sections that are intentionally mocked. */
export default function ComingSoon({ title }: { title: string }) {
  const follow = useFollow();
  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <Container>
        <Box textAlign="center" padding={{ vertical: 'l' }}>
          <Box variant="h2" padding={{ bottom: 'xs' }}>
            Coming soon
          </Box>
          <Box variant="p" color="text-body-secondary" padding={{ bottom: 'm' }}>
            {title} is not part of this clone yet. Hosted zones and DNS records are fully functional.
          </Box>
          <Button variant="primary" href="/hosted-zones" onFollow={follow}>
            Go to hosted zones
          </Button>
        </Box>
      </Container>
    </ContentLayout>
  );
}
