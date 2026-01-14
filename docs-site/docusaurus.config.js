// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Bagel Documentation',
  tagline: 'Privacy-First Payroll for Solana',
  favicon: 'img/favicon.svg',

  // Set the production url of your site here
  url: 'https://docs.bagel.finance',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'ConejoCapital',
  projectName: 'Bagel',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/ConejoCapital/Bagel/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Social card image (optional - add bagel-social-card.png for social previews)
      // image: 'img/bagel-social-card.png',

      navbar: {
        title: 'Bagel',
        logo: {
          alt: 'Bagel Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/ConejoCapital/Bagel',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet',
            label: 'Explorer',
            position: 'right',
          },
        ],
      },

      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/getting-started',
              },
              {
                label: 'Architecture',
                to: '/architecture/overview',
              },
              {
                label: 'API Reference',
                to: '/reference/program',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/ConejoCapital/Bagel',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/ConejoCapital',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'Solana Explorer',
                href: 'https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet',
              },
              {
                label: 'Privacy Hackathon',
                href: 'https://solana.com/privacyhack',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} ConejoCapital. Built with Docusaurus.`,
      },

      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['rust', 'toml', 'bash', 'typescript'],
      },

      // Announcement banner
      announcementBar: {
        id: 'hackathon',
        content:
          'Built for <a target="_blank" rel="noopener noreferrer" href="https://solana.com/privacyhack">Solana Privacy Hackathon 2026</a>. Currently on Devnet.',
        backgroundColor: '#FF6B35',
        textColor: '#FFFFFF',
        isCloseable: true,
      },

      // Table of Contents config
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
    }),

  // Themes
  themes: ['@docusaurus/theme-mermaid'],

  // Markdown config
  markdown: {
    mermaid: true,
  },

  // Plugins
  plugins: [
    // Search plugin
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],
};

module.exports = config;
