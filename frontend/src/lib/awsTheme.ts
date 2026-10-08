import { applyTheme } from '@cloudscape-design/components/theming';

/**
 * The AWS console restyles Cloudscape's defaults: orange primary buttons and fully rounded (pill) buttons.
 * Applied once on the client; every Cloudscape component picks the tokens up through CSS variables.
 */
export function applyAwsTheme(): void {
  applyTheme({
    theme: {
      tokens: {
        borderRadiusButton: '20px',
        colorBackgroundButtonPrimaryDefault: '#ff9900',
        colorBackgroundButtonPrimaryHover: '#ffb34d',
        colorBackgroundButtonPrimaryActive: '#ffb34d',
        colorTextButtonPrimaryDefault: '#0f141a',
        colorTextButtonPrimaryHover: '#0f141a',
        colorTextButtonPrimaryActive: '#0f141a',
      },
    },
  });
}
