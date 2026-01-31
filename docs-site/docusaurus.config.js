// @ts-check
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Bagel Protocol',
  tagline: 'Privacy-First Payroll Infrastructure on Solana',
  favicon: 'img/favicon.ico',

  url: 'https://bagel.finance',
  baseUrl: '/',

  organizationName: 'bagel-protocol',
  projectName: 'bagel-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/bagel-protocol/bagel/tree/main/docs-site/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    require.resolve('@easyops-cn/docusaurus-search-local'),
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/bagel-social-card.jpg',
      navbar: {
        title: 'Bagel Protocol',
        logo: {
          alt: 'Bagel Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/bagel-protocol/bagel',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/intro',
              },
              {
                label: 'Architecture',
                to: '/docs/architecture/overview',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/bagel',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/bagelprotocol',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/bagel-protocol/bagel',
              },
            ],
          },
        ],
        copyright: `Copyright ${new Date().getFullYear()} Bagel Protocol. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['rust', 'typescript', 'bash', 'json'],
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'dark' },
      },
    }),
};

module.exports = config;
