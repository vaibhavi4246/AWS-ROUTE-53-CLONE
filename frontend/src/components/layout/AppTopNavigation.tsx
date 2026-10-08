'use client';

import React, { useState } from 'react';
import Autosuggest, { type AutosuggestProps } from '@cloudscape-design/components/autosuggest';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useFollow } from '@/hooks/useFollow';
import { AWS_LOGO_SRC } from '@/lib/awsLogo';
import { flatNavigation } from '@/lib/navigation';
import { AppsGridIcon, Route53Tile, cloudShellIcon } from './TopBarIcons';

interface AppTopNavigationProps {
  searchRef: React.RefObject<AutosuggestProps.Ref | null>;
  onShowShortcuts: () => void;
  onResetDemo: () => void;
}

const SEARCH_OPTIONS = flatNavigation.map((leaf) => ({ value: leaf.label, description: leaf.href }));

/**
 * The console's header: wordmark, service tile, apps grid, search, then CloudShell, notifications, help,
 * region and a two-line account menu. Built from Cloudscape controls inside its top-navigation theme
 * context, which is what gives the white-on-navy button styling.
 */
export default function AppTopNavigation({ searchRef, onShowShortcuts, onResetDemo }: AppTopNavigationProps) {
  const { user, theme, toggleTheme, logout, addToast } = useApp();
  const follow = useFollow();
  const [search, setSearch] = useState('');

  if (!user) return null;

  return (
    <header className="top-bar awsui-context-top-navigation">
      <Link href="/dashboard" className="top-bar-logo" aria-label="AWS Route 53 home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AWS_LOGO_SRC} alt="AWS" width={48} height={32} />
      </Link>
      <span className="top-bar-divider" aria-hidden />
      <Link href="/dashboard" className="top-bar-service" aria-label="Route 53 dashboard" title="Route 53">
        <Route53Tile size={28} />
      </Link>
      <span className="top-bar-divider" aria-hidden />
      <button
        type="button"
        className="top-bar-grid"
        aria-label="Services"
        title="Services"
        onClick={() => addToast('The services menu is not available in this clone.', 'info')}
      >
        <AppsGridIcon />
      </button>

      <div className="top-bar-search">
        <Autosuggest
          ref={searchRef}
          value={search}
          onChange={({ detail }) => setSearch(detail.value)}
          options={SEARCH_OPTIONS}
          placeholder="Search"
          ariaLabel="Search services and features"
          empty="No matches"
          enteredTextLabel={(value) => `Search for "${value}"`}
          onSelect={({ detail }) => {
            const leaf = flatNavigation.find((item) => item.label === detail.value);
            if (leaf) follow({ detail: { href: leaf.href }, preventDefault: () => undefined });
            setSearch('');
          }}
        />
        <kbd className="top-bar-hint" aria-hidden>
          [Alt+S]
        </kbd>
      </div>

      <div className="top-bar-right">
        <Button variant="icon" iconSvg={cloudShellIcon} ariaLabel="CloudShell" onClick={() => addToast('CloudShell is not available in this clone.', 'info')} />
        <Button variant="icon" iconName="notification" ariaLabel="Notifications" onClick={() => addToast('You have no new notifications.', 'info')} />
        <Button variant="icon" iconName="status-info" ariaLabel="Keyboard shortcuts" onClick={onShowShortcuts} />

        <ButtonDropdown
          items={[{ id: 'global', text: 'Global', description: 'Route 53 is a global service, so there is no region to choose.', itemType: 'checkbox', checked: true }]}
          onItemClick={() => undefined}
          ariaLabel="Region"
        >
          Global
        </ButtonDropdown>

        <ButtonDropdown
          items={[
            { id: 'account', text: `Account ID: ${user.aws_account_id}`, disabled: true },
            { id: 'theme', text: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode' },
            ...(user.is_demo ? [{ id: 'reset-demo', text: 'Reset demo data' }] : []),
            { id: 'signout', text: 'Sign out' },
          ]}
          onItemClick={({ detail }) => {
            if (detail.id === 'theme') toggleTheme();
            if (detail.id === 'reset-demo') onResetDemo();
            if (detail.id === 'signout') void logout();
          }}
          ariaLabel="Account menu"
        >
          <span className="top-bar-account">
            <b>{user.is_demo ? 'Demo Account' : 'Admin Account'}</b>
            <span>{user.username}</span>
          </span>
        </ButtonDropdown>
      </div>
    </header>
  );
}
