'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Link from '@cloudscape-design/components/link';
import RadioGroup from '@cloudscape-design/components/radio-group';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { useApp } from '@/context/AppContext';
import { useFollow } from '@/hooks/useFollow';
import { ApiError } from '@/lib/api/client';
import { hostedZonesApi } from '@/lib/api/resources';
import type { ZoneType } from '@/lib/api/types';

const MAX_DESCRIPTION = 256;
const REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia) us-east-1' },
  { value: 'us-west-2', label: 'US West (Oregon) us-west-2' },
  { value: 'eu-west-1', label: 'Europe (Ireland) eu-west-1' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai) ap-south-1' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) ap-southeast-1' },
];

type Errors = Partial<Record<'name' | 'description' | 'vpc_id' | 'vpc_region' | 'form', string>>;

export default function CreateHostedZonePage() {
  const router = useRouter();
  const follow = useFollow();
  const { addToast } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ZoneType>('Public');
  const [vpcRegion, setVpcRegion] = useState(REGIONS[0].value);
  const [vpcId, setVpcId] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: Errors = {};
    if (!name.trim()) found.name = 'Enter a domain name.';
    if (type === 'Private' && !vpcId.trim()) found.vpc_id = 'Enter the ID of the VPC to associate.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const zone = await hostedZonesApi.create({
        name: name.trim(),
        description: description.trim() || null,
        type,
        vpc_id: type === 'Private' ? vpcId.trim() : null,
        vpc_region: type === 'Private' ? vpcRegion : null,
      });
      addToast(`Successfully created hosted zone ${zone.name}`, 'success');
      router.push(`/hosted-zones/${zone.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldMessages;
        setErrors({
          name: fields.name,
          description: fields.description,
          vpc_id: fields.vpc_id,
          vpc_region: fields.vpc_region,
          form: Object.keys(fields).length === 0 ? error.message : undefined,
        });
      } else {
        setErrors({ form: 'Something went wrong. Try again.' });
      }
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Form
        header={
          <Header
            variant="h1"
            info={<Link variant="info">Info</Link>}
            description="A hosted zone is a container for records, and records contain information about how you want to route traffic for a specific domain, such as example.com, and its subdomains (acme.example.com, zenith.example.com). A hosted zone and the corresponding domain have the same name."
          >
            Create hosted zone
          </Header>
        }
        errorText={errors.form}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" href="/hosted-zones" onFollow={follow}>
              Cancel
            </Button>
            <Button variant="primary" formAction="submit" loading={saving}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        }
      >
        <Container
          header={
            <Header variant="h2" description="The hosted zone is used for DNS management of the domain you enter.">
              Hosted zone configuration
            </Header>
          }
        >
          <SpaceBetween size="l">
            <FormField
              label="Domain name"
              description="This is the name of the domain that you want to route traffic for."
              errorText={errors.name}
              constraintText="Valid characters: a-z, 0-9, and - (hyphen)."
            >
              <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="example.com" autoFocus />
            </FormField>

            <FormField
              label={
                <>
                  Description <i>- optional</i>
                </>
              }
              errorText={errors.description}
              constraintText={`The hosted zone is used for... ${description.length}/${MAX_DESCRIPTION}`}
            >
              <Textarea value={description} rows={3} onChange={({ detail }) => setDescription(detail.value.slice(0, MAX_DESCRIPTION))} />
            </FormField>

            <FormField label="Type" description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC.">
              <RadioGroup
                value={type}
                onChange={({ detail }) => setType(detail.value as ZoneType)}
                items={[
                  { value: 'Public', label: 'Public hosted zone', description: 'A public hosted zone determines how traffic is routed on the internet.' },
                  { value: 'Private', label: 'Private hosted zone', description: 'A private hosted zone determines how traffic is routed within an Amazon VPC.' },
                ]}
              />
            </FormField>

            {type === 'Private' && (
              <Box>
                <SpaceBetween size="l">
                  <Header variant="h3">VPCs to associate with the hosted zone</Header>
                  <FormField label="Region" errorText={errors.vpc_region}>
                    <Select
                      selectedOption={REGIONS.find((region) => region.value === vpcRegion) ?? null}
                      options={REGIONS}
                      onChange={({ detail }) => setVpcRegion(detail.selectedOption.value ?? REGIONS[0].value)}
                    />
                  </FormField>
                  <FormField label="VPC ID" errorText={errors.vpc_id}>
                    <Input value={vpcId} onChange={({ detail }) => setVpcId(detail.value)} placeholder="vpc-0a1b2c3d4e5f67890" />
                  </FormField>
                </SpaceBetween>
              </Box>
            )}
          </SpaceBetween>
        </Container>
      </Form>
    </form>
  );
}
