'use client';

import React, { useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useApp } from '@/context/AppContext';
import { useFollow } from '@/hooks/useFollow';

const CARDS = [
  {
    title: 'DNS management',
    text: 'A hosted zone tells Route 53 how to respond to DNS queries for a domain such as example.com.',
    action: { label: 'Create hosted zone', href: '/hosted-zones/create' },
  },
  {
    title: 'Availability monitoring',
    text: 'Health checks monitor your applications and web resources, and direct DNS queries to healthy resources.',
    action: { label: 'Create health check', href: '/health-checks' },
  },
  {
    title: 'Traffic management',
    text: 'A visual tool that lets you easily create policies for multiple endpoints in complex configurations.',
    action: { label: 'Create policy', href: '/traffic-policies' },
  },
  {
    title: 'Domain registration',
    text: 'Register and manage domain names for your applications.',
    action: { label: 'Registered domains', href: '/registered-domains' },
  },
];

export default function DashboardPage() {
  const follow = useFollow();
  const { addToast } = useApp();
  const [domain, setDomain] = useState('');

  return (
    <ContentLayout header={<Header variant="h1" info={<Link variant="info">Info</Link>}>Route 53 Dashboard</Header>}>
      <SpaceBetween size="l">
        <Container>
          <ColumnLayout columns={4}>
            {CARDS.map((card) => (
              <Box key={card.title} textAlign="center">
                <SpaceBetween size="s">
                  <Box variant="h2">{card.title}</Box>
                  <Box color="text-body-secondary">{card.text}</Box>
                  <Button href={card.action.href} onFollow={follow}>
                    {card.action.label}
                  </Button>
                </SpaceBetween>
              </Box>
            ))}
          </ColumnLayout>
        </Container>

        <Container header={<Header variant="h2">Register domain</Header>}>
          <SpaceBetween size="s">
            <Box>Find and register an available domain, or transfer your existing domains to Route 53.</Box>
            <FormField constraintText="Each label (each part between dots) can be up to 63 characters long and must start with a-z or 0-9. Maximum length: 255 characters, including dots. Valid characters: a-z, 0-9, and - (hyphen).">
              <Input value={domain} placeholder="Enter a domain name" onChange={({ detail }) => setDomain(detail.value)} />
            </FormField>
            <Button onClick={() => addToast('Domain registration is not available in this clone.', 'info')}>Check</Button>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
