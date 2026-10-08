'use client';

import React, { useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Link from '@cloudscape-design/components/link';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import Toggle from '@cloudscape-design/components/toggle';
import { useFollow } from '@/hooks/useFollow';
import { ApiError } from '@/lib/api/client';
import type { DNSRecord, HostedZone, RecordInput, RecordType, RoutingPolicy } from '@/lib/api/types';
import { RECORD_TYPES, VALUE_HELP, relativeName } from './recordTypes';

interface RecordFormProps {
  zone: HostedZone;
  /** Present when editing. */
  initial?: DNSRecord;
  title: string;
  submitLabel: string;
  onSubmit: (input: RecordInput) => Promise<void>;
  cancelHref: string;
}

type Errors = Partial<Record<'name' | 'type' | 'value' | 'ttl' | 'alias_target' | 'weight' | 'set_id' | 'form', string>>;

const ALIAS_TYPES: RecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'PTR', 'SRV', 'CAA'];
const TYPE_OPTIONS = RECORD_TYPES.map((type) => ({ value: type.value, label: type.label }));
const ROUTING_OPTIONS = [
  { value: 'Simple', label: 'Simple routing' },
  { value: 'Weighted', label: 'Weighted' },
];

export default function RecordForm({ zone, initial, title, submitLabel, onSubmit, cancelHref }: RecordFormProps) {
  const follow = useFollow();
  const [name, setName] = useState(initial ? relativeName(initial.name, zone.name) : '');
  const [type, setType] = useState<RecordType>((initial?.type as RecordType) ?? 'A');
  const [alias, setAlias] = useState(initial?.alias ?? false);
  const [aliasTarget, setAliasTarget] = useState(initial?.alias_target ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
  const [ttl, setTtl] = useState(String(initial && !initial.alias ? initial.ttl : 300));
  const [routing, setRouting] = useState<RoutingPolicy>(initial?.routing_policy ?? 'Simple');
  const [weight, setWeight] = useState(String(initial?.weight ?? 100));
  const [setId, setSetId] = useState(initial?.set_id ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const aliasAllowed = ALIAS_TYPES.includes(type);
  const help = VALUE_HELP[type];

  const validate = (): Errors => {
    const found: Errors = {};
    if (alias) {
      if (!aliasTarget.trim()) found.alias_target = 'Enter the DNS name this record should route traffic to.';
    } else {
      if (!value.trim()) found.value = 'Enter at least one value.';
      const ttlNumber = Number(ttl);
      if (ttl.trim() === '' || !Number.isInteger(ttlNumber) || ttlNumber < 0 || ttlNumber > 2147483647) {
        found.ttl = 'TTL must be a whole number of seconds between 0 and 2147483647.';
      }
    }
    if (routing === 'Weighted') {
      const weightNumber = Number(weight);
      if (weight.trim() === '' || !Number.isInteger(weightNumber) || weightNumber < 0 || weightNumber > 255) {
        found.weight = 'Weight must be a whole number between 0 and 255.';
      }
      if (!setId.trim()) found.set_id = 'Enter a record ID that is unique among the weighted records with this name.';
    }
    return found;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        routing_policy: routing,
        ttl: alias ? 0 : Number(ttl),
        value: alias ? '' : value,
        weight: routing === 'Weighted' ? Number(weight) : null,
        set_id: routing === 'Weighted' ? setId.trim() : null,
        alias,
        alias_target: alias ? aliasTarget.trim() : null,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Conflicts (e.g. a duplicate record) have no field of their own; show them on the name.
        setErrors({ name: error.message });
      } else if (error instanceof ApiError) {
        const fields = error.fieldMessages;
        setErrors({
          name: fields.name,
          type: fields.type ?? fields.alias,
          value: fields.value,
          ttl: fields.ttl,
          alias_target: fields.alias_target,
          weight: fields.weight,
          set_id: fields.set_id,
          form: Object.keys(fields).length === 0 ? error.message : undefined,
        });
      } else {
        setErrors({ form: 'Something went wrong. Try again.' });
      }
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Form
        header={
          <Header variant="h1" info={<Link variant="info">Info</Link>} description={`Records in ${zone.name}`}>
            {title}
          </Header>
        }
        errorText={errors.form}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" href={cancelHref} onFollow={follow}>
              Cancel
            </Button>
            <Button variant="primary" formAction="submit" loading={saving}>
              {submitLabel}
            </Button>
          </SpaceBetween>
        }
      >
        <Container header={<Header variant="h2">Record details</Header>}>
          <SpaceBetween size="l">
            <FormField
              label={
                <>
                  Record name <i>- optional</i>
                </>
              }
              errorText={errors.name}
              constraintText="Keep blank to create a record for the root domain. Use * for a wildcard."
            >
              <SpaceBetween direction="horizontal" size="xs">
                <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="www" />
                <Box padding={{ top: 'xxs' }} color="text-body-secondary">
                  .{zone.name.replace(/\.$/, '')}
                </Box>
              </SpaceBetween>
            </FormField>

            <FormField label="Record type" errorText={errors.type} description="Choose what kind of value this record holds.">
              <Select
                selectedOption={TYPE_OPTIONS.find((option) => option.value === type) ?? null}
                options={TYPE_OPTIONS}
                onChange={({ detail }) => {
                  const next = detail.selectedOption.value as RecordType;
                  setType(next);
                  if (!ALIAS_TYPES.includes(next)) setAlias(false);
                }}
              />
            </FormField>

            {aliasAllowed && (
              <FormField description="Route traffic to an AWS resource, such as a CloudFront distribution or load balancer, instead of entering values.">
                <Toggle checked={alias} onChange={({ detail }) => setAlias(detail.checked)}>
                  Alias
                </Toggle>
              </FormField>
            )}

            {alias ? (
              <FormField
                label="Route traffic to"
                errorText={errors.alias_target}
                constraintText="Enter the DNS name of the AWS resource, for example d111111abcdef8.cloudfront.net."
              >
                <Input value={aliasTarget} onChange={({ detail }) => setAliasTarget(detail.value)} placeholder="d111111abcdef8.cloudfront.net" />
              </FormField>
            ) : (
              <SpaceBetween size="l">
                <FormField label="Value" errorText={errors.value} constraintText={help.hint}>
                  <Textarea value={value} rows={5} onChange={({ detail }) => setValue(detail.value)} placeholder={help.placeholder} spellcheck={false} />
                </FormField>
                <FormField label="TTL (seconds)" errorText={errors.ttl} constraintText="Recommended values: 60 to 172800 (two days).">
                  <Input type="number" inputMode="numeric" value={ttl} onChange={({ detail }) => setTtl(detail.value)} />
                </FormField>
              </SpaceBetween>
            )}

            <FormField label="Routing policy" description="Weighted routing splits traffic between records that share a name and type.">
              <Select
                selectedOption={ROUTING_OPTIONS.find((option) => option.value === routing) ?? null}
                options={ROUTING_OPTIONS}
                onChange={({ detail }) => setRouting(detail.selectedOption.value as RoutingPolicy)}
              />
            </FormField>

            {routing === 'Weighted' && (
              <SpaceBetween size="l">
                <Alert type="info">Records with the same name and type are chosen in proportion to their weights.</Alert>
                <FormField label="Weight" errorText={errors.weight} constraintText="Enter a number between 0 and 255.">
                  <Input type="number" inputMode="numeric" value={weight} onChange={({ detail }) => setWeight(detail.value)} />
                </FormField>
                <FormField
                  label="Record ID"
                  errorText={errors.set_id}
                  constraintText="A unique identifier that distinguishes this record from other weighted records with the same name and type."
                >
                  <Input value={setId} onChange={({ detail }) => setSetId(detail.value)} placeholder="primary" />
                </FormField>
              </SpaceBetween>
            )}
          </SpaceBetween>
        </Container>
      </Form>
    </form>
  );
}
